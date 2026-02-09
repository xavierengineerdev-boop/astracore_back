import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Department, DepartmentDocument } from './department.schema';
import { Status, type StatusDocument } from '../status/status.schema';
import { Site, type SiteDocument } from '../site/site.schema';
import { UserService, UserItem } from '../user/user.service';

export type DepartmentItem = {
  _id: string;
  name: string;
  managerId?: string;
  createdAt: string;
  updatedAt: string;
};

export type DepartmentDetail = DepartmentItem & {
  manager?: UserItem | null;
  employees: UserItem[];
  employeesCount: number;
  statusesCount: number;
  sitesCount: number;
};

@Injectable()
export class DepartmentService {
  constructor(
    @InjectModel(Department.name) private departmentModel: Model<DepartmentDocument>,
    @InjectModel(Status.name) private statusModel: Model<StatusDocument>,
    @InjectModel(Site.name) private siteModel: Model<SiteDocument>,
    private userService: UserService,
  ) {}

  async create(name: string, managerId?: string): Promise<DepartmentItem> {
    const existing = await this.departmentModel.findOne({ name: name.trim() }).exec();
    if (existing) {
      throw new ConflictException('Department with this name already exists');
    }
    const doc = await this.departmentModel.create({
      name: name.trim(),
      managerId: managerId ? new Types.ObjectId(managerId) : undefined,
    });
    const item = this.toItem(doc);
    if (managerId) {
      try {
        await this.userService.update(managerId, { departmentId: item._id });
      } catch {
        // user might not exist; department is still created
      }
    }
    return item;
  }

  async findAll(): Promise<DepartmentItem[]> {
    const list = await this.departmentModel.find().lean().exec();
    return list.map((d: any) => this.toItem(d));
  }

  async findByManagerId(managerId: string): Promise<DepartmentItem[]> {
    const list = await this.departmentModel
      .find({ managerId: new Types.ObjectId(managerId) })
      .lean()
      .exec();
    return list.map((d: any) => this.toItem(d));
  }

  async findById(id: string): Promise<DepartmentDetail | null> {
    const doc = await this.departmentModel.findById(id).lean().exec();
    if (!doc) return null;
    const item = this.toItem(doc);
    let manager = item.managerId ? await this.userService.findById(item.managerId) : null;
    // Reconcile: if this department has a manager but their departmentId is wrong, fix it (e.g. data from before sync existed)
    if (item.managerId && manager?.departmentId !== id) {
      try {
        await this.userService.update(item.managerId, { departmentId: id });
        manager = await this.userService.findById(item.managerId);
      } catch {
        // ignore
      }
    }
    const allUsers = await this.userService.findAll();
    const employees = allUsers.filter((u) => u.departmentId === id);
    const [statusesCount, sitesCount] = await Promise.all([
      this.statusModel.countDocuments({ departmentId: new Types.ObjectId(id) }).exec(),
      this.siteModel.countDocuments({ departmentId: new Types.ObjectId(id) }).exec(),
    ]);
    return {
      ...item,
      manager: manager ?? undefined,
      employees,
      employeesCount: employees.length,
      statusesCount,
      sitesCount,
    };
  }

  async update(id: string, dto: { name?: string; managerId?: string }): Promise<DepartmentItem> {
    const doc = await this.departmentModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Department not found');
    const previousManagerId = doc.managerId ? String(doc.managerId) : undefined;
    const newManagerId = dto.managerId?.trim() || undefined;

    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      const existing = await this.departmentModel.findOne({ name: trimmed, _id: { $ne: id } }).exec();
      if (existing) throw new ConflictException('Department with this name already exists');
      doc.name = trimmed;
    }
    if (dto.managerId !== undefined) {
      doc.managerId = newManagerId ? (new Types.ObjectId(newManagerId) as any) : undefined;
    }
    await doc.save();

    if (previousManagerId && previousManagerId !== newManagerId) {
      try {
        const prevUser = await this.userService.findById(previousManagerId);
        if (prevUser?.departmentId === id) {
          await this.userService.update(previousManagerId, { departmentId: undefined });
        }
      } catch {
        // ignore
      }
    }
    if (newManagerId) {
      try {
        await this.userService.update(newManagerId, { departmentId: id });
      } catch {
        // user might not exist
      }
    }
    return this.toItem(doc.toObject ? doc.toObject() : (doc as any));
  }

  async delete(id: string): Promise<void> {
    const doc = await this.departmentModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Department not found');
    await this.userService.clearDepartmentForUsers(id);
    await this.departmentModel.findByIdAndDelete(id).exec();
  }

  private toItem(d: any): DepartmentItem {
    return {
      _id: String(d._id),
      name: d.name ?? '',
      managerId: d.managerId ? String(d.managerId) : undefined,
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : '',
      updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : '',
    };
  }
}
