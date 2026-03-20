import { IsOptional, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DEFAULT_MESSAGE_LIMIT, MAX_MESSAGE_LIMIT } from '../constants/message.constants';

export class MessageQueryDto {
  @ApiPropertyOptional({ description: 'Cursor (message ID) for pagination' })
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @ApiPropertyOptional({ default: DEFAULT_MESSAGE_LIMIT, maximum: MAX_MESSAGE_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_MESSAGE_LIMIT)
  limit!: number;
}
