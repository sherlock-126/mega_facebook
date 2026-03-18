import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DEFAULT_NOTIFICATION_LIMIT, MAX_NOTIFICATION_LIMIT } from '../constants/notification.constants';

export class NotificationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page!: number;

  @ApiPropertyOptional({ default: DEFAULT_NOTIFICATION_LIMIT, maximum: MAX_NOTIFICATION_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_NOTIFICATION_LIMIT)
  limit!: number;
}
