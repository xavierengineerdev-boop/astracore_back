import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ApiCommonResponses } from '../../common';
import { HealthService } from './health.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Проверка состояния сервиса' })
  @ApiCommonResponses()
  check() {
    return this.healthService.check();
  }

  @Get('secure')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Защищённая проверка (JWT)' })
  @ApiCommonResponses()
  secure() {
    return { ok: true, secure: true };
  }
}
