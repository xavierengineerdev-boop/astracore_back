import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStatusDto {
  @ApiProperty({ example: 'В работе' })
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  name: string;

  @ApiPropertyOptional({ example: 'Задача выполняется' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '#3b82f6' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ description: 'Department ID this status belongs to' })
  @IsString()
  @MinLength(1, { message: 'Department is required' })
  departmentId: string;
}
