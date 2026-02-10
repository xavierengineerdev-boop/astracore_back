import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, IsArray, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class LeadSourceMetaDto {
  @ApiPropertyOptional({ description: 'IP адрес' })
  @IsOptional()
  @IsString()
  ip?: string;

  @ApiPropertyOptional({ description: 'User-Agent' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Referrer' })
  @IsOptional()
  @IsString()
  referrer?: string;

  @ApiPropertyOptional({ description: 'Разрешение экрана (например 1920x1080)' })
  @IsOptional()
  @IsString()
  screen?: string;

  @ApiPropertyOptional({ description: 'Язык браузера' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Платформа (navigator.platform)' })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({ description: 'Часовой пояс' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Память устройства (GB)' })
  @IsOptional()
  @IsString()
  deviceMemory?: string;

  @ApiPropertyOptional({ description: 'Количество ядер CPU' })
  @IsOptional()
  @IsString()
  hardwareConcurrency?: string;

  @ApiPropertyOptional({ description: 'Доп. метаданные' })
  @IsOptional()
  @IsObject()
  extra?: Record<string, unknown>;
}

export class CreateLeadDto {
  @ApiProperty({ example: 'Иван Иванов' })
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  name: string;

  @ApiPropertyOptional({ description: 'Фамилия' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Второй телефон' })
  @IsOptional()
  @IsString()
  phone2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Вторая почта' })
  @IsOptional()
  @IsString()
  email2?: string;

  @ApiProperty({ description: 'Department ID' })
  @IsString()
  @MinLength(1, { message: 'Department is required' })
  departmentId: string;

  @ApiPropertyOptional({ description: 'Status ID from department statuses' })
  @IsOptional()
  @IsString()
  statusId?: string;

  @ApiPropertyOptional({ description: 'Source: manual, site, etc.' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Site ID if lead came from a site' })
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional({ description: 'Метаданные запроса (IP, userAgent, железо — при создании с сайта)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LeadSourceMetaDto)
  sourceMeta?: LeadSourceMetaDto;

  @ApiPropertyOptional({ description: 'User IDs who handle this lead (department manager or employees only)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignedTo?: string[];
}
