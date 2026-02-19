import { IsString, IsOptional, MinLength, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateTaskStatusDto {
  @ApiProperty({ example: 'Новые задачи' })
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  name: string;

  @ApiPropertyOptional({ example: '#9ca3af' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Статус «выполнено» — задачи с этим статусом не попадают в «Просрочено»' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  isCompleted?: boolean;

  @ApiProperty({ description: 'ID отдела' })
  @IsString()
  @MinLength(1, { message: 'departmentId is required' })
  departmentId: string;
}
