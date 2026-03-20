import { IsOptional, IsInt, Min, Max, IsString, IsIn, IsBooleanString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DEFAULT_NOTIFICATION_LIMIT, MAX_NOTIFICATION_LIMIT } from '../constants/notification.constants';

const VALID_NOTIFICATION_TYPES = [
  'NEW_MESSAGE',
  'FRIEND_REQUEST',
  'FRIEND_ACCEPTED',
  'REACTION',
  'COMMENT',
  'COMMENT_REPLY',
];

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

  @ApiPropertyOptional({
    description: 'Comma-separated NotificationType values (e.g., FRIEND_REQUEST,COMMENT)',
  })
  @IsOptional()
  @IsString()
  type!: string;

  @ApiPropertyOptional({
    description: 'Filter by read status (true/false)',
  })
  @IsOptional()
  @IsBooleanString()
  isRead!: string;
}
