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
import { LeadTagService } from './lead-tag.service';
import { CreateLeadTagDto } from './dto/create-lead-tag.dto';
import { UpdateLeadTagDto } from './dto/update-lead-tag.dto';

type ReqUser = { user: { userId: string; role: string } };

@ApiTags('lead-tags')
@Controller('lead-tags')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@ApiCommonResponses()
export class LeadTagController {
  constructor(private readonly leadTagService: LeadTagService) {}

  @Post()
  @ApiOperation({ summary: 'Create lead tag (super, admin or department manager). Тег лида — источник/база.' })
  @ApiBody({ type: CreateLeadTagDto })
  @ApiResponse({ status: 201, description: 'Lead tag created' })
  async create(@Req() req: ReqUser, @Body() dto: CreateLeadTagDto) {
    return this.leadTagService.create(
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
  @ApiOperation({ summary: 'List lead tags by department' })
  @ApiResponse({ status: 200, description: 'List of lead tags' })
  async findAll(@Req() req: ReqUser, @Query('departmentId') departmentId: string) {
    if (!departmentId?.trim()) throw new ForbiddenException('departmentId is required');
    const canView = await this.leadTagService.canViewDepartment(
      departmentId.trim(),
      req.user.userId,
      req.user.role as UserRole,
    );
    if (!canView) throw new ForbiddenException('Access denied to this department lead tags');
    return this.leadTagService.findByDepartment(departmentId.trim());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one lead tag' })
  @ApiResponse({ status: 200, description: 'Lead tag' })
  async findOne(@Req() req: ReqUser, @Param('id') id: string) {
    const tag = await this.leadTagService.findById(id);
    if (!tag) throw new NotFoundException('Lead tag not found');
    const canView = await this.leadTagService.canViewDepartment(
      tag.departmentId,
      req.user.userId,
      req.user.role as UserRole,
    );
    if (!canView) throw new ForbiddenException('Access denied');
    return tag;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update lead tag (super, admin or dept manager)' })
  @ApiBody({ type: UpdateLeadTagDto })
  @ApiResponse({ status: 200, description: 'Lead tag updated' })
  async update(
    @Req() req: ReqUser,
    @Param('id') id: string,
    @Body() dto: UpdateLeadTagDto,
  ) {
    return this.leadTagService.update(
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
  @ApiOperation({ summary: 'Delete lead tag (super, admin or dept manager)' })
  @ApiResponse({ status: 200, description: 'Lead tag deleted' })
  async remove(@Req() req: ReqUser, @Param('id') id: string) {
    await this.leadTagService.delete(id, req.user.userId, req.user.role as UserRole);
    return { message: 'Lead tag deleted' };
  }
}
