import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, MinLength, IsOptional, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkCreateLeadItemDto {
  @ApiProperty({ example: 'Иван Иванов' })
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  name: string;

  @ApiProperty({ example: '+79001234567' })
  @IsString()
  @MinLength(1, { message: 'Phone is required' })
  phone: string;

  @ApiPropertyOptional({ description: 'Email (необязательно)', example: 'ivan@example.com' })
  @IsOptional()
  @IsString()
  email?: string;
}

export class BulkCreateLeadsDto {
  @ApiProperty({ description: 'Department ID' })
  @IsString()
  @MinLength(1, { message: 'Department is required' })
  departmentId: string;

  @ApiProperty({
    type: [BulkCreateLeadItemDto],
    description: 'List of leads (name, phone, optional email). Duplicates by phone in department are skipped.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkCreateLeadItemDto)
  @ArrayMinSize(1, { message: 'At least one lead is required' })
  items: BulkCreateLeadItemDto[];
}
