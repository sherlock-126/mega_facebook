import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockService } from '../block/block.service';
import { FriendshipStatus } from '@prisma/client';

@Injectable()
export class FriendshipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockService: BlockService,
  ) {}

  async sendRequest(requesterId: string, addresseeId: string) {
    if (requesterId === addresseeId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    // Check addressee exists
    const addressee = await this.prisma.user.findUnique({
      where: { id: addresseeId },
    });
    if (!addressee) {
      throw new NotFoundException('User not found');
    }

    // Check if either user has blocked the other
    const blocked = await this.blockService.isBlocked(requesterId, addresseeId);
    if (blocked) {
      throw new ForbiddenException('Cannot send friend request to this user');
    }

    // Check for existing friendship in either direction
    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });

    if (existing) {
      if (existing.status === FriendshipStatus.ACCEPTED) {
        throw new ConflictException('Already friends');
      }

      if (existing.status === FriendshipStatus.PENDING) {
        // Reverse pending: B→A pending, A sends to B → auto-accept
        if (existing.requesterId === addresseeId) {
          const updated = await this.prisma.friendship.update({
            where: { id: existing.id },
            data: { status: FriendshipStatus.ACCEPTED },
          });
          return updated;
        }
        throw new ConflictException('Friend request already sent');
      }

      if (existing.status === FriendshipStatus.REJECTED) {
        // Re-request after REJECTED: delete old, create fresh
        await this.prisma.friendship.delete({ where: { id: existing.id } });
      }
    }

    try {
      return await this.prisma.friendship.create({
        data: { requesterId, addresseeId },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Race condition: check what exists now
        const check = await this.prisma.friendship.findFirst({
          where: {
            OR: [
              { requesterId, addresseeId },
              { requesterId: addresseeId, addresseeId: requesterId },
            ],
          },
        });
        if (check?.status === FriendshipStatus.ACCEPTED) {
          throw new ConflictException('Already friends');
        }
        throw new ConflictException('Friend request already sent');
      }
      throw error;
    }
  }

  async acceptRequest(friendshipId: string, userId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });
    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }
    if (friendship.addresseeId !== userId) {
      throw new ForbiddenException('Only the addressee can accept this request');
    }
    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new ConflictException('Request is no longer pending');
    }

    return this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: FriendshipStatus.ACCEPTED },
    });
  }

  async rejectRequest(friendshipId: string, userId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });
    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }
    if (friendship.addresseeId !== userId) {
      throw new ForbiddenException('Only the addressee can reject this request');
    }
    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new ConflictException('Request is no longer pending');
    }

    return this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: FriendshipStatus.REJECTED },
    });
  }

  async unfriend(userId: string, otherUserId: string) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: otherUserId },
          { requesterId: otherUserId, addresseeId: userId },
        ],
      },
    });

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    await this.prisma.friendship.delete({ where: { id: friendship.id } });
    return { message: 'Unfriended successfully' };
  }

  async listFriends(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [friendships, total] = await Promise.all([
      this.prisma.friendship.findMany({
        where: {
          status: FriendshipStatus.ACCEPTED,
          OR: [{ requesterId: userId }, { addresseeId: userId }],
        },
        include: {
          requester: { include: { profile: true } },
          addressee: { include: { profile: true } },
        },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.friendship.count({
        where: {
          status: FriendshipStatus.ACCEPTED,
          OR: [{ requesterId: userId }, { addresseeId: userId }],
        },
      }),
    ]);

    const data = friendships.map((f) => {
      const friend = f.requesterId === userId ? f.addressee : f.requester;
      return {
        userId: friend.id,
        displayName: friend.profile?.displayName ?? null,
        avatarUrl: friend.profile?.avatarKey ?? null,
        friendsSince: f.updatedAt,
      };
    });

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async listIncomingRequests(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      this.prisma.friendship.findMany({
        where: { addresseeId: userId, status: FriendshipStatus.PENDING },
        include: {
          requester: { include: { profile: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.friendship.count({
        where: { addresseeId: userId, status: FriendshipStatus.PENDING },
      }),
    ]);

    const data = requests.map((r) => ({
      id: r.id,
      requester: {
        userId: r.requester.id,
        displayName: r.requester.profile?.displayName ?? null,
        avatarUrl: r.requester.profile?.avatarKey ?? null,
      },
      createdAt: r.createdAt,
    }));

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async listOutgoingRequests(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      this.prisma.friendship.findMany({
        where: { requesterId: userId, status: FriendshipStatus.PENDING },
        include: {
          addressee: { include: { profile: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.friendship.count({
        where: { requesterId: userId, status: FriendshipStatus.PENDING },
      }),
    ]);

    const data = requests.map((r) => ({
      id: r.id,
      addressee: {
        userId: r.addressee.id,
        displayName: r.addressee.profile?.displayName ?? null,
        avatarUrl: r.addressee.profile?.avatarKey ?? null,
      },
      createdAt: r.createdAt,
    }));

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getFriendIds(userId: string): Promise<string[]> {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      select: { requesterId: true, addresseeId: true },
    });

    return friendships.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId,
    );
  }

  async getStatus(userId: string, otherUserId: string) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: otherUserId },
          { requesterId: otherUserId, addresseeId: userId },
        ],
      },
    });

    if (!friendship) {
      return { status: 'NONE' as const };
    }

    if (friendship.status === FriendshipStatus.ACCEPTED) {
      return { status: 'FRIENDS' as const, friendshipId: friendship.id };
    }

    if (friendship.status === FriendshipStatus.PENDING) {
      if (friendship.requesterId === userId) {
        return { status: 'PENDING_SENT' as const, friendshipId: friendship.id };
      }
      return { status: 'PENDING_RECEIVED' as const, friendshipId: friendship.id };
    }

    return { status: 'NONE' as const };
  }
}
