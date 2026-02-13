import { Controller, Get, Param, Req, Res, NotFoundException } from '@nestjs/common';
import { Request, Response } from 'express';
import { SiteService } from './site.service';
import { WIDGET_SCRIPT_TEMPLATE } from './widget-template';

/**
 * Публичный контроллер: отдаёт готовый скрипт виджета с подставленным токеном и URL API.
 * Разработчику достаточно вставить один тег <script src="https://crm/api/sites/SITE_ID/widget.js">.
 */
@Controller('sites')
export class SiteWidgetController {
  constructor(private readonly siteService: SiteService) {}

  @Get(':id/widget.js')
  async getWidgetScript(
    @Param('id') id: string,
    @Req() req: Request,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const site = await this.siteService.findById(id);
    if (!site) {
      throw new NotFoundException('Site not found');
    }
    const protocol = (req.get('x-forwarded-proto') as string) || req.protocol || 'https';
    const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:3000';
    const apiBase = `${protocol}://${host}/api`.replace(/\/$/, '');
    let script = WIDGET_SCRIPT_TEMPLATE.replace(/__API_BASE__/g, apiBase).replace(/__SITE_TOKEN__/g, site.token);
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(script);
  }
}
