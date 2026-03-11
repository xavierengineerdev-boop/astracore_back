import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PhoneRuleService } from './phone-rule.service';

@ApiTags('phone-rules')
@Controller('phone-rules')
export class PhoneRuleController {
  constructor(private readonly phoneRuleService: PhoneRuleService) {}

  @Get()
  @ApiOperation({ summary: 'Список правил телефонов по странам (нормализация, валидация, отображение)' })
  @ApiResponse({ status: 200, description: 'Массив правил' })
  getAll() {
    return this.phoneRuleService.getAllRules();
  }

  @Get('normalize')
  @ApiOperation({ summary: 'Нормализовать номер по правилам; вернёт normalized, countryCode, valid' })
  @ApiResponse({ status: 200, description: 'Результат нормализации' })
  normalize(@Query('phone') phone: string) {
    return this.phoneRuleService.normalize(phone ?? '');
  }
}
