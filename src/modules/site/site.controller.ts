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
import { SiteService } from './site.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';

type ReqUser = { user: { userId: string; role: string } };

@ApiTags('sites')
@Controller('sites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@ApiCommonResponses()
export class SiteController {
  constructor(private readonly siteService: SiteService) {}

  @Post()
  @ApiOperation({ summary: 'Create site (super or department manager), returns token' })
  @ApiBody({ type: CreateSiteDto })
  @ApiResponse({ status: 201, description: 'Site created' })
  async create(@Req() req: ReqUser, @Body() dto: CreateSiteDto) {
    return this.siteService.create(
      {
        url: dto.url,
        description: dto.description,
        departmentId: dto.departmentId.trim(),
      },
      req.user.userId,
      req.user.role as UserRole,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List sites by department. Сайты привязаны к отделу — каждый отдел видит только свои.' })
  @ApiResponse({ status: 200, description: 'List of sites' })
  async findAll(@Req() req: ReqUser, @Query('departmentId') departmentId: string) {
    if (!departmentId?.trim()) throw new ForbiddenException('departmentId is required');
    const canView = await this.siteService.canViewDepartment(
      departmentId.trim(),
      req.user.userId,
      req.user.role as UserRole,
    );
    if (!canView) throw new ForbiddenException('Access denied to this department sites');
    return this.siteService.findByDepartment(departmentId.trim());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one site' })
  @ApiResponse({ status: 200, description: 'Site' })
  async findOne(@Req() req: ReqUser, @Param('id') id: string) {
    const site = await this.siteService.findById(id);
    if (!site) throw new NotFoundException('Site not found');
    const canView = await this.siteService.canViewDepartment(
      site.departmentId,
      req.user.userId,
      req.user.role as UserRole,
    );
    if (!canView) throw new ForbiddenException('Access denied');
    return site;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update site (super or dept manager)' })
  @ApiBody({ type: UpdateSiteDto })
  @ApiResponse({ status: 200, description: 'Site updated' })
  async update(@Req() req: ReqUser, @Param('id') id: string, @Body() dto: UpdateSiteDto) {
    return this.siteService.update(
      id,
      {
        url: dto.url?.trim(),
        description: dto.description?.trim(),
      },
      req.user.userId,
      req.user.role as UserRole,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete site (super or dept manager)' })
  @ApiResponse({ status: 200, description: 'Site deleted' })
  async remove(@Req() req: ReqUser, @Param('id') id: string) {
    await this.siteService.delete(id, req.user.userId, req.user.role as UserRole);
    return { message: 'Site deleted' };
  }
}
