import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { SUPER_ROLE } from '../../constants/roles.constant';
import type { UserRole } from '../../constants/roles.constant';
import { User, UserDocument } from './user.schema';

export type UserItem = {
  _id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  phone: string;
  isActive: boolean;
  lastLoginAt?: string;
  departmentId?: string;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private config: ConfigService,
  ) {}

  async createSuperUserIfNotExists(): Promise<UserDocument | null> {
    const email = this.config.get<string>('superUserEmail');
    const password = this.config.get<string>('superUserPassword');

    if (!email || !password) {
      return null;
    }

    const existing = await this.userModel
      .findOne({ email: email.toLowerCase(), role: SUPER_ROLE })
      .exec();

    if (existing) {
      return existing;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.userModel.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      role: SUPER_ROLE,
    });

    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('+password')
      .exec();
  }

  async createUser(
    email: string,
    password: string,
    role: UserRole,
    extra?: { firstName?: string; lastName?: string; phone?: string; isActive?: boolean; departmentId?: string },
  ): Promise<UserItem> {
    const normalized = email.toLowerCase();
    const existing = await this.userModel.findOne({ email: normalized }).exec();
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.userModel.create({
      email: normalized,
      password: hashedPassword,
      role,
      firstName: extra?.firstName ?? '',
      lastName: extra?.lastName ?? '',
      phone: extra?.phone ?? '',
      isActive: extra?.isActive ?? true,
      departmentId: extra?.departmentId ? new Types.ObjectId(extra.departmentId) as any : undefined,
    });
    const obj = user.toObject ? user.toObject() : (user as any);
    delete obj.password;
    return this.toUserItem(obj);
  }

  private toUserItem(u: any): UserItem {
    return {
      _id: String(u._id),
      email: u.email,
      role: u.role,
      firstName: u.firstName ?? '',
      lastName: u.lastName ?? '',
      phone: u.phone ?? '',
      isActive: u.isActive !== false,
      lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : undefined,
      departmentId: u.departmentId ? String(u.departmentId) : undefined,
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : '',
      updatedAt: u.updatedAt ? new Date(u.updatedAt).toISOString() : '',
    };
  }

  async findAll(): Promise<UserItem[]> {
    const users = await this.userModel.find().select('-password').lean().exec();
    return users.map((u: any) => this.toUserItem(u));
  }

  /** Пользователи отдела (для руководителя — только свой отдел). */
  async findByDepartment(departmentId: string): Promise<UserItem[]> {
    const users = await this.userModel
      .find({ departmentId: new Types.ObjectId(departmentId) })
      .select('-password')
      .lean()
      .exec();
    return users.map((u: any) => this.toUserItem(u));
  }

  async findById(id: string): Promise<UserItem | null> {
    const user = await this.userModel.findById(id).select('-password').lean().exec();
    return user ? this.toUserItem(user) : null;
  }

  async update(
    id: string,
    dto: {
      email?: string;
      role?: UserRole;
      firstName?: string;
      lastName?: string;
      phone?: string;
      isActive?: boolean;
      departmentId?: string;
    },
  ): Promise<UserItem> {
    const doc = await this.userModel.findById(id).exec();
    if (!doc) throw new NotFoundException('User not found');
    if (dto.email !== undefined) {
      const normalized = dto.email.toLowerCase();
      const existing = await this.userModel.findOne({ email: normalized, _id: { $ne: id } }).exec();
      if (existing) throw new ConflictException('User with this email already exists');
      doc.email = normalized;
    }
    if (dto.role !== undefined) doc.role = dto.role;
    if (dto.firstName !== undefined) doc.firstName = dto.firstName;
    if (dto.lastName !== undefined) doc.lastName = dto.lastName;
    if (dto.phone !== undefined) doc.phone = dto.phone;
    if (dto.isActive !== undefined) doc.isActive = dto.isActive;
    if (dto.departmentId !== undefined) doc.departmentId = dto.departmentId ? (new Types.ObjectId(dto.departmentId) as any) : undefined;
    await doc.save();
    const obj = doc.toObject ? doc.toObject() : (doc as any);
    delete obj.password;
    return this.toUserItem(obj);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userModel.updateOne({ _id: id }, { lastLoginAt: new Date() }).exec();
  }

  async delete(id: string): Promise<void> {
    const doc = await this.userModel.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException('User not found');
  }

  /** Clear departmentId for all users assigned to the given department (e.g. when department is deleted). */
  async clearDepartmentForUsers(departmentId: string): Promise<void> {
    await this.userModel
      .updateMany(
        { departmentId: new Types.ObjectId(departmentId) },
        { $unset: { departmentId: 1 } },
      )
      .exec();
  }
}
