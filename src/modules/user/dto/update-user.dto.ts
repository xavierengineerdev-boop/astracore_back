import { IsEmail, IsOptional, IsString, IsIn, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ROLES } from '../../../constants/roles.constant';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'new@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'employee', enum: ROLES })
  @IsOptional()
  @IsString()
  @IsIn(ROLES as unknown as string[], { message: 'Role must be one of: ' + ROLES.join(', ') })
  role?: string;

  @ApiPropertyOptional({ example: 'Иван' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Петров' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+380501234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Department ID to attach user to' })
  @IsOptional()
  @IsString()
  departmentId?: string;
}
