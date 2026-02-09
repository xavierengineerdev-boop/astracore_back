import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiCommonResponses } from '../../common';
import type { UserRole } from '../../constants/roles.constant';
import { DepartmentService } from './department.service';
import { UserService } from '../user/user.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

const ROLES_CAN_VIEW: UserRole[] = ['super', 'admin'];
const ROLE_CAN_MANAGE: UserRole = 'super';

@ApiTags('departments')
@Controller('departments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@ApiCommonResponses()
export class DepartmentController {
  constructor(
    private readonly departmentService: DepartmentService,
    private readonly userService: UserService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create department (super only)' })
  @ApiBody({ type: CreateDepartmentDto })
  @ApiResponse({ status: 201, description: 'Department created' })
  async create(@Req() req: { user: { role: string } }, @Body() dto: CreateDepartmentDto) {
    if ((req.user.role as UserRole) !== ROLE_CAN_MANAGE) {
      throw new ForbiddenException('Only super can create departments');
    }
    return this.departmentService.create(dto.name.trim(), dto.managerId);
  }

  @Get()
  @ApiOperation({ summary: 'List departments (super/admin: all; manager: only managed)' })
  @ApiResponse({ status: 200, description: 'List of departments' })
  async findAll(@Req() req: { user: { userId: string; role: string } }) {
    if (ROLES_CAN_VIEW.includes(req.user.role as UserRole)) {
      return this.departmentService.findAll();
    }
    if (req.user.role === 'manager') {
      return this.departmentService.findByManagerId(req.user.userId);
    }
    throw new ForbiddenException('Access denied');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get department (super, admin, dept manager, or employee of this dept)' })
  @ApiResponse({ status: 200, description: 'Department detail' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  async findOne(@Req() req: { user: { userId: string; role: string } }, @Param('id') id: string) {
    const department = await this.departmentService.findById(id);
    if (!department) throw new NotFoundException('Department not found');
    const canView =
      ROLES_CAN_VIEW.includes(req.user.role as UserRole) ||
      (req.user.role === 'manager' && department.managerId && String(department.managerId) === String(req.user.userId));
    if (canView) return department;
    if (req.user.role === 'employee') {
      const profile = await this.userService.findById(req.user.userId);
      if (profile?.departmentId && String(profile.departmentId) === id) return department;
    }
    throw new ForbiddenException('Access denied to this department');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update department (super or department manager for own dept)' })
  @ApiBody({ type: UpdateDepartmentDto })
  @ApiResponse({ status: 200, description: 'Department updated' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  async update(
    @Req() req: { user: { userId: string; role: string } },
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    const isSuper = (req.user.role as UserRole) === ROLE_CAN_MANAGE;
    const department = await this.departmentService.findById(id);
    if (!department) throw new NotFoundException('Department not found');
    const isManagerOfDept =
      req.user.role === 'manager' &&
      department.managerId &&
      String(department.managerId) === String(req.user.userId);
    if (!isSuper && !isManagerOfDept) {
      throw new ForbiddenException('Only super or the department manager can update this department');
    }
    return this.departmentService.update(id, {
      name: dto.name?.trim(),
      managerId: dto.managerId,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete department (super only)' })
  @ApiResponse({ status: 200, description: 'Department deleted' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  async remove(@Req() req: { user: { role: string } }, @Param('id') id: string) {
    if ((req.user.role as UserRole) !== ROLE_CAN_MANAGE) {
      throw new ForbiddenException('Only super can delete departments');
    }
    await this.departmentService.delete(id);
    return { message: 'Department deleted' };
  }
}
