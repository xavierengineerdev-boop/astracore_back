import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsMongoId, IsDateString, ValidateIf } from 'class-validator';

export class UpdateTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'ID блока/колонки; пустая строка — снять' })
  @IsOptional()
  @IsString()
  statusId?: string | null;

  @ApiPropertyOptional({ description: 'ID приоритета; пустая строка — снять' })
  @IsOptional()
  @IsString()
  priorityId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsMongoId()
  assigneeId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueAt?: string | null;

  @ApiPropertyOptional({ description: 'ID лида; пустая строка — отвязать' })
  @IsOptional()
  @IsString()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsMongoId()
  leadId?: string | null;
}
