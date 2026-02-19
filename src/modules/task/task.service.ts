import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument } from './task.schema';
import { DepartmentService } from '../department/department.service';
import { UserService } from '../user/user.service';
import { TaskStatusService } from './task-status.service';
import { TaskPriorityService } from './task-priority.service';

export type TaskItem = {
  _id: string;
  title: string;
  description: string;
  departmentId: string;
  statusId: string | null;
  statusName?: string;
  statusColor?: string;
  priorityId: string | null;
  priorityName?: string;
  priorityColor?: string;
  assigneeId: string | null;
  assigneeName?: string;
  dueAt: string | null;
  order: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class TaskService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    private departmentService: DepartmentService,
    private userService: UserService,
    private taskStatusService: TaskStatusService,
    private taskPriorityService: TaskPriorityService,
  ) {}

  private toItem(doc: any): TaskItem {
    return {
      _id: String(doc._id),
      title: doc.title ?? '',
      description: doc.description ?? '',
      departmentId: String(doc.departmentId),
      statusId: doc.statusId ? String(doc.statusId) : null,
      priorityId: doc.priorityId ? String(doc.priorityId) : null,
      assigneeId: doc.assigneeId ? String(doc.assigneeId) : null,
      dueAt: doc.dueAt ? new Date(doc.dueAt).toISOString() : null,
      order: doc.order ?? 0,
      createdBy: String(doc.createdBy),
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : '',
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : '',
    };
  }

  async create(
    dto: {
      title: string;
      description?: string;
      departmentId: string;
      statusId?: string | null;
      priorityId?: string | null;
      assigneeId?: string | null;
      dueAt?: string | null;
    },
    userId: string,
  ): Promise<TaskItem> {
    const department = await this.departmentService.findById(dto.departmentId);
    if (!department) throw new NotFoundException('Department not found');
    let statusId: Types.ObjectId | null = null;
    if (dto.statusId?.trim()) {
      const block = await this.taskStatusService.findById(dto.statusId.trim());
      if (!block || block.departmentId !== dto.departmentId) {
        throw new NotFoundException('Block not found or does not belong to this department');
      }
      statusId = new Types.ObjectId(dto.statusId.trim());
    }
    let priorityId: Types.ObjectId | null = null;
    if (dto.priorityId?.trim()) {
      const prio = await this.taskPriorityService.findById(dto.priorityId.trim());
      if (!prio || prio.departmentId !== dto.departmentId) {
        throw new NotFoundException('Priority not found or does not belong to this department');
      }
      priorityId = new Types.ObjectId(dto.priorityId.trim());
    }
    const sameColumn = await this.taskModel
      .find({ departmentId: new Types.ObjectId(dto.departmentId), statusId })
      .sort({ order: -1 })
      .limit(1)
      .lean()
      .exec();
    const nextOrder = (sameColumn[0] as any)?.order != null ? (sameColumn[0] as any).order + 1 : 0;
    const doc = await this.taskModel.create({
      title: dto.title.trim(),
      description: (dto.description ?? '').trim(),
      departmentId: new Types.ObjectId(dto.departmentId),
      statusId,
      priorityId,
      assigneeId: dto.assigneeId ? new Types.ObjectId(dto.assigneeId) : null,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      order: nextOrder,
      createdBy: new Types.ObjectId(userId),
    });
    const item = this.toItem(doc.toObject ? doc.toObject() : doc);
    await this.enrichWithAssigneeName(item);
    await this.enrichWithBlock(item);
    await this.enrichWithPriority(item);
    return item;
  }

  private async enrichWithAssigneeName(item: TaskItem): Promise<void> {
    if (item.assigneeId) {
      const user = await this.userService.findById(item.assigneeId);
      if (user) {
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
        item.assigneeName = name || user.email;
      }
    }
  }

  private async enrichWithBlock(item: TaskItem): Promise<void> {
    if (item.statusId) {
      const block = await this.taskStatusService.findById(item.statusId);
      if (block) {
        item.statusName = block.name;
        item.statusColor = block.color;
      }
    }
  }

  private async enrichWithPriority(item: TaskItem): Promise<void> {
    if (item.priorityId) {
      const prio = await this.taskPriorityService.findById(item.priorityId);
      if (prio) {
        item.priorityName = prio.name;
        item.priorityColor = prio.color;
      }
    }
  }

  async findByDepartment(departmentId: string): Promise<TaskItem[]> {
    const list = await this.taskModel
      .find({ departmentId: new Types.ObjectId(departmentId) })
      .sort({ statusId: 1, order: 1, createdAt: -1 })
      .lean()
      .exec();
    const items = list.map((d: any) => this.toItem(d));
    for (const item of items) {
      await this.enrichWithAssigneeName(item);
      await this.enrichWithBlock(item);
      await this.enrichWithPriority(item);
    }
    return items;
  }

  async findById(id: string): Promise<TaskItem | null> {
    const doc = await this.taskModel.findById(id).lean().exec();
    if (!doc) return null;
    const item = this.toItem(doc);
    await this.enrichWithAssigneeName(item);
    await this.enrichWithBlock(item);
    await this.enrichWithPriority(item);
    return item;
  }

  async update(
    id: string,
    dto: {
      title?: string;
      description?: string;
      statusId?: string | null;
      priorityId?: string | null;
      assigneeId?: string | null;
      dueAt?: string | null;
      order?: number;
    },
  ): Promise<TaskItem> {
    const doc = await this.taskModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Task not found');
    if (dto.title !== undefined) doc.title = dto.title.trim();
    if (dto.description !== undefined) doc.description = dto.description.trim();
    if (dto.statusId !== undefined) {
      if (dto.statusId?.trim()) {
        const block = await this.taskStatusService.findById(dto.statusId.trim());
        if (!block || block.departmentId !== String(doc.departmentId)) {
          throw new NotFoundException('Block not found or does not belong to this department');
        }
        doc.statusId = new Types.ObjectId(dto.statusId.trim()) as any;
        const last = await this.taskModel
          .findOne({ departmentId: doc.departmentId, statusId: doc.statusId, _id: { $ne: doc._id } })
          .sort({ order: -1 })
          .lean()
          .exec();
        (doc as any).order = (last as any)?.order != null ? (last as any).order + 1 : 0;
      } else {
        doc.statusId = null;
        const last = await this.taskModel
          .findOne({ departmentId: doc.departmentId, statusId: null, _id: { $ne: doc._id } })
          .sort({ order: -1 })
          .lean()
          .exec();
        (doc as any).order = (last as any)?.order != null ? (last as any).order + 1 : 0;
      }
    }
    if (dto.priorityId !== undefined) {
      if (dto.priorityId?.trim()) {
        const prio = await this.taskPriorityService.findById(dto.priorityId.trim());
        if (!prio || prio.departmentId !== String(doc.departmentId)) {
          throw new NotFoundException('Priority not found or does not belong to this department');
        }
        doc.priorityId = new Types.ObjectId(dto.priorityId.trim()) as any;
      } else {
        doc.priorityId = null;
      }
    }
    if (dto.assigneeId !== undefined)
      doc.assigneeId = dto.assigneeId ? (new Types.ObjectId(dto.assigneeId) as any) : null;
    if (dto.dueAt !== undefined) doc.dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
    if (dto.order !== undefined) (doc as any).order = dto.order;
    await doc.save();
    const item = this.toItem(doc.toObject ? doc.toObject() : doc);
    await this.enrichWithAssigneeName(item);
    await this.enrichWithBlock(item);
    await this.enrichWithPriority(item);
    return item;
  }

  async delete(id: string): Promise<void> {
    const doc = await this.taskModel.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException('Task not found');
  }

  async reorder(departmentId: string, statusId: string | null, taskIds: string[]): Promise<void> {
    if (!taskIds.length) return;
    const deptId = new Types.ObjectId(departmentId);
    const tasks = await this.taskModel
      .find({ _id: { $in: taskIds.map((id) => new Types.ObjectId(id)) }, departmentId: deptId })
      .exec();
    const byId = new Map(tasks.map((t) => [String(t._id), t]));
    const sameColumn = (doc: { statusId: unknown }) =>
      (statusId === null && doc.statusId == null) ||
      (statusId !== null && doc.statusId != null && String(doc.statusId) === statusId);
    for (let i = 0; i < taskIds.length; i++) {
      const doc = byId.get(taskIds[i]);
      if (doc && sameColumn(doc)) {
        (doc as any).order = i;
        await doc.save();
      }
    }
  }
}
