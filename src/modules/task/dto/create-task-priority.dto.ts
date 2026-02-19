import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskPriorityDto {
  @ApiProperty({ example: 'Высокий' })
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  name: string;

  @ApiPropertyOptional({ example: '#ef4444' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ description: 'ID отдела' })
  @IsString()
  @MinLength(1, { message: 'departmentId is required' })
  departmentId: string;
}
