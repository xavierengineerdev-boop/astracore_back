import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiCommonResponses } from '../../common';
import {
  DashboardService,
  DashboardSummary,
  DashboardLeadsByStatusItem,
  DashboardLeadsOverTimeItem,
  DashboardRecentLeadItem,
  DashboardDepartmentSummaryItem,
  DashboardTopAssigneeItem,
  DashboardAttentionCounts,
  DashboardWeekEventItem,
} from './dashboard.service';

type ReqUser = { user: { userId: string; role: string } };

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@ApiCommonResponses()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Dashboard summary: users, departments, leads counts' })
  @ApiResponse({ status: 200, description: 'Summary counts' })
  async getSummary(@Req() req: ReqUser): Promise<DashboardSummary> {
    return this.dashboardService.getSummary(req.user.userId, req.user.role);
  }

  @Get('leads-by-status')
  @ApiOperation({ summary: 'Leads count grouped by status (for pie chart)' })
  @ApiResponse({ status: 200, description: 'Status name and count' })
  async getLeadsByStatus(@Req() req: ReqUser): Promise<DashboardLeadsByStatusItem[]> {
    return this.dashboardService.getLeadsByStatus(req.user.userId, req.user.role);
  }

  @Get('leads-over-time')
  @ApiOperation({ summary: 'Leads created per day for last N days (for line chart)' })
  @ApiResponse({ status: 200, description: 'Date and count' })
  async getLeadsOverTime(
    @Req() req: ReqUser,
    @Query('days') days?: string,
  ): Promise<DashboardLeadsOverTimeItem[]> {
    const daysNum = Math.min(90, Math.max(7, parseInt(days ?? '14', 10) || 14));
    return this.dashboardService.getLeadsOverTime(req.user.userId, req.user.role, daysNum);
  }

  @Get('recent-leads')
  @ApiOperation({ summary: 'Recent leads for dashboard block' })
  @ApiResponse({ status: 200, description: 'List of recent leads with status and department name' })
  async getRecentLeads(@Req() req: ReqUser, @Query('limit') limit?: string): Promise<DashboardRecentLeadItem[]> {
    const limitNum = Math.min(20, Math.max(1, parseInt(limit ?? '10', 10) || 10));
    return this.dashboardService.getRecentLeads(req.user.userId, req.user.role, limitNum);
  }

  @Get('departments-summary')
  @ApiOperation({ summary: 'Departments with leads count (for super/admin and managers)' })
  @ApiResponse({ status: 200, description: 'List of departments with leads count' })
  async getDepartmentsSummary(@Req() req: ReqUser): Promise<DashboardDepartmentSummaryItem[]> {
    return this.dashboardService.getDepartmentsSummary(req.user.userId, req.user.role);
  }

  @Get('top-assignees')
  @ApiOperation({ summary: 'Top assignees by leads count' })
  @ApiResponse({ status: 200, description: 'Top assignees with leads count' })
  async getTopAssignees(@Req() req: ReqUser, @Query('limit') limit?: string): Promise<DashboardTopAssigneeItem[]> {
    const limitNum = Math.min(10, Math.max(1, parseInt(limit ?? '5', 10) || 5));
    return this.dashboardService.getTopAssignees(req.user.userId, req.user.role, limitNum);
  }

  @Get('attention-counts')
  @ApiOperation({ summary: 'Counts of leads without status or unassigned' })
  @ApiResponse({ status: 200, description: 'leadsWithoutStatus, leadsUnassigned' })
  async getAttentionCounts(@Req() req: ReqUser): Promise<DashboardAttentionCounts> {
    return this.dashboardService.getAttentionCounts(req.user.userId, req.user.role);
  }

  @Get('week-events')
  @ApiOperation({ summary: 'Reminders and tasks for current week' })
  @ApiResponse({ status: 200, description: 'List of events with date and title' })
  async getWeekEvents(@Req() req: ReqUser): Promise<DashboardWeekEventItem[]> {
    return this.dashboardService.getWeekEvents(req.user.userId, req.user.role);
  }
}
