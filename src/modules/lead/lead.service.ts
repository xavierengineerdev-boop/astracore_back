import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lead, LeadDocument } from './lead.schema';
import { LeadNote, LeadNoteDocument } from './lead-note.schema';
import { LeadHistory, LeadHistoryDocument, LeadHistoryAction } from './lead-history.schema';
import { LeadTask, LeadTaskDocument } from './lead-task.schema';
import { LeadReminder, LeadReminderDocument } from './lead-reminder.schema';
import { DepartmentService, DepartmentDetail } from '../department/department.service';
import { UserService } from '../user/user.service';
import { StatusService } from '../status/status.service';

export type LeadSourceMetaItem = {
  ip?: string;
  userAgent?: string;
  referrer?: string;
  screen?: string;
  language?: string;
  platform?: string;
  timezone?: string;
  deviceMemory?: string;
  hardwareConcurrency?: string;
  extra?: Record<string, unknown>;
};

export type LeadItem = {
  _id: string;
  name: string;
  lastName: string;
  phone: string;
  email: string;
  departmentId: string;
  statusId: string | null;
  source: string;
  siteId: string | null;
  sourceMeta?: LeadSourceMetaItem;
  createdBy: string;
  assignedTo: string[];
  createdAt: string;
  updatedAt: string;
};

export type LeadListResult = {
  items: LeadItem[];
  total: number;
  skip: number;
  limit: number;
};

export type BulkCreateResult = {
  added: number;
  duplicates: number;
};

