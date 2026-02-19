import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TaskStatus, TaskStatusDocument } from './task-status.schema';
import { DepartmentService } from '../department/department.service';

export type TaskStatusItem = {
  _id: string;
  name: string;
  color: string;
  order: number;
  isCompleted: boolean;
  departmentId: string;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class TaskStatusService {
  constructor(
    @InjectModel(TaskStatus.name) private taskStatusModel: Model<TaskStatusDocument>,
    private departmentService: DepartmentService,
  ) {}

  private toItem(d: any): TaskStatusItem {
    return {
      _id: String(d._id),
      name: d.name ?? '',
      color: d.color ?? '#9ca3af',
      order: d.order ?? 0,
      isCompleted: d.isCompleted === true,
      departmentId: d.departmentId ? String(d.departmentId) : '',
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : '',
      updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : '',
    };
  }

  async create(dto: { name: string; color?: string; isCompleted?: boolean; departmentId: string }): Promise<TaskStatusItem> {
    const department = await this.departmentService.findById(dto.departmentId);
    if (!department) throw new NotFoundException('Department not found');
    const last = await this.taskStatusModel
      .findOne({ departmentId: new Types.ObjectId(dto.departmentId) })
      .sort({ order: -1 })
      .lean()
      .exec();
    const order = (last as any)?.order != null ? (last as any).order + 1 : 0;
    const doc = await this.taskStatusModel.create({
      name: dto.name.trim(),
      color: (dto.color ?? '#9ca3af').trim(),
      order,
      isCompleted: dto.isCompleted === true,
      departmentId: new Types.ObjectId(dto.departmentId),
    });
    return this.toItem(doc.toObject ? doc.toObject() : (doc as any));
  }

  async findByDepartment(departmentId: string): Promise<TaskStatusItem[]> {
    const list = await this.taskStatusModel
      .find({ departmentId: new Types.ObjectId(departmentId) })
      .sort({ order: 1, createdAt: 1 })
      .lean()
      .exec();
    return list.map((s: any) => this.toItem(s));
  }

  async findById(id: string): Promise<TaskStatusItem | null> {
    const doc = await this.taskStatusModel.findById(id).lean().exec();
    if (!doc) return null;
    return this.toItem(doc);
  }

  async update(id: string, dto: { name?: string; color?: string; isCompleted?: boolean }): Promise<TaskStatusItem> {
    const doc = await this.taskStatusModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Task status not found');
    if (dto.name !== undefined) doc.name = dto.name.trim();
    if (dto.color !== undefined) doc.color = dto.color.trim();
    if (dto.isCompleted !== undefined) doc.isCompleted = dto.isCompleted;
    await doc.save();
    return this.toItem(doc.toObject ? doc.toObject() : (doc as any));
  }

  async delete(id: string): Promise<void> {
    const doc = await this.taskStatusModel.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException('Task status not found');
  }
}
