import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiCommonResponses } from '../../common';
import type { UserRole } from '../../constants/roles.constant';
import { LeadService } from './lead.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { BulkCreateLeadsDto } from './dto/bulk-create-leads.dto';
import { BulkUpdateLeadsDto } from './dto/bulk-update-leads.dto';
import { BulkDeleteLeadsDto } from './dto/bulk-delete-leads.dto';

type ReqUser = { user: { userId: string; role: string } };

@ApiTags('leads')
@Controller('leads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@ApiCommonResponses()
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Post()
  @ApiOperation({ summary: 'Create lead (super, department manager, or employee of department)' })
  @ApiBody({ type: CreateLeadDto })
  @ApiResponse({ status: 201, description: 'Lead created' })
  async create(@Req() req: ReqUser, @Body() dto: CreateLeadDto) {
    return this.leadService.create(
      {
        name: dto.name,
        lastName: dto.lastName?.trim(),
        phone: dto.phone,
        email: dto.email,
        departmentId: dto.departmentId.trim(),
        statusId: dto.statusId?.trim(),
        source: dto.source?.trim(),
        siteId: dto.siteId?.trim(),
        sourceMeta: dto.sourceMeta,
        assignedTo: dto.assignedTo,
      },
      req.user.userId,
      req.user.role as UserRole,
    );
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bulk import leads by name+phone (super or department manager only)' })
  @ApiBody({ type: BulkCreateLeadsDto })
  @ApiResponse({ status: 201, description: 'Bulk result with added and duplicates count' })
  async bulkCreate(@Req() req: ReqUser, @Body() dto: BulkCreateLeadsDto) {
    if (req.user.role !== 'super' && req.user.role !== 'manager') {
      throw new ForbiddenException('Массовое добавление доступно только руководителю отдела');
    }
    return this.leadService.bulkCreate(
      dto.departmentId.trim(),
      dto.items.map((i) => ({ name: i.name.trim(), phone: i.phone.trim() })),
      req.user.userId,
      req.user.role as UserRole,
    );
  }

  @Patch('bulk')
  @ApiOperation({ summary: 'Bulk update leads (super or department manager only)' })
  @ApiBody({ type: BulkUpdateLeadsDto })
  @ApiResponse({ status: 200, description: 'Number of leads updated' })
  async bulkUpdate(@Req() req: ReqUser, @Body() dto: BulkUpdateLeadsDto) {
    if (req.user.role !== 'super' && req.user.role !== 'manager') {
      throw new ForbiddenException('Массовое изменение доступно только руководителю отдела');
    }
    const leadIds = (dto.leadIds || []).filter((id) => id?.trim()).map((id) => id.trim());
    if (leadIds.length === 0) return { updated: 0 };
    const payload: { statusId?: string; assignedTo?: string[] } = {};
    if (dto.statusId !== undefined) payload.statusId = dto.statusId?.trim() ?? '';
    if (dto.assignedTo !== undefined) payload.assignedTo = dto.assignedTo;
    return this.leadService.bulkUpdate(leadIds, payload, req.user.userId, req.user.role as UserRole);
  }

  @Post('bulk-delete')
  @ApiOperation({ summary: 'Bulk delete leads (super or department manager only)' })
  @ApiBody({ type: BulkDeleteLeadsDto })
  @ApiResponse({ status: 200, description: 'Number of leads deleted' })
  async bulkDelete(@Req() req: ReqUser, @Body() dto: BulkDeleteLeadsDto) {
    if (req.user.role !== 'super' && req.user.role !== 'manager') {
      throw new ForbiddenException('Массовое удаление доступно только руководителю отдела');
    }
    const leadIds = (dto.leadIds || []).filter((id) => id?.trim()).map((id) => id.trim());
    if (leadIds.length === 0) return { deleted: 0 };
    return this.leadService.bulkDelete(leadIds, req.user.userId, req.user.role as UserRole);
  }

  @Get()
  @ApiOperation({ summary: 'List leads by department with pagination, filters and sort' })
  @ApiResponse({ status: 200, description: 'Paginated list of leads' })
  async findAll(
    @Req() req: ReqUser,
    @Query('departmentId') departmentId: string,
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
    @Query('name') name?: string,
    @Query('phone') phone?: string,
    @Query('email') email?: string,
    @Query('statusId') statusId?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    if (!departmentId?.trim()) throw new ForbiddenException('departmentId is required');
    const skipNum = Math.max(0, parseInt(skip ?? '0', 10) || 0);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? '50', 10) || 50));
    const filters =
      name || phone || email || statusId || assignedTo || dateFrom || dateTo
        ? { name, phone, email, statusId, assignedTo, dateFrom, dateTo }
        : undefined;
    const sort =
      sortBy || sortOrder
        ? {
            sortBy: sortBy?.trim(),
            sortOrder: (sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc',
          }
        : undefined;
    return this.leadService.findByDepartment(
      departmentId.trim(),
      req.user.userId,
      req.user.role as UserRole,
      skipNum,
      limitNum,
      filters,
      sort,
    );
  }

  @Get('reminders/upcoming')
  @ApiOperation({ summary: 'Upcoming reminders for header bell (next 24h or overdue)' })
  @ApiResponse({ status: 200, description: 'List of reminders with leadName' })
  async getUpcomingReminders(@Req() req: ReqUser) {
    return this.leadService.getUpcomingReminders(req.user.userId, req.user.role as UserRole);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistics by status: manager and employees leads per status (super, admin, manager)' })
  @ApiResponse({ status: 200, description: 'Stats rows and statuses' })
  async getStats(
    @Req() req: ReqUser,
    @Query('departmentId') departmentId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('statusId') statusId?: string,
  ) {
    if (!departmentId?.trim()) throw new ForbiddenException('departmentId is required');
    return this.leadService.getStats(
      departmentId.trim(),
      req.user.userId,
      req.user.role as UserRole,
      dateFrom || dateTo || statusId ? { dateFrom, dateTo, statusId } : undefined,
    );
  }

  @Get('export')
  @ApiOperation({ summary: 'Export leads list (CSV/Excel). Only super, admin, manager' })
  @ApiResponse({ status: 200, description: 'Leads array for export' })
  async getExport(
    @Req() req: ReqUser,
    @Query('departmentId') departmentId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('statusId') statusId?: string,
    @Query('assignedTo') assignedTo?: string,
  ) {
    if (req.user.role !== 'super' && req.user.role !== 'admin' && req.user.role !== 'manager') {
      throw new ForbiddenException('Экспорт доступен только руководителям, админам и супер-админу');
    }
    if (!departmentId?.trim()) throw new ForbiddenException('departmentId is required');
    return this.leadService.getLeadsForExport(
      departmentId.trim(),
      req.user.userId,
      req.user.role as UserRole,
      dateFrom || dateTo || statusId || assignedTo ? { dateFrom, dateTo, statusId, assignedTo } : undefined,
    );
  }

  @Get(':id/notes')
  @ApiOperation({ summary: 'List notes for a lead' })
  @ApiResponse({ status: 200, description: 'List of notes' })
  async getNotes(@Req() req: ReqUser, @Param('id') id: string) {
    return this.leadService.getNotes(id, req.user.userId, req.user.role as UserRole);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Add note to lead' })
  @ApiBody({ schema: { type: 'object', properties: { content: { type: 'string' } }, required: ['content'] } })
  @ApiResponse({ status: 201, description: 'Note created' })
  async addNote(@Req() req: ReqUser, @Param('id') id: string, @Body() body: { content: string }) {
    return this.leadService.addNote(id, body.content ?? '', req.user.userId, req.user.role as UserRole);
  }

  @Patch(':id/notes/:noteId')
  @ApiOperation({ summary: 'Update note (manager or note author)' })
  @ApiBody({ schema: { type: 'object', properties: { content: { type: 'string' } }, required: ['content'] } })
  @ApiResponse({ status: 200, description: 'Note updated' })
  async updateNote(
    @Req() req: ReqUser,
    @Param('id') id: string,
    @Param('noteId') noteId: string,
    @Body() body: { content: string },
  ) {
    return this.leadService.updateNote(id, noteId, body.content ?? '', req.user.userId, req.user.role as UserRole);
  }

  @Delete(':id/notes/:noteId')
  @ApiOperation({ summary: 'Delete note (manager or note author)' })
  @ApiResponse({ status: 200, description: 'Note deleted' })
  async deleteNote(@Req() req: ReqUser, @Param('id') id: string, @Param('noteId') noteId: string) {
    await this.leadService.deleteNote(id, noteId, req.user.userId, req.user.role as UserRole);
    return { message: 'Note deleted' };
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get lead history (creation, updates, notes)' })
  @ApiResponse({ status: 200, description: 'List of history entries' })
  async getHistory(@Req() req: ReqUser, @Param('id') id: string) {
    return this.leadService.getHistory(id, req.user.userId, req.user.role as UserRole);
  }

  @Get(':id/tasks')
  @ApiOperation({ summary: 'List tasks for a lead' })
  @ApiResponse({ status: 200, description: 'List of tasks' })
  async getTasks(@Req() req: ReqUser, @Param('id') id: string) {
    return this.leadService.getTasks(id, req.user.userId, req.user.role as UserRole);
  }

  @Post(':id/tasks')
  @ApiOperation({ summary: 'Add task to lead' })
  @ApiBody({ schema: { type: 'object', properties: { title: { type: 'string' }, dueAt: { type: 'string', format: 'date-time' } }, required: ['title'] } })
  @ApiResponse({ status: 201, description: 'Task created' })
  async addTask(@Req() req: ReqUser, @Param('id') id: string, @Body() body: { title: string; dueAt?: string | null }) {
    return this.leadService.addTask(id, { title: body.title, dueAt: body.dueAt }, req.user.userId, req.user.role as UserRole);
  }

  @Patch(':id/tasks/:taskId')
  @ApiOperation({ summary: 'Update task (title, dueAt, completed)' })
  @ApiBody({ schema: { type: 'object', properties: { title: { type: 'string' }, dueAt: { type: 'string', format: 'date-time' }, completed: { type: 'boolean' } } } })
  @ApiResponse({ status: 200, description: 'Task updated' })
  async updateTask(
    @Req() req: ReqUser,
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body() body: { title?: string; dueAt?: string | null; completed?: boolean },
  ) {
    return this.leadService.updateTask(id, taskId, body, req.user.userId, req.user.role as UserRole);
  }

  @Delete(':id/tasks/:taskId')
  @ApiOperation({ summary: 'Delete task' })
  @ApiResponse({ status: 200, description: 'Task deleted' })
  async deleteTask(@Req() req: ReqUser, @Param('id') id: string, @Param('taskId') taskId: string) {
    await this.leadService.deleteTask(id, taskId, req.user.userId, req.user.role as UserRole);
    return { message: 'Task deleted' };
  }

  @Get(':id/reminders')
  @ApiOperation({ summary: 'List reminders for a lead' })
  @ApiResponse({ status: 200, description: 'List of reminders' })
  async getReminders(@Req() req: ReqUser, @Param('id') id: string) {
    return this.leadService.getReminders(id, req.user.userId, req.user.role as UserRole);
  }

  @Post(':id/reminders')
  @ApiOperation({ summary: 'Add reminder to lead' })
  @ApiBody({ schema: { type: 'object', properties: { title: { type: 'string' }, remindAt: { type: 'string', format: 'date-time' } }, required: ['title', 'remindAt'] } })
  @ApiResponse({ status: 201, description: 'Reminder created' })
  async addReminder(@Req() req: ReqUser, @Param('id') id: string, @Body() body: { title: string; remindAt: string }) {
    return this.leadService.addReminder(id, { title: body.title, remindAt: body.remindAt }, req.user.userId, req.user.role as UserRole);
  }

  @Patch(':id/reminders/:reminderId/done')
  @ApiOperation({ summary: 'Mark reminder as done' })
  @ApiResponse({ status: 200, description: 'Reminder updated' })
  async markReminderDone(@Req() req: ReqUser, @Param('id') id: string, @Param('reminderId') reminderId: string) {
    return this.leadService.markReminderDone(id, reminderId, req.user.userId, req.user.role as UserRole);
  }

  @Delete(':id/reminders/:reminderId')
  @ApiOperation({ summary: 'Delete reminder' })
  @ApiResponse({ status: 200, description: 'Reminder deleted' })
  async deleteReminder(@Req() req: ReqUser, @Param('id') id: string, @Param('reminderId') reminderId: string) {
    await this.leadService.deleteReminder(id, reminderId, req.user.userId, req.user.role as UserRole);
    return { message: 'Reminder deleted' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one lead' })
  @ApiResponse({ status: 200, description: 'Lead' })
  async findOne(@Req() req: ReqUser, @Param('id') id: string) {
    const lead = await this.leadService.findById(id, req.user.userId, req.user.role as UserRole);
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update lead' })
  @ApiBody({ type: UpdateLeadDto })
  @ApiResponse({ status: 200, description: 'Lead updated' })
  async update(@Req() req: ReqUser, @Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leadService.update(
      id,
      {
        name: dto.name?.trim(),
        lastName: dto.lastName?.trim(),
        phone: dto.phone?.trim(),
        email: dto.email?.trim(),
        statusId: dto.statusId?.trim(),
        assignedTo: dto.assignedTo,
      },
      req.user.userId,
      req.user.role as UserRole,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete lead' })
  @ApiResponse({ status: 200, description: 'Lead deleted' })
  async remove(@Req() req: ReqUser, @Param('id') id: string) {
    await this.leadService.delete(id, req.user.userId, req.user.role as UserRole);
    return { message: 'Lead deleted' };
  }
}
