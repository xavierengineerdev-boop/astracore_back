import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lead, LeadDocument } from '../lead/lead.schema';
import { Status, StatusDocument } from '../status/status.schema';
import { LeadReminder, LeadReminderDocument } from '../lead/lead-reminder.schema';
import { LeadTask, LeadTaskDocument } from '../lead/lead-task.schema';
import { DepartmentService } from '../department/department.service';
import { UserService } from '../user/user.service';

export type DashboardSummary = {
  usersCount: number;
  departmentsCount: number;
  leadsCount: number;
};

export type DashboardLeadsByStatusItem = {
  statusId: string;
  statusName: string;
  count: number;
};

export type DashboardLeadsOverTimeItem = {
  date: string; // YYYY-MM-DD
  count: number;
};

export type DashboardRecentLeadItem = {
  _id: string;
  name: string;
  lastName: string;
  statusName: string;
  departmentName: string;
  createdAt: string;
};

export type DashboardDepartmentSummaryItem = {
  departmentId: string;
  departmentName: string;
  leadsCount: number;
};

export type DashboardTopAssigneeItem = {
  assigneeId: string;
  assigneeName: string;
  leadsCount: number;
};

export type DashboardAttentionCounts = {
  leadsWithoutStatus: number;
  leadsUnassigned: number;
};

