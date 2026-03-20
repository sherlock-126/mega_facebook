import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({ description: 'Participant user ID' })
  @IsUUID()
  participantId!: string;
}
