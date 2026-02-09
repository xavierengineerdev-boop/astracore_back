import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Status, StatusDocument } from './status.schema';
import { DepartmentService } from '../department/department.service';
import { UserService } from '../user/user.service';

export type StatusItem = {
  _id: string;
  name: string;
  description: string;
  color: string;
  departmentId: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class StatusService {
  constructor(
    @InjectModel(Status.name) private statusModel: Model<StatusDocument>,
    private departmentService: DepartmentService,
    private userService: UserService,
  ) {}

  /** Check if user can manage statuses for this department: super or user assigned as department manager (managerId) */
  async canManageDepartment(departmentId: string, userId: string, userRole: string): Promise<boolean> {
    if (userRole === 'super') return true;
    const department = await this.departmentService.findById(departmentId);
    return department?.managerId ? String(department.managerId) === String(userId) : false;
  }

  /** Check if user can view statuses: super, admin, department manager, or employee of this department */
  async canViewDepartment(departmentId: string, userId: string, userRole: string): Promise<boolean> {
    if (userRole === 'super' || userRole === 'admin') return true;
    const asManager = await this.canManageDepartment(departmentId, userId, userRole);
    if (asManager) return true;
    if (userRole === 'employee') {
      const user = await this.userService.findById(userId);
      return user?.departmentId ? String(user.departmentId) === departmentId : false;
    }
    return false;
  }

  async create(
    dto: { name: string; description?: string; color?: string; departmentId: string },
    userId: string,
    userRole: string,
  ): Promise<StatusItem> {
    const can = await this.canManageDepartment(dto.departmentId, userId, userRole);
    if (!can) throw new ForbiddenException('You can only create statuses for your department or need super role');
    const department = await this.departmentService.findById(dto.departmentId);
    if (!department) throw new NotFoundException('Department not found');
    const last = await this.statusModel
      .findOne({ departmentId: new Types.ObjectId(dto.departmentId) })
      .sort({ order: -1 })
      .lean()
      .exec();
    const order = (last as any)?.order != null ? (last as any).order + 1 : 0;
    const doc = await this.statusModel.create({
      name: dto.name.trim(),
      description: (dto.description ?? '').trim(),
      color: (dto.color ?? '#9ca3af').trim(),
      departmentId: new Types.ObjectId(dto.departmentId),
      order,
    });
    return this.toItem(doc.toObject ? doc.toObject() : (doc as any));
  }

  async findByDepartment(departmentId: string): Promise<StatusItem[]> {
    const list = await this.statusModel
      .find({ departmentId: new Types.ObjectId(departmentId) })
      .sort({ order: 1, createdAt: 1 })
      .lean()
      .exec();
    return list.map((s: any) => this.toItem(s));
  }

  async findById(id: string): Promise<StatusItem | null> {
    const doc = await this.statusModel.findById(id).lean().exec();
    if (!doc) return null;
    return this.toItem(doc);
  }

  async update(
    id: string,
    dto: { name?: string; description?: string; color?: string; departmentId?: string },
    userId: string,
    userRole: string,
  ): Promise<StatusItem> {
    const doc = await this.statusModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Status not found');
    const departmentId = String(doc.departmentId);
    const can = await this.canManageDepartment(departmentId, userId, userRole);
    if (!can) throw new ForbiddenException('You can only edit statuses of your department or need super role');
    if (dto.departmentId !== undefined && dto.departmentId !== departmentId) {
      const canNew = await this.canManageDepartment(dto.departmentId, userId, userRole);
      if (!canNew) throw new ForbiddenException('Cannot assign status to that department');
      doc.departmentId = new Types.ObjectId(dto.departmentId) as any;
    }
    if (dto.name !== undefined) doc.name = dto.name.trim();
    if (dto.description !== undefined) doc.description = dto.description.trim();
    if (dto.color !== undefined) doc.color = dto.color.trim();
    await doc.save();
    return this.toItem(doc.toObject ? doc.toObject() : (doc as any));
  }

  async delete(id: string, userId: string, userRole: string): Promise<void> {
    const doc = await this.statusModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Status not found');
    const can = await this.canManageDepartment(String(doc.departmentId), userId, userRole);
    if (!can) throw new ForbiddenException('You can only delete statuses of your department or need super role');
    await this.statusModel.findByIdAndDelete(id).exec();
  }

  private toItem(d: any): StatusItem {
    return {
      _id: String(d._id),
      name: d.name ?? '',
      description: d.description ?? '',
      color: d.color ?? '#9ca3af',
      departmentId: String(d.departmentId),
      order: d.order ?? 0,
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : '',
      updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : '',
    };
  }
}
