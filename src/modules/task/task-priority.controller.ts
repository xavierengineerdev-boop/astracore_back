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
import { TaskPriorityService, TaskPriorityItem } from './task-priority.service';
import { CreateTaskPriorityDto } from './dto/create-task-priority.dto';
import { UpdateTaskPriorityDto } from './dto/update-task-priority.dto';

type ReqUser = { user: { userId: string; role: string } };

@ApiTags('task-priorities')
@Controller('task-priorities')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@ApiCommonResponses()
export class TaskPriorityController {
  constructor(
    private readonly taskPriorityService: TaskPriorityService,
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
  @ApiOperation({ summary: 'Create task priority (super only). Приоритеты для отдела.' })
  @ApiBody({ type: CreateTaskPriorityDto })
  @ApiResponse({ status: 201, description: 'Task priority created' })
  async create(@Req() req: ReqUser, @Body() dto: CreateTaskPriorityDto) {
    if (req.user.role !== 'super') {
      throw new ForbiddenException('Только суперпользователь может создавать приоритеты');
    }
    return this.taskPriorityService.create({
      name: dto.name,
      color: dto.color,
      departmentId: dto.departmentId.trim(),
    });
  }

  @Post('ensure-defaults')
  @ApiOperation({ summary: 'Создать дефолтные приоритеты задачника (Low, Medium, High, Fire) для отдела, если их ещё нет.' })
  @ApiResponse({ status: 200, description: 'List of task priorities' })
  async ensureDefaults(@Req() req: ReqUser, @Query('departmentId') departmentId: string): Promise<TaskPriorityItem[]> {
    if (!departmentId?.trim()) throw new ForbiddenException('departmentId is required');
    const id = departmentId.trim();
    const allowed = await this.canAccessDepartment(req, id);
    if (!allowed) throw new ForbiddenException('Нет доступа к этому отделу');
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid departmentId');
    return this.taskPriorityService.ensureDefaultsForDepartment(id);
  }

  @Get()
  @ApiOperation({ summary: 'List task priorities by department. Просмотр: admin/super — любой отдел; manager/employee — свой отдел.' })
  @ApiResponse({ status: 200, description: 'List of task priorities' })
  async findAll(@Req() req: ReqUser, @Query('departmentId') departmentId: string): Promise<TaskPriorityItem[]> {
    if (!departmentId?.trim()) throw new ForbiddenException('departmentId is required');
    const id = departmentId.trim();
    const allowed = await this.canAccessDepartment(req, id);
    if (!allowed) {
      throw new ForbiddenException('Нет доступа к приоритетам этого отдела');
    }
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid departmentId');
    }
    return this.taskPriorityService.findByDepartment(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one task priority. Доступ по отделу приоритета.' })
  @ApiResponse({ status: 200, description: 'Task priority' })
  async findOne(@Req() req: ReqUser, @Param('id') id: string) {
    const item = await this.taskPriorityService.findById(id);
    if (item && !(await this.canAccessDepartment(req, item.departmentId))) {
      throw new ForbiddenException('Нет доступа к этому приоритету');
    }
    if (!item) throw new NotFoundException('Task priority not found');
    return item;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task priority (super only)' })
  @ApiBody({ type: UpdateTaskPriorityDto })
  @ApiResponse({ status: 200, description: 'Task priority updated' })
  async update(@Req() req: ReqUser, @Param('id') id: string, @Body() dto: UpdateTaskPriorityDto) {
    if (req.user.role !== 'super') {
      throw new ForbiddenException('Только суперпользователь может редактировать приоритеты');
    }
    return this.taskPriorityService.update(id, {
      name: dto.name?.trim(),
      color: dto.color?.trim(),
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task priority (super only)' })
  @ApiResponse({ status: 200, description: 'Task priority deleted' })
  async remove(@Req() req: ReqUser, @Param('id') id: string) {
    if (req.user.role !== 'super') {
      throw new ForbiddenException('Только суперпользователь может удалять приоритеты');
    }
    await this.taskPriorityService.delete(id);
    return { message: 'Task priority deleted' };
  }
}
