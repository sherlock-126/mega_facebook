import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsOptional, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { MAX_COMMENT_LENGTH } from '../constants/comment.constants';

export class CreateCommentDto {
  @ApiProperty({ description: 'Post ID to comment on' })
  @IsUUID()
  postId!: string;

  @ApiPropertyOptional({ description: 'Parent comment ID for replies' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiProperty({ description: 'Comment content', maxLength: MAX_COMMENT_LENGTH })
  @IsString()
  @IsNotEmpty({ message: 'Comment content cannot be empty' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(MAX_COMMENT_LENGTH)
  content!: string;
}