export type LeadNoteItem = {
  _id: string;
  leadId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type LeadHistoryItem = {
  _id: string;
  leadId: string;
  action: LeadHistoryAction;
  userId: string;
  userDisplayName?: string;
  meta: Record<string, unknown>;
  createdAt: string;
};

export type LeadTaskItem = {
  _id: string;
  leadId: string;
  title: string;
  dueAt: string | null;
  completed: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type LeadReminderItem = {
  _id: string;
  leadId: string;
  title: string;
  remindAt: string;
  done: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type LeadStatsByStatusRow = {
  assigneeId: string;
  assigneeName: string;
  isManager: boolean;
  byStatus: { statusId: string; statusName: string; count: number }[];
  total: number;
};

export type LeadStatsResult = {
  departmentId: string;
  departmentName: string;
  statuses: { _id: string; name: string; order: number }[];
  rows: LeadStatsByStatusRow[];
  filters?: { dateFrom?: string; dateTo?: string; statusId?: string };
};

export type UserLeadStatsResult = {
  total: number;
  byStatus: { statusId: string; statusName: string; count: number }[];
  overTime: { date: string; count: number }[];
};

@Injectable()
export class LeadService {
  constructor(
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    @InjectModel(LeadNote.name) private leadNoteModel: Model<LeadNoteDocument>,
    @InjectModel(LeadHistory.name) private leadHistoryModel: Model<LeadHistoryDocument>,
    @InjectModel(LeadTask.name) private leadTaskModel: Model<LeadTaskDocument>,
    @InjectModel(LeadReminder.name) private leadReminderModel: Model<LeadReminderDocument>,
    private departmentService: DepartmentService,
    private userService: UserService,
    private statusService: StatusService,
  ) {}

  private async addHistory(
    leadId: string,
    action: LeadHistoryAction,
    userId: string,
    meta: Record<string, unknown> = {},
  ): Promise<void> {
    await this.leadHistoryModel.create({
      leadId: new Types.ObjectId(leadId),
      action,
      userId: new Types.ObjectId(userId),
      meta,
    });
  }

  /** Super or department manager (managerId) */
  async canManageDepartment(departmentId: string, userId: string, userRole: string): Promise<boolean> {
    if (userRole === 'super') return true;
    const department = await this.departmentService.findById(departmentId);
    return department?.managerId ? String(department.managerId) === String(userId) : false;
  }

  /** Can view leads: super, admin, manager of dept, employee of dept */
  async canViewDepartment(departmentId: string, userId: string, userRole: string): Promise<boolean> {
    if (userRole === 'super' || userRole === 'admin') return true;
    if (await this.canManageDepartment(departmentId, userId, userRole)) return true;
    if (userRole === 'employee') {
      const user = await this.userService.findById(userId);
      return user?.departmentId ? String(user.departmentId) === departmentId : false;
    }
    return false;
  }

  /** Can create lead in department: super, manager of dept, or employee of dept */
  async canCreateInDepartment(departmentId: string, userId: string, userRole: string): Promise<boolean> {
    if (userRole === 'super') return true;
    if (await this.canManageDepartment(departmentId, userId, userRole)) return true;
    if (userRole === 'employee') {
      const user = await this.userService.findById(userId);
      return user?.departmentId ? String(user.departmentId) === departmentId : false;
    }
    return false;
  }

  /** Can edit/delete lead: super or (view access to lead's department) */
  async canEditLead(lead: LeadItem, userId: string, userRole: string): Promise<boolean> {
    return this.canViewDepartment(lead.departmentId, userId, userRole);
  }

  /** Allowed assignee user ids for a department (manager + employees) */
  private getAllowedAssigneeIds(department: DepartmentDetail): Set<string> {
    const ids = new Set<string>();
    if (department.managerId) ids.add(department.managerId);
    (department.employees || []).forEach((e) => ids.add(e._id));
    return ids;
  }

  async create(
    dto: {
      name: string;
      lastName?: string;
      phone?: string;
      email?: string;
      departmentId: string;
      statusId?: string;
      source?: string;
      siteId?: string;
      sourceMeta?: LeadSourceMetaItem;
      assignedTo?: string[];
    },
    userId: string,
    userRole: string,
  ): Promise<LeadItem> {
    const can = await this.canCreateInDepartment(dto.departmentId, userId, userRole);
    if (!can) throw new ForbiddenException('You can only create leads in your department or need super role');
    const department = await this.departmentService.findById(dto.departmentId);
    if (!department) throw new NotFoundException('Department not found');

    const allowedAssignees = this.getAllowedAssigneeIds(department);
    const assignedToIds = (dto.assignedTo ?? []).filter((id) => id && allowedAssignees.has(String(id)));
    if ((dto.assignedTo ?? []).length > 0 && assignedToIds.length !== (dto.assignedTo ?? []).length) {
      throw new BadRequestException('Назначить можно только сотрудников или руководителя отдела');
    }

    const phone = (dto.phone ?? '').trim();
    const email = (dto.email ?? '').trim().toLowerCase();
    const deptId = new Types.ObjectId(dto.departmentId);

    if (phone) {
      const existingByPhone = await this.leadModel.findOne({ departmentId: deptId, phone }).lean().exec();
      if (existingByPhone) throw new BadRequestException('Лид с таким телефоном уже существует');
    }
    if (email) {
      const emailRegex = new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      const existingByEmail = await this.leadModel.findOne({ departmentId: deptId, email: emailRegex }).lean().exec();
      if (existingByEmail) throw new BadRequestException('Лид с такой почтой уже существует');
    }

    const sourceMeta =
      dto.sourceMeta && Object.keys(dto.sourceMeta).length > 0
        ? {
            ip: (dto.sourceMeta.ip ?? '').toString().trim() || undefined,
            userAgent: (dto.sourceMeta.userAgent ?? '').toString().trim() || undefined,
            referrer: (dto.sourceMeta.referrer ?? '').toString().trim() || undefined,
            screen: (dto.sourceMeta.screen ?? '').toString().trim() || undefined,
            language: (dto.sourceMeta.language ?? '').toString().trim() || undefined,
            platform: (dto.sourceMeta.platform ?? '').toString().trim() || undefined,
            timezone: (dto.sourceMeta.timezone ?? '').toString().trim() || undefined,
            deviceMemory: (dto.sourceMeta.deviceMemory ?? '').toString().trim() || undefined,
            hardwareConcurrency: (dto.sourceMeta.hardwareConcurrency ?? '').toString().trim() || undefined,
            extra:
              dto.sourceMeta.extra && typeof dto.sourceMeta.extra === 'object' ? dto.sourceMeta.extra : undefined,
          }
        : undefined;
    const doc = await this.leadModel.create({
      name: dto.name.trim(),
      lastName: (dto.lastName ?? '').trim(),
      phone,
      email,
      departmentId: deptId,
      statusId: dto.statusId ? new Types.ObjectId(dto.statusId) : null,
      comment: '',
      source: (dto.source ?? 'manual').trim() || 'manual',
      siteId: dto.siteId ? new Types.ObjectId(dto.siteId) : null,
      sourceMeta: sourceMeta && Object.values(sourceMeta).some((v) => v !== undefined && v !== null) ? sourceMeta : undefined,
      createdBy: new Types.ObjectId(userId),
      assignedTo: assignedToIds.map((id) => new Types.ObjectId(id)),
    });
    const item = this.toItem(doc.toObject ? doc.toObject() : (doc as any));
    await this.addHistory(item._id, 'created', userId, {
      name: item.name,
      lastName: item.lastName,
      phone: item.phone,
      email: item.email,
      statusId: item.statusId,
      assignedTo: item.assignedTo,
    });
    return item;
  }

  async bulkCreate(
    departmentId: string,
    items: { name: string; phone: string }[],
    userId: string,
    userRole: string,
  ): Promise<BulkCreateResult> {
    const can = await this.canCreateInDepartment(departmentId, userId, userRole);
    if (!can) throw new ForbiddenException('You can only create leads in your department or need super role');
    const department = await this.departmentService.findById(departmentId);
    if (!department) throw new NotFoundException('Department not found');

    const normalized = items
      .map((i) => ({ name: (i.name ?? '').trim(), phone: (i.phone ?? '').trim() }))
      .filter((i) => i.name.length > 0 && i.phone.length > 0);

    if (normalized.length === 0) {
      return { added: 0, duplicates: items.length };
    }

    const seenInBatch = new Set<string>();
    const deduped = normalized.filter((i) => {
      if (seenInBatch.has(i.phone)) return false;
      seenInBatch.add(i.phone);
      return true;
    });

    const deptId = new Types.ObjectId(departmentId);
    const existingPhones = await this.leadModel
      .find({ departmentId: deptId, phone: { $in: deduped.map((i) => i.phone) } })
      .distinct('phone')
      .lean()
      .exec();
    const existingSet = new Set(existingPhones as string[]);

    const toCreate = deduped.filter((i) => !existingSet.has(i.phone));
    const duplicates = normalized.length - toCreate.length;

    if (toCreate.length > 0) {
      const userIdObj = new Types.ObjectId(userId);
      const created = await this.leadModel.insertMany(
        toCreate.map((i) => ({
          name: i.name,
          lastName: '',
          phone: i.phone,
          email: '',
          departmentId: deptId,
          statusId: null,
          comment: '',
          source: 'manual',
          siteId: null,
          createdBy: userIdObj,
          assignedTo: [],
        })),
      );
      for (const doc of created) {
        await this.addHistory(String(doc._id), 'created', userId, {
          name: (doc as any).name,
          phone: (doc as any).phone,
          assignedTo: [],
        });
      }
    }

    return { added: toCreate.length, duplicates };
  }

  /** Escape special regex characters in a string for safe use in RegExp */
  private escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async findByDepartment(
    departmentId: string,
    userId: string,
    userRole: string,
    skip: number = 0,
    limit: number = 50,
    filters?: {
      name?: string;
      phone?: string;
      email?: string;
      statusId?: string;
      assignedTo?: string;
      dateFrom?: string;
      dateTo?: string;
    },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' },
  ): Promise<LeadListResult> {
    const can = await this.canViewDepartment(departmentId, userId, userRole);
    if (!can) throw new ForbiddenException('Access denied to this department leads');

    const query: Record<string, unknown> = { departmentId: new Types.ObjectId(departmentId) };

    if (filters?.name?.trim()) {
      query.name = new RegExp(this.escapeRegex(filters.name.trim()), 'i');
    }
    if (filters?.phone?.trim()) {
      query.phone = new RegExp(this.escapeRegex(filters.phone.trim()), 'i');
    }
    if (filters?.email?.trim()) {
      query.email = new RegExp(this.escapeRegex(filters.email.trim()), 'i');
    }
    if (filters?.statusId?.trim()) {
      query.statusId = new Types.ObjectId(filters.statusId.trim());
    }
    if (filters?.assignedTo?.trim()) {
      query.assignedTo = new Types.ObjectId(filters.assignedTo.trim());
    }
    if (filters?.dateFrom?.trim() || filters?.dateTo?.trim()) {
      const from = filters.dateFrom?.trim()
        ? new Date(filters.dateFrom.trim() + 'T00:00:00.000Z')
        : null;
      const to = filters.dateTo?.trim()
        ? new Date(filters.dateTo.trim() + 'T23:59:59.999Z')
        : null;
      if (from && to && !isNaN(from.getTime()) && !isNaN(to.getTime())) {
        query.createdAt = { $gte: from, $lte: to };
      } else if (from && !isNaN(from.getTime())) {
        query.createdAt = { $gte: from };
      } else if (to && !isNaN(to.getTime())) {
        query.createdAt = { $lte: to };
      }
    }

    const sortBy = sort?.sortBy?.trim() || 'createdAt';
    const sortOrder = sort?.sortOrder === 'asc' ? 1 : -1;
    const allowedSortFields = ['name', 'phone', 'email', 'createdAt', 'statusId'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOpt = { [sortField]: sortOrder };

    const [items, total] = await Promise.all([
      this.leadModel
        .find(query)
        .sort(sortOpt as any)
        .skip(skip)
        .limit(Math.min(limit, 100))
        .lean()
        .exec(),
      this.leadModel.countDocuments(query).exec(),
    ]);
    return {
      items: items.map((d: any) => this.toItem(d)),
      total,
      skip,
      limit,
    };
  }

  async findById(id: string, userId: string, userRole: string): Promise<LeadItem | null> {
    const doc = await this.leadModel.findById(id).lean().exec();
    if (!doc) return null;
    const item = this.toItem(doc);
    const can = await this.canViewDepartment(item.departmentId, userId, userRole);
    if (!can) return null;
    return item;
  }

  async update(
    id: string,
    dto: { name?: string; lastName?: string; phone?: string; email?: string; statusId?: string; assignedTo?: string[] },
    userId: string,
    userRole: string,
  ): Promise<LeadItem> {
    const doc = await this.leadModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Lead not found');
    const item = this.toItem(doc.toObject ? doc.toObject() : (doc as any));
    const can = await this.canEditLead(item, userId, userRole);
    if (!can) throw new ForbiddenException('You cannot edit this lead');

    const deptId = new Types.ObjectId(item.departmentId);
    const idObj = new Types.ObjectId(id);

    const oldAssignedTo = (doc.assignedTo || []).map((id: any) => String(id));
    const oldStatusId = doc.statusId ? String(doc.statusId) : null;

    if (dto.assignedTo !== undefined) {
      if (userRole === 'employee') {
        const allowed = dto.assignedTo?.length === 1 && dto.assignedTo[0] === userId;
        if (!allowed) throw new ForbiddenException('Сотрудник может только взять лид на себя; снять или переназначить может только руководитель');
      }
      const department = await this.departmentService.findById(item.departmentId);
      if (!department) throw new NotFoundException('Department not found');
      const allowedAssignees = this.getAllowedAssigneeIds(department);
      const assignedToIds = (dto.assignedTo ?? []).filter((id) => id && allowedAssignees.has(String(id)));
      if ((dto.assignedTo ?? []).length > 0 && assignedToIds.length !== (dto.assignedTo ?? []).length) {
        throw new BadRequestException('Назначить можно только сотрудников или руководителя отдела');
      }
      doc.assignedTo = assignedToIds.map((id) => new Types.ObjectId(id) as any);
    }
    if (dto.phone !== undefined) {
      const phone = dto.phone.trim();
      if (phone) {
        const existingByPhone = await this.leadModel.findOne({ departmentId: deptId, phone, _id: { $ne: idObj } }).lean().exec();
        if (existingByPhone) throw new BadRequestException('Лид с таким телефоном уже существует');
      }
      doc.phone = phone;
    }
    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      if (email) {
        const emailRegex = new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        const existingByEmail = await this.leadModel.findOne({ departmentId: deptId, email: emailRegex, _id: { $ne: idObj } }).lean().exec();
        if (existingByEmail) throw new BadRequestException('Лид с такой почтой уже существует');
      }
      doc.email = email;
    }
    if (dto.name !== undefined) doc.name = dto.name.trim();
    if (dto.lastName !== undefined) doc.lastName = (dto.lastName ?? '').trim();
    if (dto.statusId !== undefined) doc.statusId = dto.statusId ? (new Types.ObjectId(dto.statusId) as any) : null;
    await doc.save();
    const updatedItem = this.toItem(doc.toObject ? doc.toObject() : (doc as any));
    const newAssignedTo = updatedItem.assignedTo;
    const newStatusId = updatedItem.statusId;
    if (oldStatusId !== newStatusId) {
      await this.addHistory(id, 'status_changed', userId, { oldStatusId, newStatusId });
    }
    if (JSON.stringify([...oldAssignedTo].sort()) !== JSON.stringify([...newAssignedTo].sort())) {
      await this.addHistory(id, 'assigned', userId, { oldAssignedTo, newAssignedTo });
    }
    const otherUpdates: Record<string, unknown> = {};
    if (dto.name !== undefined) otherUpdates.name = updatedItem.name;
    if (dto.lastName !== undefined) otherUpdates.lastName = updatedItem.lastName;
    if (dto.phone !== undefined) otherUpdates.phone = updatedItem.phone;
    if (dto.email !== undefined) otherUpdates.email = updatedItem.email;
    if (Object.keys(otherUpdates).length > 0) {
      await this.addHistory(id, 'updated', userId, otherUpdates);
    }
    return updatedItem;
  }

  async bulkUpdate(
    leadIds: string[],
    dto: { statusId?: string; assignedTo?: string[] },
    userId: string,
    userRole: string,
  ): Promise<{ updated: number }> {
    let updated = 0;
    for (const id of leadIds) {
      if (!id?.trim()) continue;
      try {
        await this.update(id.trim(), dto, userId, userRole);
        updated++;
      } catch {
        // skip leads user cannot edit or not found
      }
    }
    return { updated };
  }

  async delete(id: string, userId: string, userRole: string): Promise<void> {
    const doc = await this.leadModel.findById(id).lean().exec();
    if (!doc) throw new NotFoundException('Lead not found');
    const item = this.toItem(doc);
    const can = await this.canEditLead(item, userId, userRole);
    if (!can) throw new ForbiddenException('You cannot delete this lead');
    await this.leadModel.findByIdAndDelete(id).exec();
  }

  /** Bulk delete: only deletes leads user can edit; returns count of deleted */
  async bulkDelete(leadIds: string[], userId: string, userRole: string): Promise<{ deleted: number }> {
    let deleted = 0;
    for (const id of leadIds) {
      try {
        const doc = await this.leadModel.findById(id).lean().exec();
        if (!doc) continue;
        const item = this.toItem(doc);
        const can = await this.canEditLead(item, userId, userRole);
        if (!can) continue;
        await this.leadModel.findByIdAndDelete(id).exec();
        deleted += 1;
      } catch {
        // skip
      }
    }
    return { deleted };
  }

  async getNotes(leadId: string, userId: string, userRole: string): Promise<LeadNoteItem[]> {
    const lead = await this.leadModel.findById(leadId).lean().exec();
    if (!lead) throw new NotFoundException('Lead not found');
    const item = this.toItem(lead);
    const can = await this.canEditLead(item, userId, userRole);
    if (!can) throw new ForbiddenException('You cannot view this lead');
    const notes = await this.leadNoteModel.find({ leadId: new Types.ObjectId(leadId) }).sort({ createdAt: 1 }).lean().exec();
    return notes.map((n: any) => ({
      _id: String(n._id),
      leadId: String(n.leadId),
      authorId: String(n.authorId),
      content: n.content ?? '',
      createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : '',
      updatedAt: n.updatedAt ? new Date(n.updatedAt).toISOString() : '',
    }));
  }

  async addNote(leadId: string, content: string, userId: string, userRole: string): Promise<LeadNoteItem> {
    const lead = await this.leadModel.findById(leadId).lean().exec();
    if (!lead) throw new NotFoundException('Lead not found');
    const item = this.toItem(lead);
    const can = await this.canEditLead(item, userId, userRole);
    if (!can) throw new ForbiddenException('You cannot add notes to this lead');
    const trimmed = (content ?? '').trim();
    if (!trimmed) throw new BadRequestException('Текст заметки не может быть пустым');
    const doc = await this.leadNoteModel.create({
      leadId: new Types.ObjectId(leadId),
      authorId: new Types.ObjectId(userId),
      content: trimmed,
    });
    const docObj = doc as any;
    const noteItem = {
      _id: String(doc._id),
      leadId: String(doc.leadId),
      authorId: String(doc.authorId),
      content: doc.content,
      createdAt: docObj.createdAt ? new Date(docObj.createdAt).toISOString() : '',
      updatedAt: docObj.updatedAt ? new Date(docObj.updatedAt).toISOString() : '',
    };
    await this.addHistory(leadId, 'note_added', userId, { noteId: noteItem._id, content: trimmed });
    return noteItem;
  }

  async updateNote(leadId: string, noteId: string, content: string, userId: string, userRole: string): Promise<LeadNoteItem> {
    const lead = await this.leadModel.findById(leadId).lean().exec();
    if (!lead) throw new NotFoundException('Lead not found');
    const item = this.toItem(lead);
    const can = await this.canEditLead(item, userId, userRole);
    if (!can) throw new ForbiddenException('You cannot edit notes of this lead');
    const doc = await this.leadNoteModel.findOne({ _id: new Types.ObjectId(noteId), leadId: new Types.ObjectId(leadId) }).exec();
    if (!doc) throw new NotFoundException('Note not found');
    const isManager = userRole === 'super' || userRole === 'admin' || userRole === 'manager';
    if (!isManager && String(doc.authorId) !== String(userId)) {
      throw new ForbiddenException('Сотрудник может редактировать только свои заметки');
    }
    const trimmed = (content ?? '').trim();
    if (!trimmed) throw new BadRequestException('Текст заметки не может быть пустым');
    doc.content = trimmed;
    await doc.save();
    await this.addHistory(leadId, 'note_edited', userId, { noteId, content: trimmed });
    const docObj = doc as any;
    return {
      _id: String(doc._id),
      leadId: String(doc.leadId),
      authorId: String(doc.authorId),
      content: doc.content,
      createdAt: docObj.createdAt ? new Date(docObj.createdAt).toISOString() : '',
      updatedAt: docObj.updatedAt ? new Date(docObj.updatedAt).toISOString() : '',
    };
  }

  async deleteNote(leadId: string, noteId: string, userId: string, userRole: string): Promise<void> {
    const lead = await this.leadModel.findById(leadId).lean().exec();
    if (!lead) throw new NotFoundException('Lead not found');
    const item = this.toItem(lead);
    const can = await this.canEditLead(item, userId, userRole);
    if (!can) throw new ForbiddenException('You cannot delete notes of this lead');
    const doc = await this.leadNoteModel.findOne({ _id: new Types.ObjectId(noteId), leadId: new Types.ObjectId(leadId) }).exec();
    if (!doc) throw new NotFoundException('Note not found');
    const isManager = userRole === 'super' || userRole === 'admin' || userRole === 'manager';
    if (!isManager && String(doc.authorId) !== String(userId)) {
      throw new ForbiddenException('Сотрудник может удалять только свои заметки');
    }
    await this.leadNoteModel.findByIdAndDelete(noteId).exec();
    await this.addHistory(leadId, 'note_deleted', userId, { noteId });
  }

  private toTaskItem(doc: any): LeadTaskItem {
    const d = doc as any;
    return {
      _id: String(d._id),
      leadId: String(d.leadId),
      title: d.title ?? '',
      dueAt: d.dueAt ? new Date(d.dueAt).toISOString() : null,
      completed: Boolean(d.completed),
      createdBy: String(d.createdBy),
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : '',
      updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : '',
    };
  }

  private toReminderItem(doc: any): LeadReminderItem {
    const d = doc as any;
    return {
      _id: String(d._id),
      leadId: String(d.leadId),
      title: d.title ?? '',
      remindAt: d.remindAt ? new Date(d.remindAt).toISOString() : '',
      done: Boolean(d.done),
      createdBy: String(d.createdBy),
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : '',
      updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : '',
    };
  }

  async getTasks(leadId: string, userId: string, userRole: string): Promise<LeadTaskItem[]> {
    const lead = await this.leadModel.findById(leadId).lean().exec();
    if (!lead) throw new NotFoundException('Lead not found');
    const item = this.toItem(lead);
    const can = await this.canEditLead(item, userId, userRole);
    if (!can) throw new ForbiddenException('You cannot view this lead');
    const list = await this.leadTaskModel.find({ leadId: new Types.ObjectId(leadId) }).sort({ createdAt: 1 }).lean().exec();
    return list.map((t: any) => this.toTaskItem(t));
  }

  async addTask(
    leadId: string,
    payload: { title: string; dueAt?: string | null },
    userId: string,
    userRole: string,
  ): Promise<LeadTaskItem> {
    const lead = await this.leadModel.findById(leadId).lean().exec();
    if (!lead) throw new NotFoundException('Lead not found');
    const item = this.toItem(lead);
    const can = await this.canEditLead(item, userId, userRole);
    if (!can) throw new ForbiddenException('You cannot add tasks to this lead');
    const title = (payload.title ?? '').trim();
    if (!title) throw new BadRequestException('Название задачи не может быть пустым');
    const dueAt = payload.dueAt ? new Date(payload.dueAt) : null;
    if (dueAt && isNaN(dueAt.getTime())) throw new BadRequestException('Некорректная дата дедлайна');
    const doc = await this.leadTaskModel.create({
      leadId: new Types.ObjectId(leadId),
      title,
      dueAt,
      completed: false,
      createdBy: new Types.ObjectId(userId),
    });
    const taskItem = this.toTaskItem(doc);
    await this.addHistory(leadId, 'task_added', userId, {
      taskId: taskItem._id,
      title: taskItem.title,
      dueAt: taskItem.dueAt,
    });
    return taskItem;
  }

  async updateTask(
    leadId: string,
    taskId: string,
    payload: { title?: string; dueAt?: string | null; completed?: boolean },
    userId: string,
    userRole: string,
  ): Promise<LeadTaskItem> {
    const lead = await this.leadModel.findById(leadId).lean().exec();
    if (!lead) throw new NotFoundException('Lead not found');
    const item = this.toItem(lead);
    const can = await this.canEditLead(item, userId, userRole);
    if (!can) throw new ForbiddenException('You cannot edit tasks of this lead');
    const doc = await this.leadTaskModel.findOne({ _id: new Types.ObjectId(taskId), leadId: new Types.ObjectId(leadId) }).exec();
    if (!doc) throw new NotFoundException('Task not found');
    if (payload.title !== undefined) doc.title = (payload.title ?? '').trim() || doc.title;
    if (payload.dueAt !== undefined) doc.dueAt = payload.dueAt ? new Date(payload.dueAt) : null;
    if (payload.completed !== undefined) doc.completed = Boolean(payload.completed);
    await doc.save();
    const taskItem = this.toTaskItem(doc);
    await this.addHistory(leadId, 'task_updated', userId, {
      taskId: taskItem._id,
      title: taskItem.title,
      dueAt: taskItem.dueAt,
      completed: taskItem.completed,
    });
    return taskItem;
  }

  async deleteTask(leadId: string, taskId: string, userId: string, userRole: string): Promise<void> {
    const lead = await this.leadModel.findById(leadId).lean().exec();
    if (!lead) throw new NotFoundException('Lead not found');
    const item = this.toItem(lead);
    const can = await this.canEditLead(item, userId, userRole);
    if (!can) throw new ForbiddenException('You cannot delete tasks of this lead');
    const doc = await this.leadTaskModel.findOne({ _id: new Types.ObjectId(taskId), leadId: new Types.ObjectId(leadId) }).exec();
    if (!doc) throw new NotFoundException('Task not found');
    const title = (doc as any).title;
    await this.leadTaskModel.findByIdAndDelete(taskId).exec();
    await this.addHistory(leadId, 'task_deleted', userId, { taskId, title });
  }

  async getReminders(leadId: string, userId: string, userRole: string): Promise<LeadReminderItem[]> {
    const lead = await this.leadModel.findById(leadId).lean().exec();
    if (!lead) throw new NotFoundException('Lead not found');
    const item = this.toItem(lead);
    const can = await this.canEditLead(item, userId, userRole);
    if (!can) throw new ForbiddenException('You cannot view this lead');
    const list = await this.leadReminderModel.find({ leadId: new Types.ObjectId(leadId) }).sort({ remindAt: 1 }).lean().exec();
    return list.map((r: any) => this.toReminderItem(r));
  }

  async addReminder(
    leadId: string,
    payload: { title: string; remindAt: string },
    userId: string,
    userRole: string,
  ): Promise<LeadReminderItem> {
    const lead = await this.leadModel.findById(leadId).lean().exec();
    if (!lead) throw new NotFoundException('Lead not found');
    const item = this.toItem(lead);
    const can = await this.canEditLead(item, userId, userRole);
    if (!can) throw new ForbiddenException('You cannot add reminders to this lead');
    const title = (payload.title ?? '').trim();
    if (!title) throw new BadRequestException('Текст напоминания не может быть пустым');
    const remindAt = new Date(payload.remindAt);
    if (isNaN(remindAt.getTime())) throw new BadRequestException('Некорректная дата напоминания');
    const doc = await this.leadReminderModel.create({
      leadId: new Types.ObjectId(leadId),
      title,
      remindAt,
      done: false,
      createdBy: new Types.ObjectId(userId),
    });
    const reminderItem = this.toReminderItem(doc);
    await this.addHistory(leadId, 'reminder_added', userId, {
      reminderId: reminderItem._id,
      title: reminderItem.title,
      remindAt: reminderItem.remindAt,
    });
    return reminderItem;
  }

  async markReminderDone(leadId: string, reminderId: string, userId: string, userRole: string): Promise<LeadReminderItem> {
    const lead = await this.leadModel.findById(leadId).lean().exec();
    if (!lead) throw new NotFoundException('Lead not found');
    const item = this.toItem(lead);
    const can = await this.canEditLead(item, userId, userRole);
    if (!can) throw new ForbiddenException('You cannot edit reminders of this lead');
    const doc = await this.leadReminderModel.findOne({ _id: new Types.ObjectId(reminderId), leadId: new Types.ObjectId(leadId) }).exec();
    if (!doc) throw new NotFoundException('Reminder not found');
    doc.done = true;
    await doc.save();
    const reminderItem = this.toReminderItem(doc);
    await this.addHistory(leadId, 'reminder_done', userId, {
      reminderId: reminderItem._id,
      title: reminderItem.title,
    });
    return reminderItem;
  }

  async deleteReminder(leadId: string, reminderId: string, userId: string, userRole: string): Promise<void> {
    const lead = await this.leadModel.findById(leadId).lean().exec();
    if (!lead) throw new NotFoundException('Lead not found');
    const item = this.toItem(lead);
    const can = await this.canEditLead(item, userId, userRole);
    if (!can) throw new ForbiddenException('You cannot delete reminders of this lead');
    const doc = await this.leadReminderModel.findOne({ _id: new Types.ObjectId(reminderId), leadId: new Types.ObjectId(leadId) }).exec();
    if (!doc) throw new NotFoundException('Reminder not found');
    const title = (doc as any).title;
    await this.leadReminderModel.findByIdAndDelete(reminderId).exec();
    await this.addHistory(leadId, 'reminder_deleted', userId, { reminderId, title });
  }

  /** Напоминания по всем лидам пользователя (для колокольчика в шапке): не выполненные, на ближайшие 24ч или просроченные */
  async getUpcomingReminders(userId: string, userRole: string): Promise<(LeadReminderItem & { leadName?: string })[]> {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const list = await this.leadReminderModel
      .find({ done: false, remindAt: { $lte: tomorrow } })
      .sort({ remindAt: 1 })
      .limit(50)
      .lean()
      .exec();
    const leadIds = [...new Set(list.map((r: any) => String(r.leadId)))];
    const leads = await this.leadModel.find({ _id: { $in: leadIds.map((id) => new Types.ObjectId(id)) } }).lean().exec();
    const leadMap = new Map(leads.map((l: any) => [String(l._id), l]));
    const result: (LeadReminderItem & { leadName?: string })[] = [];
    for (const r of list) {
      const item = this.toReminderItem(r);
      const lead = leadMap.get(String((r as any).leadId));
      const leadItem = lead ? this.toItem(lead) : null;
      const can = leadItem ? await this.canViewDepartment(leadItem.departmentId, userId, userRole) : false;
      if (can) {
        result.push({ ...item, leadName: (lead as any)?.name });
      }
    }
    return result;
  }

  /** Статистика по статусам: руководитель и сотрудники, лиды по каждому статусу. Доступ: super, admin, manager (свой отдел). */
  async getStats(
    departmentId: string,
    userId: string,
    userRole: string,
    filters?: { dateFrom?: string; dateTo?: string; statusId?: string },
  ): Promise<LeadStatsResult> {
    const can = await this.canViewDepartment(departmentId, userId, userRole);
    if (!can) throw new ForbiddenException('Access denied to this department');
    if (userRole === 'manager') {
      const canManage = await this.canManageDepartment(departmentId, userId, userRole);
      if (!canManage) throw new ForbiddenException('Статистика отдела доступна только руководителю этого отдела');
    }

    const department = await this.departmentService.findById(departmentId);
    if (!department) throw new NotFoundException('Department not found');

    const statuses = await this.statusService.findByDepartment(departmentId);
    const statusMap = new Map(statuses.map((s) => [s._id, s]));

    const query: Record<string, unknown> = { departmentId: new Types.ObjectId(departmentId) };
    if (filters?.dateFrom?.trim() || filters?.dateTo?.trim()) {
      const from = filters.dateFrom?.trim()
        ? new Date(filters.dateFrom.trim() + 'T00:00:00.000Z')
        : null;
      const to = filters.dateTo?.trim()
        ? new Date(filters.dateTo.trim() + 'T23:59:59.999Z')
        : null;
      if (from && to && !isNaN(from.getTime()) && !isNaN(to.getTime())) {
        query.createdAt = { $gte: from, $lte: to };
      } else if (from && !isNaN(from.getTime())) {
        query.createdAt = { $gte: from };
      } else if (to && !isNaN(to.getTime())) {
        query.createdAt = { $lte: to };
      }
    }
    if (filters?.statusId?.trim()) {
      query.statusId = new Types.ObjectId(filters.statusId.trim());
    }

    const assigneeIds: string[] = [];
    if (department.managerId) assigneeIds.push(department.managerId);
    (department.employees || []).forEach((e) => assigneeIds.push(e._id));

    const agg = await this.leadModel
      .aggregate([
        { $match: query },
        { $unwind: '$assignedTo' },
        { $match: { assignedTo: { $in: assigneeIds.map((id) => new Types.ObjectId(id)) } } },
        {
          $group: {
            _id: { assigneeId: '$assignedTo', statusId: '$statusId' },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    const countByAssigneeAndStatus = new Map<string, Map<string, number>>();
    for (const r of agg) {
      const assigneeId = String(r._id.assigneeId);
      const statusId = r._id.statusId ? String(r._id.statusId) : '';
      if (!countByAssigneeAndStatus.has(assigneeId)) {
        countByAssigneeAndStatus.set(assigneeId, new Map());
      }
      countByAssigneeAndStatus.get(assigneeId)!.set(statusId, r.count);
    }

    const rows: LeadStatsByStatusRow[] = [];
    const managerId = department.managerId ? String(department.managerId) : null;
    if (managerId) {
      const byStatus = statuses.map((s) => ({
        statusId: s._id,
        statusName: s.name,
        count: countByAssigneeAndStatus.get(managerId)?.get(s._id) ?? 0,
      }));
      const total = byStatus.reduce((sum, x) => sum + x.count, 0);
      const managerName =
        department.manager?.firstName || department.manager?.lastName
          ? [department.manager.firstName, department.manager.lastName].filter(Boolean).join(' ').trim()
          : department.manager?.email ?? 'Руководитель';
      rows.push({
        assigneeId: managerId,
        assigneeName: managerName,
        isManager: true,
        byStatus,
        total,
      });
    }
    const seenIds = new Set<string>();
    if (managerId) seenIds.add(managerId);
    for (const emp of department.employees || []) {
      const eid = emp._id;
      if (seenIds.has(eid)) continue;
      seenIds.add(eid);
      const byStatus = statuses.map((s) => ({
        statusId: s._id,
        statusName: s.name,
        count: countByAssigneeAndStatus.get(eid)?.get(s._id) ?? 0,
      }));
      const total = byStatus.reduce((sum, x) => sum + x.count, 0);
      const name = [emp.firstName, emp.lastName].filter(Boolean).join(' ').trim() || emp.email || eid;
      rows.push({
        assigneeId: eid,
        assigneeName: name,
        isManager: false,
        byStatus,
        total,
      });
    }

    return {
      departmentId,
      departmentName: department.name,
      statuses: statuses.map((s) => ({ _id: s._id, name: s.name, order: s.order })),
      rows,
      filters: filters
        ? {
            dateFrom: filters.dateFrom?.trim(),
            dateTo: filters.dateTo?.trim(),
            statusId: filters.statusId?.trim(),
          }
        : undefined,
    };
  }

  /** Department IDs the current user is allowed to view (for cross-department queries). */
  private async getAllowedDepartmentIds(userId: string, role: string): Promise<string[]> {
    if (role === 'super' || role === 'admin') {
      const list = await this.departmentService.findAll();
      return list.map((d) => d._id);
    }
    if (role === 'manager') {
      const list = await this.departmentService.findByManagerId(userId);
      return list.map((d) => d._id);
    }
    const profile = await this.userService.findById(userId);
    if (profile?.departmentId) return [profile.departmentId];
    return [];
  }

  /** Лиды, назначенные на пользователя (assignee). Только из отделов, к которым есть доступ у текущего пользователя. */
  async findLeadsAssignedToUser(
    assigneeUserId: string,
    currentUserId: string,
    currentUserRole: string,
    skip: number = 0,
    limit: number = 50,
    filters?: { name?: string; phone?: string; email?: string; statusId?: string; departmentId?: string },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' },
  ): Promise<LeadListResult> {
    const deptIds = await this.getAllowedDepartmentIds(currentUserId, currentUserRole);
    if (deptIds.length === 0) return { items: [], total: 0, skip, limit };

    const objectIds = deptIds.map((id) => new Types.ObjectId(id));
    const assigneeId = new Types.ObjectId(assigneeUserId);
    const query: Record<string, unknown> = {
      departmentId: { $in: objectIds },
      assignedTo: assigneeId,
    };
    if (filters?.name?.trim()) query.name = new RegExp(this.escapeRegex(filters.name.trim()), 'i');
    if (filters?.phone?.trim()) query.phone = new RegExp(this.escapeRegex(filters.phone.trim()), 'i');
    if (filters?.email?.trim()) query.email = new RegExp(this.escapeRegex(filters.email.trim()), 'i');
    if (filters?.statusId?.trim()) query.statusId = new Types.ObjectId(filters.statusId.trim());
    if (filters?.departmentId?.trim()) query.departmentId = new Types.ObjectId(filters.departmentId.trim());

    const sortBy = sort?.sortBy?.trim() || 'createdAt';
    const sortOrder = sort?.sortOrder === 'asc' ? 1 : -1;
    const allowedSortFields = ['name', 'phone', 'email', 'createdAt', 'statusId'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOpt = { [sortField]: sortOrder };

    const [rawItems, total] = await Promise.all([
      this.leadModel.find(query).sort(sortOpt as any).skip(skip).limit(Math.min(limit, 100)).lean().exec(),
      this.leadModel.countDocuments(query).exec(),
    ]);
    const items = rawItems.map((d: any) => this.toItem(d));
    const deptIdsUnique = [...new Set(items.map((i) => i.departmentId))];
    const statusIdsUnique = [...new Set(items.map((i) => i.statusId).filter((id): id is string => Boolean(id)))];
    const [deptList, statusLists] = await Promise.all([
      deptIdsUnique.length > 0 ? Promise.all(deptIdsUnique.map((did) => this.departmentService.findById(did))) : [],
      deptIdsUnique.length > 0 ? Promise.all(deptIdsUnique.map((did) => this.statusService.findByDepartment(did))) : [],
    ]);
    const deptNames = new Map((deptList.filter((d) => d != null) as DepartmentDetail[]).map((d: DepartmentDetail) => [d._id, d.name]));
    const statusNames = new Map(statusLists.flat().map((s) => [s._id, s.name ?? 'Без статуса']));
    const itemsWithMeta = items.map((i) => ({
      ...i,
      statusName: i.statusId ? statusNames.get(i.statusId) ?? 'Без статуса' : 'Без статуса',
      departmentName: deptNames.get(i.departmentId) ?? '',
    }));
    return { items: itemsWithMeta, total, skip, limit };
  }

  /** Статистика по лидам пользователя (по статусам + за период). */
  async getLeadStatsForUser(
    assigneeUserId: string,
    currentUserId: string,
    currentUserRole: string,
    days: number = 14,
  ): Promise<UserLeadStatsResult> {
    const deptIds = await this.getAllowedDepartmentIds(currentUserId, currentUserRole);
    if (deptIds.length === 0) return { total: 0, byStatus: [], overTime: [] };

    const objectIds = deptIds.map((id) => new Types.ObjectId(id));
    const assigneeId = new Types.ObjectId(assigneeUserId);
    const match = { departmentId: { $in: objectIds }, assignedTo: assigneeId };

    const [total, aggStatus, aggOverTime] = await Promise.all([
      this.leadModel.countDocuments(match).exec(),
      this.leadModel.aggregate([{ $match: match }, { $group: { _id: '$statusId', count: { $sum: 1 } } }]).exec(),
      (() => {
        const from = new Date();
        from.setDate(from.getDate() - days);
        from.setUTCHours(0, 0, 0, 0);
        return this.leadModel
          .aggregate([
            { $match: { ...match, createdAt: { $gte: from } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ])
          .exec();
      })(),
    ]);

    const allStatuses = await Promise.all(deptIds.map((did) => this.statusService.findByDepartment(did)));
    const statusMap = new Map<string, string>();
    allStatuses.flat().forEach((s) => statusMap.set(s._id, s.name));
    const byStatus = aggStatus.map((r) => ({
      statusId: r._id ? String(r._id) : '',
      statusName: r._id ? (statusMap.get(String(r._id)) ?? 'Без статуса') : 'Без статуса',
      count: Number(r.count),
    }));

    const overTimeMap = new Map((aggOverTime as any[]).map((r) => [r._id, r.count]));
    const overTime: { date: string; count: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      d.setUTCHours(0, 0, 0, 0);
      const dateStr = d.toISOString().slice(0, 10);
      overTime.push({ date: dateStr, count: overTimeMap.get(dateStr) ?? 0 });
    }
    return { total, byStatus, overTime };
  }

  /** Список лидов для экспорта (с фильтрами). Только super, admin, manager. */
  async getLeadsForExport(
    departmentId: string,
    userId: string,
    userRole: string,
    filters?: { dateFrom?: string; dateTo?: string; statusId?: string; assignedTo?: string },
  ): Promise<LeadItem[]> {
    if (userRole !== 'super' && userRole !== 'admin' && userRole !== 'manager') {
      throw new ForbiddenException('Экспорт доступен только руководителям, админам и супер-админу');
    }
    const can = await this.canViewDepartment(departmentId, userId, userRole);
    if (!can) throw new ForbiddenException('Access denied to this department');
    if (userRole === 'manager') {
      const canManage = await this.canManageDepartment(departmentId, userId, userRole);
      if (!canManage) throw new ForbiddenException('Экспорт отдела доступен только руководителю этого отдела');
    }

    const query: Record<string, unknown> = { departmentId: new Types.ObjectId(departmentId) };
    if (filters?.dateFrom?.trim() || filters?.dateTo?.trim()) {
      const from = filters.dateFrom?.trim()
        ? new Date(filters.dateFrom.trim() + 'T00:00:00.000Z')
        : null;
      const to = filters.dateTo?.trim()
        ? new Date(filters.dateTo.trim() + 'T23:59:59.999Z')
        : null;
      if (from && to && !isNaN(from.getTime()) && !isNaN(to.getTime())) {
        query.createdAt = { $gte: from, $lte: to };
      } else if (from && !isNaN(from.getTime())) {
        query.createdAt = { $gte: from };
      } else if (to && !isNaN(to.getTime())) {
        query.createdAt = { $lte: to };
      }
    }
    if (filters?.statusId?.trim()) {
      query.statusId = new Types.ObjectId(filters.statusId.trim());
    }
    if (filters?.assignedTo?.trim()) {
      query.assignedTo = new Types.ObjectId(filters.assignedTo.trim());
    }

    const list = await this.leadModel.find(query).sort({ createdAt: -1 }).limit(10000).lean().exec();
    return list.map((d: any) => this.toItem(d));
  }

  async getHistory(leadId: string, userId: string, userRole: string): Promise<LeadHistoryItem[]> {
    const lead = await this.leadModel.findById(leadId).lean().exec();
    if (!lead) throw new NotFoundException('Lead not found');
    const item = this.toItem(lead);
    const can = await this.canEditLead(item, userId, userRole);
    if (!can) throw new ForbiddenException('You cannot view this lead');
    const list = await this.leadHistoryModel.find({ leadId: new Types.ObjectId(leadId) }).sort({ createdAt: 1 }).lean().exec();
    const userIds = [...new Set(list.map((h: any) => String(h.userId)))];
    const userMap = new Map<string, string>();
    await Promise.all(
      userIds.map(async (uid) => {
        const u = await this.userService.findById(uid);
        if (u) {
          const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
          userMap.set(uid, name || u.email || uid);
        }
      }),
    );
    return list.map((h: any) => ({
      _id: String(h._id),
      leadId: String(h.leadId),
      action: h.action,
      userId: String(h.userId),
      userDisplayName: userMap.get(String(h.userId)),
      meta: h.meta ?? {},
      createdAt: h.createdAt ? new Date(h.createdAt).toISOString() : '',
    }));
  }

  private toItem(d: any): LeadItem {
    const sm = d.sourceMeta;
    const sourceMeta: LeadSourceMetaItem | undefined =
      sm && typeof sm === 'object'
        ? {
            ip: sm.ip ? String(sm.ip).trim() : undefined,
            userAgent: sm.userAgent ? String(sm.userAgent).trim() : undefined,
            referrer: sm.referrer ? String(sm.referrer).trim() : undefined,
            screen: sm.screen ? String(sm.screen).trim() : undefined,
            language: sm.language ? String(sm.language).trim() : undefined,
            platform: sm.platform ? String(sm.platform).trim() : undefined,
            timezone: sm.timezone ? String(sm.timezone).trim() : undefined,
            deviceMemory: sm.deviceMemory ? String(sm.deviceMemory).trim() : undefined,
            hardwareConcurrency: sm.hardwareConcurrency ? String(sm.hardwareConcurrency).trim() : undefined,
            extra: sm.extra && typeof sm.extra === 'object' ? sm.extra : undefined,
          }
        : undefined;
    return {
      _id: String(d._id),
      name: d.name ?? '',
      lastName: d.lastName ?? '',
      phone: d.phone ?? '',
      email: d.email ?? '',
      departmentId: String(d.departmentId),
      statusId: d.statusId ? String(d.statusId) : null,
      source: d.source ?? 'manual',
      siteId: d.siteId ? String(d.siteId) : null,
      sourceMeta: sourceMeta && Object.values(sourceMeta).some((v) => v !== undefined && v !== null) ? sourceMeta : undefined,
      createdBy: String(d.createdBy),
      assignedTo: (d.assignedTo || []).map((id: any) => String(id)),
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : '',
      updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : '',
    };
  }
}
