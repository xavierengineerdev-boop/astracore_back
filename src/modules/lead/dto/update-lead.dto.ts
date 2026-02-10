import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';

export class UpdateLeadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statusId?: string;

  @ApiPropertyOptional({ description: 'User IDs who handle this lead (department manager or employees only)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignedTo?: string[];
}
