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
  constructor(private readonly taskPriorityService: TaskPriorityService) {}

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

  @Get()
  @ApiOperation({ summary: 'List task priorities by department (super only)' })
  @ApiResponse({ status: 200, description: 'List of task priorities' })
  async findAll(@Req() req: ReqUser, @Query('departmentId') departmentId: string): Promise<TaskPriorityItem[]> {
    if (req.user.role !== 'super') {
      throw new ForbiddenException('Только суперпользователь может просматривать приоритеты');
    }
    if (!departmentId?.trim()) throw new ForbiddenException('departmentId is required');
    const id = departmentId.trim();
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid departmentId');
    }
    return this.taskPriorityService.findByDepartment(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one task priority (super only)' })
  @ApiResponse({ status: 200, description: 'Task priority' })
  async findOne(@Req() req: ReqUser, @Param('id') id: string) {
    if (req.user.role !== 'super') {
      throw new ForbiddenException('Только суперпользователь может просматривать приоритеты');
    }
    const item = await this.taskPriorityService.findById(id);
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
