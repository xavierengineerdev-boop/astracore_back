import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeadTagDto {
  @ApiProperty({ example: 'ВКонтакте', description: 'Название тега/источника лида (база)' })
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  name: string;

  @ApiPropertyOptional({ example: 'Лиды из рекламы ВК' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '#3b82f6' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ description: 'Department ID this tag belongs to' })
  @IsString()
  @MinLength(1, { message: 'Department is required' })
  departmentId: string;
}