export type DashboardWeekEventItem = {
  type: 'reminder' | 'task';
  id: string;
  leadId: string;
  leadName?: string;
  title: string;
  date: string; // YYYY-MM-DD
  dateTime?: string; // ISO for display
};

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    @InjectModel(Status.name) private statusModel: Model<StatusDocument>,
    @InjectModel(LeadReminder.name) private leadReminderModel: Model<LeadReminderDocument>,
    @InjectModel(LeadTask.name) private leadTaskModel: Model<LeadTaskDocument>,
    private departmentService: DepartmentService,
    private userService: UserService,
  ) {}

  /** Returns department IDs the user is allowed to see (for dashboard scope). */
  private async getAllowedDepartmentIds(userId: string, role: string): Promise<string[]> {
    if (role === 'super' || role === 'admin') {
      const list = await this.departmentService.findAll();
      return list.map((d) => d._id);
    }
    if (role === 'manager') {
      const list = await this.departmentService.findByManagerId(userId);
      return list.map((d) => d._id);
    }
    // employee or other: only their department if set
    const profile = await this.userService.findById(userId);
    if (profile?.departmentId) return [profile.departmentId];
    return [];
  }

  async getSummary(userId: string, role: string): Promise<DashboardSummary> {
    const deptIds = await this.getAllowedDepartmentIds(userId, role);
    const objectIds = deptIds.map((id) => new Types.ObjectId(id));

    let usersCount: number;
    let departmentsCount: number;

    if (role === 'super' || role === 'admin') {
      usersCount = await this.userService.findAll().then((u) => u.length);
      departmentsCount = (await this.departmentService.findAll()).length;
    } else {
      const allUsers = await this.userService.findAll();
      usersCount = allUsers.filter((u) => u.departmentId && deptIds.includes(u.departmentId)).length;
      departmentsCount = deptIds.length;
    }

    let leadsCount = 0;
    if (objectIds.length > 0) {
      leadsCount = await this.leadModel.countDocuments({ departmentId: { $in: objectIds } }).exec();
    }

    return { usersCount, departmentsCount, leadsCount };
  }

  async getLeadsByStatus(userId: string, role: string): Promise<DashboardLeadsByStatusItem[]> {
    const deptIds = await this.getAllowedDepartmentIds(userId, role);
    if (deptIds.length === 0) return [];

    const objectIds = deptIds.map((id) => new Types.ObjectId(id));
    const agg = await this.leadModel
      .aggregate([
        { $match: { departmentId: { $in: objectIds } } },
        { $group: { _id: '$statusId', count: { $sum: 1 } } },
      ])
      .exec();

    const statusIds = agg.map((r) => r._id).filter((id) => id != null) as Types.ObjectId[];
    const statusList =
      statusIds.length > 0
        ? await this.statusModel.find({ _id: { $in: statusIds } }).lean().exec()
        : [];
    const statusMap = new Map<string, string>(
      (statusList as any).map((s: any) => [String(s._id), String(s.name ?? 'Без статуса')]),
    );

    const result: DashboardLeadsByStatusItem[] = [];
    for (const r of agg) {
      const statusId = r._id ? String(r._id) : '';
      const statusName = statusId ? (statusMap.get(statusId) ?? 'Без статуса') : 'Без статуса';
      result.push({ statusId, statusName, count: Number(r.count) });
    }
    return result;
  }

  async getLeadsOverTime(userId: string, role: string, days: number = 14): Promise<DashboardLeadsOverTimeItem[]> {
    const deptIds = await this.getAllowedDepartmentIds(userId, role);
    if (deptIds.length === 0) return [];

    const objectIds = deptIds.map((id) => new Types.ObjectId(id));
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setUTCHours(0, 0, 0, 0);

    const agg = await this.leadModel
      .aggregate([
        { $match: { departmentId: { $in: objectIds }, createdAt: { $gte: from } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .exec();

    const map = new Map<string, number>(agg.map((r) => [r._id, r.count]));
    const result: DashboardLeadsOverTimeItem[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      d.setUTCHours(0, 0, 0, 0);
      const dateStr = d.toISOString().slice(0, 10);
      result.push({ date: dateStr, count: map.get(dateStr) ?? 0 });
    }
    return result;
  }

  async getRecentLeads(userId: string, role: string, limit: number = 10): Promise<DashboardRecentLeadItem[]> {
    const deptIds = await this.getAllowedDepartmentIds(userId, role);
    if (deptIds.length === 0) return [];
    const objectIds = deptIds.map((id) => new Types.ObjectId(id));
    const list = await this.leadModel
      .find({ departmentId: { $in: objectIds } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    const statusIds = [...new Set((list as any[]).map((l) => l.statusId).filter(Boolean))];
    const statusList = statusIds.length > 0 ? await this.statusModel.find({ _id: { $in: statusIds } }).lean().exec() : [];
    const statusMap = new Map((statusList as any[]).map((s: any) => [String(s._id), s.name ?? 'Без статуса']));
    const deptList = await this.departmentService.findAll();
    const deptMap = new Map(deptList.map((d) => [d._id, d.name]));
    return (list as any[]).map((l) => ({
      _id: String(l._id),
      name: l.name ?? '',
      lastName: l.lastName ?? '',
      statusName: l.statusId ? statusMap.get(String(l.statusId)) ?? 'Без статуса' : 'Без статуса',
      departmentName: deptMap.get(String(l.departmentId)) ?? '',
      createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : '',
    }));
  }

  async getDepartmentsSummary(userId: string, role: string): Promise<DashboardDepartmentSummaryItem[]> {
    const deptIds = await this.getAllowedDepartmentIds(userId, role);
    if (deptIds.length === 0) return [];
    const deptList = await this.departmentService.findAll();
    const allowed = deptList.filter((d) => deptIds.includes(d._id));
    const objectIds = allowed.map((d) => new Types.ObjectId(d._id));
    const counts = await this.leadModel.aggregate([{ $match: { departmentId: { $in: objectIds } } }, { $group: { _id: '$departmentId', count: { $sum: 1 } } }]).exec();
    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
    return allowed.map((d) => ({ departmentId: d._id, departmentName: d.name, leadsCount: countMap.get(d._id) ?? 0 }));
  }

  async getTopAssignees(userId: string, role: string, limit: number = 5): Promise<DashboardTopAssigneeItem[]> {
    const deptIds = await this.getAllowedDepartmentIds(userId, role);
    if (deptIds.length === 0) return [];
    const objectIds = deptIds.map((id) => new Types.ObjectId(id));
    const agg = await this.leadModel
      .aggregate([
        { $match: { departmentId: { $in: objectIds } } },
        { $unwind: '$assignedTo' },
        { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
      ])
      .exec();
    const userIds = agg.map((r) => String(r._id));
    const users = await this.userService.findAll();
    const userMap = new Map(users.map((u) => [u._id, [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email || u._id]));
    return agg.map((r) => ({ assigneeId: String(r._id), assigneeName: userMap.get(String(r._id)) ?? String(r._id), leadsCount: r.count }));
  }

  async getAttentionCounts(userId: string, role: string): Promise<DashboardAttentionCounts> {
    const deptIds = await this.getAllowedDepartmentIds(userId, role);
    if (deptIds.length === 0) return { leadsWithoutStatus: 0, leadsUnassigned: 0 };
    const objectIds = deptIds.map((id) => new Types.ObjectId(id));
    const [withoutStatus, unassigned] = await Promise.all([
      this.leadModel.countDocuments({ departmentId: { $in: objectIds }, $or: [{ statusId: null }, { statusId: { $exists: false } }] }).exec(),
      this.leadModel.countDocuments({ departmentId: { $in: objectIds }, $or: [{ assignedTo: { $size: 0 } }, { assignedTo: [] }] }).exec(),
    ]);
    return { leadsWithoutStatus: withoutStatus, leadsUnassigned: unassigned };
  }

  async getWeekEvents(userId: string, role: string): Promise<DashboardWeekEventItem[]> {
    const deptIds = await this.getAllowedDepartmentIds(userId, role);
    if (deptIds.length === 0) return [];
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    startOfWeek.setUTCHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setUTCHours(23, 59, 59, 999);
    const leadIds = await this.leadModel.find({ departmentId: { $in: deptIds.map((id) => new Types.ObjectId(id)) } }).select('_id').lean().exec();
    const leadIdSet = new Set(leadIds.map((l: any) => String(l._id)));
    const [reminders, tasks] = await Promise.all([
      this.leadReminderModel
        .find({ leadId: { $in: leadIds.map((l: any) => l._id) }, done: false, remindAt: { $gte: startOfWeek, $lte: endOfWeek } })
        .sort({ remindAt: 1 })
        .lean()
        .exec(),
      this.leadTaskModel
        .find({ leadId: { $in: leadIds.map((l: any) => l._id) }, completed: false, dueAt: { $gte: startOfWeek, $lte: endOfWeek } })
        .sort({ dueAt: 1 })
        .lean()
        .exec(),
    ]);
    const leadIdsForName = [...new Set([...(reminders as any[]).map((r) => String(r.leadId)), ...(tasks as any[]).map((t) => String(t.leadId))])];
    const leads = await this.leadModel.find({ _id: { $in: leadIdsForName.map((id) => new Types.ObjectId(id)) } }).select('_id name').lean().exec();
    const leadNameMap = new Map((leads as any[]).map((l: any) => [String(l._id), l.name ?? '']));
    const result: DashboardWeekEventItem[] = [];
    for (const r of reminders as any[]) {
      if (!leadIdSet.has(String(r.leadId))) continue;
      const d = r.remindAt ? new Date(r.remindAt) : null;
      result.push({
        type: 'reminder',
        id: String(r._id),
        leadId: String(r.leadId),
        leadName: leadNameMap.get(String(r.leadId)),
        title: r.title ?? '',
        date: d ? d.toISOString().slice(0, 10) : '',
        dateTime: d ? d.toISOString() : undefined,
      });
    }
    for (const t of tasks as any[]) {
      if (!leadIdSet.has(String(t.leadId))) continue;
      const d = t.dueAt ? new Date(t.dueAt) : null;
      result.push({
        type: 'task',
        id: String(t._id),
        leadId: String(t.leadId),
        leadName: leadNameMap.get(String(t.leadId)),
        title: t.title ?? '',
        date: d ? d.toISOString().slice(0, 10) : '',
        dateTime: d ? d.toISOString() : undefined,
      });
    }
    result.sort((a, b) => (a.dateTime ?? a.date).localeCompare(b.dateTime ?? b.date));
    return result;
  }
}
