import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LeadSourceMetaDto } from './create-lead.dto';

export class CreateLeadFromSiteDto {
  @ApiProperty({ description: 'Токен сайта' })
  @IsString()
  @MinLength(1, { message: 'Token is required' })
  token: string;

  @ApiProperty({ example: 'Иван' })
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Дополнительная информация с формы (комментарий)' })
  @IsOptional()
  @IsString()
  additionalInfo?: string;

  @ApiPropertyOptional({ description: 'Метаданные с клиента: экран, язык, платформа, реферер и т.д.' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LeadSourceMetaDto)
  sourceMeta?: LeadSourceMetaDto;
}
