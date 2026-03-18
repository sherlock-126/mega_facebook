import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FriendshipStatus } from '@prisma/client';

@Injectable()
export class BlockService {
  constructor(private readonly prisma: PrismaService) {}

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new BadRequestException('Cannot block yourself');
    }

    // Check target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: blockedId },
    });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    try {
      return await this.prisma.$transaction(async (tx: any) => {
        // Remove any existing friendship in either direction
        await tx.friendship.deleteMany({
          where: {
            OR: [
              { requesterId: blockerId, addresseeId: blockedId },
              { requesterId: blockedId, addresseeId: blockerId },
            ],
          },
        });

        // Create the block
        const block = await tx.userBlock.create({
          data: { blockerId, blockedId },
        });

        return block;
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('User is already blocked');
      }
      throw error;
    }
  }

  async unblockUser(blockerId: string, blockedId: string) {
    const block = await this.prisma.userBlock.findUnique({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
    });

    if (!block) {
      throw new NotFoundException('User is not blocked');
    }

    await this.prisma.userBlock.delete({
      where: { id: block.id },
    });

    return { message: 'User unblocked successfully' };
  }

  async listBlockedUsers(blockerId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [blocks, total] = await Promise.all([
      this.prisma.userBlock.findMany({
        where: { blockerId },
        include: {
          blocked: { include: { profile: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.userBlock.count({
        where: { blockerId },
      }),
    ]);

    const data = blocks.map((b) => ({
      userId: b.blockedId,
      displayName: b.blocked.profile?.displayName ?? null,
      avatarUrl: b.blocked.profile?.avatarKey ?? null,
      blockedAt: b.createdAt,
    }));

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getBlockStatus(userId: string, otherUserId: string) {
    const [sentBlock, receivedBlock] = await Promise.all([
      this.prisma.userBlock.findUnique({
        where: {
          blockerId_blockedId: { blockerId: userId, blockedId: otherUserId },
        },
      }),
      this.prisma.userBlock.findUnique({
        where: {
          blockerId_blockedId: { blockerId: otherUserId, blockedId: userId },
        },
      }),
    ]);

    return {
      isBlocked: !!sentBlock,
      isBlockedBy: !!receivedBlock,
    };
  }

  async isBlocked(userA: string, userB: string): Promise<boolean> {
    const block = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: userA, blockedId: userB },
          { blockerId: userB, blockedId: userA },
        ],
      },
    });
    return !!block;
  }

  async getBlockedUserIds(userId: string): Promise<string[]> {
    const blocks = await this.prisma.userBlock.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
      select: { blockerId: true, blockedId: true },
    });

    const ids = new Set<string>();
    for (const b of blocks) {
      if (b.blockerId === userId) {
        ids.add(b.blockedId);
      } else {
        ids.add(b.blockerId);
      }
    }

    return Array.from(ids);
  }
}
