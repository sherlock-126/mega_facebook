import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PostService } from '../post/post.service';
import { MediaService } from '../media/media.service';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { ReactionTargetType, ReactionType } from '@prisma/client';
import { TOP_REACTION_COUNT } from './constants/reaction.constants';

@Injectable()
export class ReactionService {
  private readonly logger = new Logger(ReactionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly postService: PostService,
    private readonly mediaService: MediaService,
  ) {}

  async toggle(userId: string, dto: CreateReactionDto) {
    await this.validateTarget(dto.targetType, dto.targetId, userId);

    const existing = await this.prisma.reaction.findUnique({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: dto.targetType,
          targetId: dto.targetId,
        },
      },
    });

    if (existing) {
      if (existing.type === dto.type) {
        // Same type = toggle off (remove)
        await this.prisma.reaction.delete({ where: { id: existing.id } });
        return { removed: true, message: 'Reaction removed' };
      }
      // Different type = update
      const updated = await this.prisma.reaction.update({
        where: { id: existing.id },
        data: { type: dto.type },
      });
      return updated;
    }

    // New reaction
    try {
      const reaction = await this.prisma.reaction.create({
        data: {
          userId,
          targetType: dto.targetType,
          targetId: dto.targetId,
          type: dto.type,
        },
      });
      return reaction;
    } catch (error: any) {
      // Handle P2002 race condition
      if (error.code === 'P2002') {
        const current = await this.prisma.reaction.findUnique({
          where: {
            userId_targetType_targetId: {
              userId,
              targetType: dto.targetType,
              targetId: dto.targetId,
            },
          },
        });
        if (current) return current;
      }
      throw error;
    }
  }

  async remove(userId: string, targetType: ReactionTargetType, targetId: string) {
    const existing = await this.prisma.reaction.findUnique({
      where: {
        userId_targetType_targetId: { userId, targetType, targetId },
      },
    });

    if (!existing) {
      throw new NotFoundException('No reaction found');
    }

    await this.prisma.reaction.delete({ where: { id: existing.id } });
    return { message: 'Reaction removed' };
  }

  async getSummary(userId: string, targetType: ReactionTargetType, targetId: string) {
    const [reactions, userReaction] = await Promise.all([
      this.prisma.reaction.groupBy({
        by: ['type'],
        where: { targetType, targetId },
        _count: { type: true },
      }),
      this.prisma.reaction.findUnique({
        where: {
          userId_targetType_targetId: { userId, targetType, targetId },
        },
        select: { type: true },
      }),
    ]);

    const byType: Record<string, number> = {};
    let totalCount = 0;
    for (const r of reactions) {
      byType[r.type] = r._count.type;
      totalCount += r._count.type;
    }

    // Top types sorted by count descending
    const topTypes = reactions
      .sort((a, b) => b._count.type - a._count.type)
      .slice(0, TOP_REACTION_COUNT)
      .map((r) => r.type);

    return {
      totalCount,
      byType,
      topTypes,
      userReaction: userReaction ? { type: userReaction.type } : null,
    };
  }

  async getUsers(
    targetType: ReactionTargetType,
    targetId: string,
    type?: ReactionType,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { targetType, targetId };
    if (type) where.type = type;

    const [reactions, total] = await Promise.all([
      this.prisma.reaction.findMany({
        where,
        include: {
          user: { include: { profile: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.reaction.count({ where }),
    ]);

    const data = await Promise.all(
      reactions.map(async (r: any) => ({
        userId: r.userId,
        displayName: r.user?.profile?.displayName ?? null,
        avatarUrl: r.user?.profile?.avatarKey
          ? await this.mediaService.getSignedUrl(r.user.profile.avatarKey)
          : null,
        type: r.type,
      })),
    );

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async validateTarget(
    targetType: ReactionTargetType,
    targetId: string,
    userId: string,
  ) {
    if (targetType === ReactionTargetType.POST) {
      // This will throw 404/403 as needed
      await this.postService.findOne(targetId, userId);
    } else if (targetType === ReactionTargetType.COMMENT) {
      const comment = await this.prisma.comment.findFirst({
        where: { id: targetId, deletedAt: null },
        include: { post: true },
      });
      if (!comment) {
        throw new NotFoundException('Comment not found');
      }
      // Validate post access
      await this.postService.findOne(comment.postId, userId);
    } else {
      throw new BadRequestException('Invalid target type');
    }
  }
}
