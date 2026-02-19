import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TaskPriority, TaskPriorityDocument } from './task-priority.schema';
import { DepartmentService } from '../department/department.service';

export type TaskPriorityItem = {
  _id: string;
  name: string;
  color: string;
  order: number;
  departmentId: string;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class TaskPriorityService {
  constructor(
    @InjectModel(TaskPriority.name) private taskPriorityModel: Model<TaskPriorityDocument>,
    private departmentService: DepartmentService,
  ) {}

  private toItem(d: any): TaskPriorityItem {
    return {
      _id: String(d._id),
      name: d.name ?? '',
      color: d.color ?? '#9ca3af',
      order: d.order ?? 0,
      departmentId: d.departmentId ? String(d.departmentId) : '',
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : '',
      updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : '',
    };
  }

  async create(dto: { name: string; color?: string; departmentId: string }): Promise<TaskPriorityItem> {
    const department = await this.departmentService.findById(dto.departmentId);
    if (!department) throw new NotFoundException('Department not found');
    const last = await this.taskPriorityModel
      .findOne({ departmentId: new Types.ObjectId(dto.departmentId) })
      .sort({ order: -1 })
      .lean()
      .exec();
    const order = (last as any)?.order != null ? (last as any).order + 1 : 0;
    const doc = await this.taskPriorityModel.create({
      name: dto.name.trim(),
      color: (dto.color ?? '#9ca3af').trim(),
      order,
      departmentId: new Types.ObjectId(dto.departmentId),
    });
    return this.toItem(doc.toObject ? doc.toObject() : (doc as any));
  }

  async findByDepartment(departmentId: string): Promise<TaskPriorityItem[]> {
    const list = await this.taskPriorityModel
      .find({ departmentId: new Types.ObjectId(departmentId) })
      .sort({ order: 1, createdAt: 1 })
      .lean()
      .exec();
    return list.map((s: any) => this.toItem(s));
  }

  async findById(id: string): Promise<TaskPriorityItem | null> {
    const doc = await this.taskPriorityModel.findById(id).lean().exec();
    if (!doc) return null;
    return this.toItem(doc);
  }

  async update(id: string, dto: { name?: string; color?: string }): Promise<TaskPriorityItem> {
    const doc = await this.taskPriorityModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Task priority not found');
    if (dto.name !== undefined) doc.name = dto.name.trim();
    if (dto.color !== undefined) doc.color = dto.color.trim();
    await doc.save();
    return this.toItem(doc.toObject ? doc.toObject() : (doc as any));
  }

  async delete(id: string): Promise<void> {
    const doc = await this.taskPriorityModel.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException('Task priority not found');
  }
}
