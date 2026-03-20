import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsIn, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class FeedQueryDto {
  @ApiPropertyOptional({ enum: ['recent', 'top'], default: 'recent' })
  @IsOptional()
  @IsIn(['recent', 'top'])
  mode?: 'recent' | 'top';

  @ApiPropertyOptional({ description: 'Cursor for pagination (ISO date string)' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
