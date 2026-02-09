import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Разработка' })
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  name: string;

  @ApiPropertyOptional({ description: 'User ID of the department manager' })
  @IsOptional()
  @IsString()
  managerId?: string;
}
