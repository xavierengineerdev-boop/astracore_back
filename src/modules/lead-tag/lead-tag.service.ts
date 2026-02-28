import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LeadTag, LeadTagDocument } from './lead-tag.schema';
import { DepartmentService } from '../department/department.service';
import { UserService } from '../user/user.service';

export type LeadTagItem = {
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
export class LeadTagService {
  constructor(
    @InjectModel(LeadTag.name) private leadTagModel: Model<LeadTagDocument>,
    private departmentService: DepartmentService,
    private userService: UserService,
  ) {}

  /** super, admin, or department manager can manage lead tags */
  async canManageDepartment(departmentId: string, userId: string, userRole: string): Promise<boolean> {
    if (userRole === 'super' || userRole === 'admin') return true;
    const department = await this.departmentService.findById(departmentId);
    return department?.managerId ? String(department.managerId) === String(userId) : false;
  }

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
  ): Promise<LeadTagItem> {
    const can = await this.canManageDepartment(dto.departmentId, userId, userRole);
    if (!can) throw new ForbiddenException('You can only create lead tags for your department or need super/admin role');
    const department = await this.departmentService.findById(dto.departmentId);
    if (!department) throw new NotFoundException('Department not found');
    const last = await this.leadTagModel
      .findOne({ departmentId: new Types.ObjectId(dto.departmentId) })
      .sort({ order: -1 })
      .lean()
      .exec();
    const order = (last as any)?.order != null ? (last as any).order + 1 : 0;
    const doc = await this.leadTagModel.create({
      name: dto.name.trim(),
      description: (dto.description ?? '').trim(),
      color: (dto.color ?? '#9ca3af').trim(),
      departmentId: new Types.ObjectId(dto.departmentId),
      order,
    });
    return this.toItem(doc.toObject ? doc.toObject() : (doc as any));
  }

  async findByDepartment(departmentId: string): Promise<LeadTagItem[]> {
    const list = await this.leadTagModel
      .find({ departmentId: new Types.ObjectId(departmentId) })
      .sort({ order: 1, createdAt: 1 })
      .lean()
      .exec();
    return list.map((s: any) => this.toItem(s));
  }

  async findById(id: string): Promise<LeadTagItem | null> {
    const doc = await this.leadTagModel.findById(id).lean().exec();
    if (!doc) return null;
    return this.toItem(doc);
  }

  async update(
    id: string,
    dto: { name?: string; description?: string; color?: string; departmentId?: string },
    userId: string,
    userRole: string,
  ): Promise<LeadTagItem> {
    const doc = await this.leadTagModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Lead tag not found');
    const departmentId = String(doc.departmentId);
    const can = await this.canManageDepartment(departmentId, userId, userRole);
    if (!can) throw new ForbiddenException('You can only edit lead tags of your department or need super/admin role');
    if (dto.departmentId !== undefined && dto.departmentId !== departmentId) {
      const canNew = await this.canManageDepartment(dto.departmentId, userId, userRole);
      if (!canNew) throw new ForbiddenException('Cannot assign tag to that department');
      doc.departmentId = new Types.ObjectId(dto.departmentId) as any;
    }
    if (dto.name !== undefined) doc.name = dto.name.trim();
    if (dto.description !== undefined) doc.description = dto.description.trim();
    if (dto.color !== undefined) doc.color = dto.color.trim();
    await doc.save();
    return this.toItem(doc.toObject ? doc.toObject() : (doc as any));
  }

  async delete(id: string, userId: string, userRole: string): Promise<void> {
    const doc = await this.leadTagModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Lead tag not found');
    const can = await this.canManageDepartment(String(doc.departmentId), userId, userRole);
    if (!can) throw new ForbiddenException('You can only delete lead tags of your department or need super/admin role');
    await this.leadTagModel.findByIdAndDelete(id).exec();
  }

  private toItem(d: any): LeadTagItem {
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
