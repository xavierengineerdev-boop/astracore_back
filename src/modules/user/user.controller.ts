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
import { canCreateRole } from '../../constants/roles.constant';
import type { UserRole } from '../../constants/roles.constant';
import { UserService } from './user.service';
import { LeadService, LeadListResult, UserLeadStatsResult } from '../lead/lead.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const ROLES_CAN_LIST: UserRole[] = ['super', 'admin'];

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@ApiCommonResponses()
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly leadService: LeadService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create user (super can create any role, admin — admin/manager/employee, etc.)' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User created' })
  async create(
    @Req() req: { user: { userId: string; role: string } },
    @Body() dto: CreateUserDto,
  ) {
    const creatorRole = req.user.role as UserRole;
    const targetRole = dto.role as UserRole;
    if (!canCreateRole(creatorRole, targetRole)) {
      throw new ForbiddenException('You cannot create a user with this role');
    }
    let departmentId = dto.departmentId;
    if (creatorRole === 'manager') {
      const managerProfile = await this.userService.findById(req.user.userId);
      if (!managerProfile?.departmentId) {
        throw new ForbiddenException('Руководитель должен быть привязан к отделу');
      }
      departmentId = managerProfile.departmentId;
    }
    return this.userService.createUser(dto.email, dto.password, targetRole, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      isActive: dto.isActive,
      departmentId,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List all users (super, admin)' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async findAll(@Req() req: { user: { role: string } }) {
    const role = req.user.role as UserRole;
    if (!ROLES_CAN_LIST.includes(role)) {
      throw new ForbiddenException('Only super and admin can list users');
    }
    return this.userService.findAll();
  }

  @Get(':id/leads')
  @ApiOperation({ summary: 'Leads assigned to this user (paginated)' })
  @ApiResponse({ status: 200, description: 'Lead list' })
  async findUserLeads(
    @Req() req: { user: { userId: string; role: string } },
    @Param('id') id: string,
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
    @Query('name') name?: string,
    @Query('phone') phone?: string,
    @Query('email') email?: string,
    @Query('statusId') statusId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ): Promise<LeadListResult> {
    const isOwn = String(req.user.userId) === String(id);
    const canList = ROLES_CAN_LIST.includes(req.user.role as UserRole);
    if (!canList && !isOwn) throw new ForbiddenException('Access denied');
    const target = await this.userService.findById(id);
    if (!target) throw new NotFoundException('User not found');
    const skipNum = Math.max(0, parseInt(skip ?? '0', 10) || 0);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? '25', 10) || 25));
    const filters = name || phone || email || statusId || departmentId ? { name, phone, email, statusId, departmentId } : undefined;
    const sort = sortBy || sortOrder ? { sortBy, sortOrder: (sortOrder as 'asc' | 'desc') || 'desc' } : undefined;
    return this.leadService.findLeadsAssignedToUser(id, req.user.userId, req.user.role, skipNum, limitNum, filters, sort);
  }

  @Get(':id/lead-stats')
  @ApiOperation({ summary: 'Lead statistics for this user (by status + over time)' })
  @ApiResponse({ status: 200, description: 'Stats' })
  async getUserLeadStats(
    @Req() req: { user: { userId: string; role: string } },
    @Param('id') id: string,
    @Query('days') days?: string,
  ): Promise<UserLeadStatsResult> {
    const isOwn = String(req.user.userId) === String(id);
    const canList = ROLES_CAN_LIST.includes(req.user.role as UserRole);
    if (!canList && !isOwn) throw new ForbiddenException('Access denied');
    const target = await this.userService.findById(id);
    if (!target) throw new NotFoundException('User not found');
    const daysNum = Math.min(90, Math.max(7, parseInt(days ?? '14', 10) || 14));
    return this.leadService.getLeadStatsForUser(id, req.user.userId, req.user.role, daysNum);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID (super, admin or own profile)' })
  @ApiResponse({ status: 200, description: 'User' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Req() req: { user: { userId: string; role: string } }, @Param('id') id: string) {
    const isOwn = String(req.user.userId) === String(id);
    const canList = ROLES_CAN_LIST.includes(req.user.role as UserRole);
    if (!canList && !isOwn) {
      throw new ForbiddenException('Only super and admin can view other users');
    }
    const user = await this.userService.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user (self: email only; super/admin: by role hierarchy)' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Req() req: { user: { userId: string; role: string } },
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    const isOwn = String(req.user.userId) === String(id);
    const creatorRole = req.user.role as UserRole;

    if (isOwn) {
      if (dto.role !== undefined && dto.role !== req.user.role) {
        throw new ForbiddenException('You cannot change your own role');
      }
      return this.userService.update(id, {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        isActive: dto.isActive,
      });
    }

    if (!ROLES_CAN_LIST.includes(creatorRole)) {
      throw new ForbiddenException('Only super and admin can update other users');
    }
    const target = await this.userService.findById(id);
    if (!target) throw new NotFoundException('User not found');
    const targetRole = target.role as UserRole;
    if (creatorRole === 'admin' && (targetRole === 'super' || targetRole === 'admin')) {
      throw new ForbiddenException('You can only edit users with a lower rank (manager, employee)');
    }
    if (dto.role !== undefined && !canCreateRole(creatorRole, dto.role as UserRole)) {
      throw new ForbiddenException('You cannot assign this role');
    }
    return this.userService.update(id, {
      email: dto.email,
      role: dto.role as UserRole,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      isActive: dto.isActive,
      departmentId: dto.departmentId,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user (by hierarchy: no self-delete, admin only lower ranks)' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(
    @Req() req: { user: { userId: string; role: string } },
    @Param('id') id: string,
  ) {
    const isOwn = String(req.user.userId) === String(id);
    if (isOwn) {
      throw new ForbiddenException('You cannot delete yourself');
    }
    const creatorRole = req.user.role as UserRole;
    if (!ROLES_CAN_LIST.includes(creatorRole)) {
      throw new ForbiddenException('Only super and admin can delete users');
    }
    const target = await this.userService.findById(id);
    if (!target) throw new NotFoundException('User not found');
    const targetRole = target.role as UserRole;
    if (creatorRole === 'admin' && (targetRole === 'super' || targetRole === 'admin')) {
      throw new ForbiddenException('You can only delete users with a lower rank (manager, employee)');
    }
    await this.userService.delete(id);
    return { message: 'User deleted' };
  }
}
