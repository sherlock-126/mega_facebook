import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SearchType {
  ALL = 'all',
  USERS = 'users',
  POSTS = 'posts',
}

export class SearchQueryDto {
  @ApiProperty({ minLength: 2 })
  @IsString()
  @MinLength(2)
  q!: string;

  @ApiPropertyOptional({ enum: SearchType, default: SearchType.ALL })
  @IsOptional()
  @IsEnum(SearchType)
  type?: SearchType;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export enum ReindexTarget {
  ALL = 'all',
  USERS = 'users',
  POSTS = 'posts',
}

export class ReindexQueryDto {
  @ApiPropertyOptional({ enum: ReindexTarget, default: ReindexTarget.ALL })
  @IsOptional()
  @IsEnum(ReindexTarget)
  target?: ReindexTarget;
}
