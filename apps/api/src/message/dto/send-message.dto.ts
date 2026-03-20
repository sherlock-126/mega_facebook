import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { MAX_MESSAGE_LENGTH } from '../constants/message.constants';

export class SendMessageDto {
  @ApiProperty({ description: 'Message content', maxLength: MAX_MESSAGE_LENGTH })
  @IsString()
  @IsNotEmpty({ message: 'Message content cannot be empty' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(MAX_MESSAGE_LENGTH)
  content!: string;
}
