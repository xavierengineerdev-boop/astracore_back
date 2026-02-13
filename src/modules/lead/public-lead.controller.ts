import { Body, Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { LeadService } from './lead.service';
import { CreateLeadFromSiteDto } from './dto/create-lead-from-site.dto';

@ApiTags('leads')
@Controller('leads')
export class PublicLeadController {
  constructor(private readonly leadService: LeadService) {}

  @Post('from-site')
  @ApiOperation({ summary: 'Create lead from site form (by site token, no auth)' })
  @ApiBody({ type: CreateLeadFromSiteDto })
  @ApiResponse({ status: 201, description: 'Lead created' })
  async createFromSite(@Req() req: Request, @Body() dto: CreateLeadFromSiteDto) {
    const ip = (req.ip ?? (req as any).connection?.remoteAddress ?? req.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '').trim();
    const userAgent = (req.get('user-agent') ?? '').trim();
    const referrer = (req.get('referer') ?? req.get('referrer') ?? '').trim();
    return this.leadService.createFromSiteToken(
      {
        token: dto.token,
        name: dto.name,
        phone: dto.phone?.trim(),
        email: dto.email?.trim(),
        additionalInfo: dto.additionalInfo?.trim(),
        sourceMeta: dto.sourceMeta,
      },
      { ip, userAgent, referrer },
    );
  }
}
