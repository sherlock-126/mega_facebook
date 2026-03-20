import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, IsEnum, IsOptional } from 'class-validator';
import { PostVisibility } from '@prisma/client';

export class CreatePostDto {
  @ApiPropertyOptional({ description: 'Post content text', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @ApiPropertyOptional({ enum: PostVisibility, default: PostVisibility.PUBLIC })
  @IsOptional()
  @IsEnum(PostVisibility)
  visibility?: PostVisibility;
}
