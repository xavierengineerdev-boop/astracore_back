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
import { TaskService, TaskItem } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ReorderTasksDto } from './dto/reorder-tasks.dto';

type ReqUser = { user: { userId: string; role: string } };

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@ApiCommonResponses()
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @ApiOperation({ summary: 'Create task (super only). Задачи привязаны к отделу.' })
  @ApiBody({ type: CreateTaskDto })
  @ApiResponse({ status: 201, description: 'Task created' })
  async create(@Req() req: ReqUser, @Body() dto: CreateTaskDto) {
    if (req.user.role !== 'super') {
      throw new ForbiddenException('Только суперпользователь может создавать задачи');
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
      },
      req.user.userId,
    );
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reorder tasks within a column (super only)' })
  @ApiBody({ type: ReorderTasksDto })
  @ApiResponse({ status: 200, description: 'Tasks reordered' })
  async reorder(
    @Req() req: ReqUser,
    @Query('departmentId') departmentId: string,
    @Body() dto: ReorderTasksDto,
  ) {
    if (req.user.role !== 'super') {
      throw new ForbiddenException('Только суперпользователь может менять порядок задач');
    }
    if (!departmentId?.trim()) throw new ForbiddenException('departmentId is required');
    await this.taskService.reorder(
      departmentId.trim(),
      dto.statusId?.trim() || null,
      dto.taskIds,
    );
    return { message: 'OK' };
  }

  @Get()
  @ApiOperation({ summary: 'List tasks by department (super only)' })
  @ApiResponse({ status: 200, description: 'List of tasks' })
  async findAll(@Req() req: ReqUser, @Query('departmentId') departmentId: string): Promise<TaskItem[]> {
    if (req.user.role !== 'super') {
      throw new ForbiddenException('Только суперпользователь может просматривать задачник');
    }
    if (!departmentId?.trim()) throw new ForbiddenException('departmentId is required');
    return this.taskService.findByDepartment(departmentId.trim());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one task (super only)' })
  @ApiResponse({ status: 200, description: 'Task' })
  async findOne(@Req() req: ReqUser, @Param('id') id: string) {
    if (req.user.role !== 'super') {
      throw new ForbiddenException('Только суперпользователь может просматривать задачи');
    }
    const task = await this.taskService.findById(id);
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task (super only)' })
  @ApiBody({ type: UpdateTaskDto })
  @ApiResponse({ status: 200, description: 'Task updated' })
  async update(@Req() req: ReqUser, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    if (req.user.role !== 'super') {
      throw new ForbiddenException('Только суперпользователь может редактировать задачи');
    }
    return this.taskService.update(id, {
      title: dto.title?.trim(),
      description: dto.description?.trim(),
      statusId: dto.statusId === '' ? null : dto.statusId ?? undefined,
      priorityId: dto.priorityId === '' ? null : dto.priorityId ?? undefined,
      assigneeId: dto.assigneeId === '' ? null : dto.assigneeId ?? undefined,
      dueAt: dto.dueAt === '' ? null : dto.dueAt ?? undefined,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task (super only)' })
  @ApiResponse({ status: 200, description: 'Task deleted' })
  async remove(@Req() req: ReqUser, @Param('id') id: string) {
    if (req.user.role !== 'super') {
      throw new ForbiddenException('Только суперпользователь может удалять задачи');
    }
    await this.taskService.delete(id);
    return { message: 'Task deleted' };
  }
}
