import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDepartmentDto {
  @ApiPropertyOptional({ example: 'Разработка' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name cannot be empty' })
  name?: string;

  @ApiPropertyOptional({ description: 'User ID of the department manager' })
  @IsOptional()
  @IsString()
  managerId?: string;
}
