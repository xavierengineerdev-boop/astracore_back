import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateTaskPriorityDto {
  @ApiPropertyOptional({ example: 'Срочно' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '#dc2626' })
  @IsOptional()
  @IsString()
  color?: string;
}
