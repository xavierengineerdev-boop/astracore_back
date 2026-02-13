import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { Site, SiteDocument } from './site.schema';
import { DepartmentService } from '../department/department.service';
import { UserService } from '../user/user.service';

export type SiteItem = {
  _id: string;
  url: string;
  description: string;
  token: string;
  departmentId: string;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class SiteService {
  constructor(
    @InjectModel(Site.name) private siteModel: Model<SiteDocument>,
    private departmentService: DepartmentService,
    private userService: UserService,
  ) {}

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /** Same as statuses: super or department manager (managerId) */
  async canManageDepartment(departmentId: string, userId: string, userRole: string): Promise<boolean> {
    if (userRole === 'super') return true;
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
    dto: { url: string; description?: string; departmentId: string },
    userId: string,
    userRole: string,
  ): Promise<SiteItem> {
    const can = await this.canManageDepartment(dto.departmentId, userId, userRole);
    if (!can) throw new ForbiddenException('You can only create sites for your department or need super role');
    const department = await this.departmentService.findById(dto.departmentId);
    if (!department) throw new NotFoundException('Department not found');
    let token = this.generateToken();
    let exists = await this.siteModel.findOne({ token }).exec();
    while (exists) {
      token = this.generateToken();
      exists = await this.siteModel.findOne({ token }).exec();
    }
    const doc = await this.siteModel.create({
      url: dto.url.trim(),
      description: (dto.description ?? '').trim(),
      token,
      departmentId: new Types.ObjectId(dto.departmentId),
    });
    return this.toItem(doc.toObject ? doc.toObject() : (doc as any));
  }

  async findByDepartment(departmentId: string): Promise<SiteItem[]> {
    const list = await this.siteModel
      .find({ departmentId: new Types.ObjectId(departmentId) })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return list.map((s: any) => this.toItem(s));
  }

  async findById(id: string): Promise<SiteItem | null> {
    const doc = await this.siteModel.findById(id).lean().exec();
    if (!doc) return null;
    return this.toItem(doc);
  }

  async findByToken(token: string): Promise<SiteItem | null> {
    if (!token?.trim()) return null;
    const doc = await this.siteModel.findOne({ token: token.trim() }).lean().exec();
    if (!doc) return null;
    return this.toItem(doc);
  }

  async update(
    id: string,
    dto: { url?: string; description?: string },
    userId: string,
    userRole: string,
  ): Promise<SiteItem> {
    const doc = await this.siteModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Site not found');
    const departmentId = String(doc.departmentId);
    const can = await this.canManageDepartment(departmentId, userId, userRole);
    if (!can) throw new ForbiddenException('You can only edit sites of your department or need super role');
    if (dto.url !== undefined) doc.url = dto.url.trim();
    if (dto.description !== undefined) doc.description = dto.description.trim();
    await doc.save();
    return this.toItem(doc.toObject ? doc.toObject() : (doc as any));
  }

  async delete(id: string, userId: string, userRole: string): Promise<void> {
    const doc = await this.siteModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Site not found');
    const can = await this.canManageDepartment(String(doc.departmentId), userId, userRole);
    if (!can) throw new ForbiddenException('You can only delete sites of your department or need super role');
    await this.siteModel.findByIdAndDelete(id).exec();
  }

  private toItem(d: any): SiteItem {
    return {
      _id: String(d._id),
      url: d.url ?? '',
      description: d.description ?? '',
      token: d.token ?? '',
      departmentId: String(d.departmentId),
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : '',
      updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : '',
    };
  }
}
