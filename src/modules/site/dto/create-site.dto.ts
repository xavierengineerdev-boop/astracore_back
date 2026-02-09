import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class CreateSiteDto {
  @ApiProperty({ example: 'https://example.com' })
  @IsString()
  @MinLength(1, { message: 'URL is required' })
  url: string;

  @ApiPropertyOptional({ example: 'Лендинг продукта X' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Department ID this site belongs to' })
  @IsString()
  @MinLength(1, { message: 'Department is required' })
  departmentId: string;
}
