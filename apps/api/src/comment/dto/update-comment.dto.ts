import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { MAX_COMMENT_LENGTH } from '../constants/comment.constants';

export class UpdateCommentDto {
  @ApiProperty({ description: 'Updated comment content', maxLength: MAX_COMMENT_LENGTH })
  @IsString()
  @IsNotEmpty({ message: 'Comment content cannot be empty' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(MAX_COMMENT_LENGTH)
  content!: string;
}
