import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsMongoId, IsDateString } from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ example: 'Дизайн сайта' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Описание задачи' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'ID отдела' })
  @IsString()
  @IsMongoId()
  departmentId: string;

  @ApiPropertyOptional({ description: 'ID блока/колонки (из task-statuses отдела)' })
  @IsOptional()
  @IsString()
  @IsMongoId()
  statusId?: string;

  @ApiPropertyOptional({ description: 'ID приоритета (из task-priorities отдела)' })
  @IsOptional()
  @IsString()
  @IsMongoId()
  priorityId?: string;

  @ApiPropertyOptional({ description: 'ID исполнителя' })
  @IsOptional()
  @IsString()
  @IsMongoId()
  assigneeId?: string;

  @ApiPropertyOptional({ example: '2026-02-15T12:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueAt?: string;
}
