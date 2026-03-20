import { IsArray, IsUUID, ArrayMaxSize, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PRESENCE_BATCH_MAX } from '../constants/presence.constants';

export class BatchPresenceQueryDto {
  @ApiProperty({
    description: 'Array of user IDs to query presence for',
    type: [String],
    maxItems: PRESENCE_BATCH_MAX,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(PRESENCE_BATCH_MAX)
  @IsUUID('4', { each: true })
  userIds!: string[];
}
