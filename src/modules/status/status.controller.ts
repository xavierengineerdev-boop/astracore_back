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
import { StatusService } from './status.service';
import { CreateStatusDto } from './dto/create-status.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

type ReqUser = { user: { userId: string; role: string } };

@ApiTags('statuses')
@Controller('statuses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@ApiCommonResponses()
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Post()
  @ApiOperation({ summary: 'Create status (super or department manager)' })
  @ApiBody({ type: CreateStatusDto })
  @ApiResponse({ status: 201, description: 'Status created' })
  async create(@Req() req: ReqUser, @Body() dto: CreateStatusDto) {
    return this.statusService.create(
      {
        name: dto.name,
        description: dto.description,
        color: dto.color,
        departmentId: dto.departmentId.trim(),
      },
      req.user.userId,
      req.user.role as UserRole,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List statuses by department. Статусы привязаны к отделу — каждый отдел видит только свои.' })
  @ApiResponse({ status: 200, description: 'List of statuses' })
  async findAll(@Req() req: ReqUser, @Query('departmentId') departmentId: string) {
    if (!departmentId?.trim()) throw new ForbiddenException('departmentId is required');
    const canView = await this.statusService.canViewDepartment(
      departmentId.trim(),
      req.user.userId,
      req.user.role as UserRole,
    );
    if (!canView) throw new ForbiddenException('Access denied to this department statuses');
    return this.statusService.findByDepartment(departmentId.trim());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one status' })
  @ApiResponse({ status: 200, description: 'Status' })
  async findOne(@Req() req: ReqUser, @Param('id') id: string) {
    const status = await this.statusService.findById(id);
    if (!status) throw new NotFoundException('Status not found');
    const canView = await this.statusService.canViewDepartment(
      status.departmentId,
      req.user.userId,
      req.user.role as UserRole,
    );
    if (!canView) throw new ForbiddenException('Access denied');
    return status;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update status (super or dept manager)' })
  @ApiBody({ type: UpdateStatusDto })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async update(
    @Req() req: ReqUser,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.statusService.update(
      id,
      {
        name: dto.name?.trim(),
        description: dto.description?.trim(),
        color: dto.color?.trim(),
        departmentId: dto.departmentId?.trim(),
      },
      req.user.userId,
      req.user.role as UserRole,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete status (super or dept manager)' })
  @ApiResponse({ status: 200, description: 'Status deleted' })
  async remove(@Req() req: ReqUser, @Param('id') id: string) {
    await this.statusService.delete(id, req.user.userId, req.user.role as UserRole);
    return { message: 'Status deleted' };
  }
}
