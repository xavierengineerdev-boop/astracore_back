import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsString, IsOptional, ArrayMinSize } from 'class-validator';

export class BulkUpdateLeadsDto {
  @ApiProperty({ description: 'Lead IDs to update', type: [String] })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one lead is required' })
  @IsString({ each: true })
  leadIds: string[];

  @ApiPropertyOptional({ description: 'Set status for all selected leads' })
  @IsOptional()
  @IsString()
  statusId?: string;

  @ApiPropertyOptional({ description: 'Set assignees for all selected leads' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignedTo?: string[];
}
