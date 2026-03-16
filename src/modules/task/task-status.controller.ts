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
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiCommonResponses } from '../../common';
import { UserService } from '../user/user.service';
import { TaskStatusService, TaskStatusItem } from './task-status.service';
import { CreateTaskStatusDto } from './dto/create-task-status.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

type ReqUser = { user: { userId: string; role: string } };

@ApiTags('task-statuses')
@Controller('task-statuses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@ApiCommonResponses()
export class TaskStatusController {
  constructor(
    private readonly taskStatusService: TaskStatusService,
    private readonly userService: UserService,
  ) {}

  private async canAccessDepartment(req: ReqUser, departmentId: string): Promise<boolean> {
    if (req.user.role === 'super' || req.user.role === 'admin') return true;
    if (req.user.role === 'manager' || req.user.role === 'employee') {
      const profile = await this.userService.findById(req.user.userId);
      return profile?.departmentId != null && String(profile.departmentId) === String(departmentId);
    }
    return false;
  }

  @Post()
  @ApiOperation({ summary: 'Create task status (super only). Колонки/статусы у каждого отдела свои.' })
  @ApiBody({ type: CreateTaskStatusDto })
  @ApiResponse({ status: 201, description: 'Task status created' })
  async create(@Req() req: ReqUser, @Body() dto: CreateTaskStatusDto) {
    if (req.user.role !== 'super') {
      throw new ForbiddenException('Только суперпользователь может создавать статусы задач');
    }
    return this.taskStatusService.create({
      name: dto.name,
      color: dto.color,
      isCompleted: dto.isCompleted,
      departmentId: dto.departmentId.trim(),
    });
  }

  @Post('ensure-defaults')
  @ApiOperation({ summary: 'Создать дефолтные статусы задачника для отдела (8 колонок), если их ещё нет. Доступ по праву просмотра отдела.' })
  @ApiResponse({ status: 200, description: 'List of task statuses' })
  async ensureDefaults(@Req() req: ReqUser, @Query('departmentId') departmentId: string): Promise<TaskStatusItem[]> {
    if (!departmentId?.trim()) throw new ForbiddenException('departmentId is required');
    const id = departmentId.trim();
    const allowed = await this.canAccessDepartment(req, id);
    if (!allowed) throw new ForbiddenException('Нет доступа к этому отделу');
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid departmentId');
    return this.taskStatusService.ensureDefaultsForDepartment(id);
  }

  @Get()
  @ApiOperation({ summary: 'List task statuses by department. Просмотр: admin/super — любой отдел; manager/employee — свой отдел.' })
  @ApiResponse({ status: 200, description: 'List of task statuses' })
  async findAll(@Req() req: ReqUser, @Query('departmentId') departmentId: string): Promise<TaskStatusItem[]> {
    if (!departmentId?.trim()) throw new ForbiddenException('departmentId is required');
    const id = departmentId.trim();
    const allowed = await this.canAccessDepartment(req, id);
    if (!allowed) {
      throw new ForbiddenException('Нет доступа к статусам этого отдела');
    }
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid departmentId');
    }
    return this.taskStatusService.findByDepartment(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one task status. Доступ по отделу статуса.' })
  @ApiResponse({ status: 200, description: 'Task status' })
  async findOne(@Req() req: ReqUser, @Param('id') id: string) {
    const item = await this.taskStatusService.findById(id);
    if (item && !(await this.canAccessDepartment(req, item.departmentId))) {
      throw new ForbiddenException('Нет доступа к этому статусу');
    }
    if (!item) throw new NotFoundException('Task status not found');
    return item;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task status (super only)' })
  @ApiBody({ type: UpdateTaskStatusDto })
  @ApiResponse({ status: 200, description: 'Task status updated' })
  async update(@Req() req: ReqUser, @Param('id') id: string, @Body() dto: UpdateTaskStatusDto) {
    if (req.user.role !== 'super') {
      throw new ForbiddenException('Только суперпользователь может редактировать статусы задач');
    }
    return this.taskStatusService.update(id, {
      name: dto.name?.trim(),
      color: dto.color?.trim(),
      isCompleted: dto.isCompleted,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task status (super only)' })
  @ApiResponse({ status: 200, description: 'Task status deleted' })
  async remove(@Req() req: ReqUser, @Param('id') id: string) {
    if (req.user.role !== 'super') {
      throw new ForbiddenException('Только суперпользователь может удалять статусы задач');
    }
    await this.taskStatusService.delete(id);
    return { message: 'Task status deleted' };
  }
}
