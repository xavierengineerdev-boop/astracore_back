import {
  Controller,
  Get,
  Post,
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
import { UserRole } from '../../constants/roles.constant';
import { TaskService, TaskItem } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ReorderTasksDto } from './dto/reorder-tasks.dto';
import { UserService } from '../user/user.service';
import { LeadService } from '../lead/lead.service';
import {
  canViewTask,
  canEditTask,
  canCreateTaskInDepartment,
  getListTasksScope,
  canReorderTasksInDepartment,
  type TaskUserContext,
} from './task-permissions';

type ReqUser = { user: { userId: string; role: string } };

const TASK_ROLES: UserRole[] = ['super', 'admin', 'manager', 'employee'];

function isTaskRole(role: string): role is UserRole {
  return TASK_ROLES.includes(role as UserRole);
}

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@ApiCommonResponses()
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly userService: UserService,
    private readonly leadService: LeadService,
  ) {}

  private async getTaskContext(req: ReqUser): Promise<TaskUserContext> {
    const role = req.user.role;
    if (!isTaskRole(role)) {
      return { userId: req.user.userId, role: 'employee', departmentId: null };
    }
    let departmentId: string | null | undefined = null;
    if (role === 'manager' || role === 'employee') {
      const profile = await this.userService.findById(req.user.userId);
      departmentId = profile?.departmentId ? String(profile.departmentId) : null;
    }
    return { userId: req.user.userId, role, departmentId };
  }

  @Post()
  @ApiOperation({ summary: 'Create task. Доступ: admin/super — любой отдел; manager/employee — только свой отдел.' })
  @ApiBody({ type: CreateTaskDto })
  @ApiResponse({ status: 201, description: 'Task created' })
  async create(@Req() req: ReqUser, @Body() dto: CreateTaskDto) {
    const ctx = await this.getTaskContext(req);
    if (!canCreateTaskInDepartment(dto.departmentId, ctx)) {
      throw new ForbiddenException('Нет прав на создание задачи в этом отделе');
    }
    if (dto.leadId?.trim()) {
      const lead = await this.leadService.findById(
        dto.leadId.trim(),
        req.user.userId,
        req.user.role,
      );
      if (!lead) {
        throw new NotFoundException('Лид не найден или нет доступа к нему');
      }
    }
    return this.taskService.create(
      {
        title: dto.title,
        description: dto.description,
        departmentId: dto.departmentId,
        statusId: dto.statusId ?? null,
        priorityId: dto.priorityId ?? null,
        assigneeId: dto.assigneeId ?? null,
        dueAt: dto.dueAt ?? null,
        leadId: dto.leadId?.trim() || null,
      },
      req.user.userId,
    );
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reorder tasks in column. Доступ: admin/super или manager своего отдела.' })
  @ApiBody({ type: ReorderTasksDto })
  @ApiResponse({ status: 200, description: 'Tasks reordered' })
  async reorder(
    @Req() req: ReqUser,
    @Query('departmentId') departmentId: string,
    @Body() dto: ReorderTasksDto,
  ) {
    if (!departmentId?.trim()) throw new ForbiddenException('departmentId is required');
    const ctx = await this.getTaskContext(req);
    if (!canReorderTasksInDepartment(departmentId.trim(), ctx)) {
      throw new ForbiddenException('Нет прав на изменение порядка задач в этом отделе');
    }
    await this.taskService.reorder(
      departmentId.trim(),
      dto.statusId?.trim() || null,
      dto.taskIds,
    );
    return { message: 'OK' };
  }

  @Get()
  @ApiOperation({ summary: 'List tasks: по отделу (departmentId) или по лиду (leadId) для карточки лида.' })
  @ApiResponse({ status: 200, description: 'List of tasks' })
  async findAll(
    @Req() req: ReqUser,
    @Query('departmentId') departmentId: string,
    @Query('leadId') leadId?: string,
  ): Promise<TaskItem[]> {
    if (leadId?.trim()) {
      const lead = await this.leadService.findById(
        leadId.trim(),
        req.user.userId,
        req.user.role,
      );
      if (!lead) throw new NotFoundException('Лид не найден или нет доступа');
      return this.taskService.findByLeadId(leadId.trim());
    }
    if (!departmentId?.trim()) throw new ForbiddenException('departmentId is required');
    const ctx = await this.getTaskContext(req);
    const scope = getListTasksScope(departmentId.trim(), ctx);
    if (!scope.allowed) {
      throw new ForbiddenException('Нет доступа к задачам этого отдела');
    }
    if (scope.onlyOwn) {
      return this.taskService.findByDepartmentFiltered(departmentId.trim(), ctx.userId);
    }
    return this.taskService.findByDepartment(departmentId.trim());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one task. Доступ по видимости (свои / отдел / все).' })
  @ApiResponse({ status: 200, description: 'Task' })
  async findOne(@Req() req: ReqUser, @Param('id') id: string) {
    const task = await this.taskService.findById(id);
    if (!task) throw new NotFoundException('Task not found');
    const ctx = await this.getTaskContext(req);
    if (!canViewTask(task, ctx)) {
      throw new ForbiddenException('Нет доступа к этой задаче');
    }
    return task;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task. Редактировать могут: автор/исполнитель (свои), руководитель отдела, admin/super.' })
  @ApiBody({ type: UpdateTaskDto })
  @ApiResponse({ status: 200, description: 'Task updated' })
  async update(@Req() req: ReqUser, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    const task = await this.taskService.findById(id);
    if (!task) throw new NotFoundException('Task not found');
    const ctx = await this.getTaskContext(req);
    if (!canEditTask(task, ctx)) {
      throw new ForbiddenException('Нет прав на редактирование этой задачи');
    }
    return this.taskService.update(id, {
      title: dto.title?.trim(),
      description: dto.description?.trim(),
      statusId: dto.statusId === '' ? null : dto.statusId ?? undefined,
      priorityId: dto.priorityId === '' ? null : dto.priorityId ?? undefined,
      assigneeId: dto.assigneeId === '' ? null : dto.assigneeId ?? undefined,
      dueAt: dto.dueAt === '' ? null : dto.dueAt ?? undefined,
      leadId: dto.leadId === '' ? null : dto.leadId ?? undefined,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task. Удалять — те же права, что и на редактирование.' })
  @ApiResponse({ status: 200, description: 'Task deleted' })
  async remove(@Req() req: ReqUser, @Param('id') id: string) {
    const task = await this.taskService.findById(id);
    if (!task) throw new NotFoundException('Task not found');
    const ctx = await this.getTaskContext(req);
    if (!canEditTask(task, ctx)) {
      throw new ForbiddenException('Нет прав на удаление этой задачи');
    }
    await this.taskService.delete(id);
    return { message: 'Task deleted' };
  }
}
