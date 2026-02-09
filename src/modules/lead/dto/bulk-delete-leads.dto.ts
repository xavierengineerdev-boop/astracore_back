import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class BulkDeleteLeadsDto {
  @ApiProperty({ description: 'Lead IDs to delete', type: [String] })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one lead is required' })
  @IsString({ each: true })
  leadIds: string[];
}
