import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsMongoId, ArrayMinSize, IsOptional } from 'class-validator';

export class ReorderTasksDto {
  @ApiPropertyOptional({ description: 'ID колонки (блока); не передавать или пустая строка — «Без блока»' })
  @IsOptional()
  @IsString()
  statusId?: string;

  @ApiProperty({ description: 'Упорядоченный список ID задач', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  taskIds: string[];
}
