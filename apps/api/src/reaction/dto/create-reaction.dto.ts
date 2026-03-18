import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { ReactionType, ReactionTargetType } from '@prisma/client';

export class CreateReactionDto {
  @ApiProperty({ enum: ReactionTargetType })
  @IsEnum(ReactionTargetType)
  targetType!: ReactionTargetType;

  @ApiProperty({ description: 'UUID of the target (post or comment)' })
  @IsUUID()
  targetId!: string;

  @ApiProperty({ enum: ReactionType })
  @IsEnum(ReactionType)
  type!: ReactionType;
}
