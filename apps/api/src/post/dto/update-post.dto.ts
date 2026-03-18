import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, IsEnum, IsOptional } from 'class-validator';
import { PostVisibility } from '@prisma/client';

export class UpdatePostDto {
  @ApiPropertyOptional({ description: 'Post content text', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @ApiPropertyOptional({ enum: PostVisibility })
  @IsOptional()
  @IsEnum(PostVisibility)
  visibility?: PostVisibility;
}
