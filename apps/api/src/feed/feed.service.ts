import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { FriendshipService } from '../friendship/friendship.service';
import { BlockService } from '../block/block.service';
import { PostVisibility, FriendshipStatus, UserStatus } from '@prisma/client';

@Injectable()
export class FeedService {
  private readonly logger = new Logger(FeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
    private readonly friendshipService: FriendshipService,
    private readonly blockService: BlockService,
  ) {}

  async getFeed(
    userId: string,
    mode: 'recent' | 'top' = 'recent',
    cursor?: string,
    limit: number = 20,
  ) {
    // Get friend IDs
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      select: { requesterId: true, addresseeId: true },
    });

    const friendIds = friendships.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId,
    );

    // Get blocked user IDs to filter from feed
    const blockedIds = await this.blockService.getBlockedUserIds(userId);

    // Build where clause: own posts (any visibility) + friends' posts (any visibility) + public posts from active non-friends
    const where: any = {
      deletedAt: null,
      author: { status: UserStatus.ACTIVE },
      ...(blockedIds.length > 0 ? { authorId: { notIn: blockedIds } } : {}),
      OR: [
        // Own posts
        { authorId: userId },
        // Friends' posts (all visibility)
        { authorId: { in: friendIds } },
        // Public posts from anyone
        { visibility: PostVisibility.PUBLIC },
      ],
    };

    if (cursor) {
      where.createdAt = { lt: new Date(cursor) };
    }

    const posts = await this.prisma.post.findMany({
      where,
      include: {
        media: { orderBy: { position: 'asc' } },
        author: { include: { profile: true } },
      },
      take: limit + 1, // Fetch one extra to determine hasMore
      orderBy: { createdAt: 'desc' },
    });

    let sortedPosts = posts;

    if (mode === 'top') {
      // Simple algorithmic ranking: score = recency + friend boost
      const friendIdSet = new Set(friendIds);
      sortedPosts = [...posts].sort((a, b) => {
        const scoreA = this.calculateScore(a, userId, friendIdSet);
        const scoreB = this.calculateScore(b, userId, friendIdSet);
        return scoreB - scoreA;
      });
    }

    const hasMore = sortedPosts.length > limit;
    const resultPosts = sortedPosts.slice(0, limit);
    const lastPost = resultPosts[resultPosts.length - 1];

    const data = await Promise.all(
      resultPosts.map((post) => this.formatPostResponse(post)),
    );

    return {
      data,
      meta: {
        nextCursor: hasMore && lastPost ? lastPost.createdAt.toISOString() : null,
        hasMore,
        limit,
      },
    };
  }

  private calculateScore(
    post: any,
    userId: string,
    friendIds: Set<string>,
  ): number {
    const now = Date.now();
    const ageMs = now - post.createdAt.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    // Base recency score (decays over time)
    let score = Math.max(0, 100 - ageHours * 2);

    // Boost own posts
    if (post.authorId === userId) {
      score += 20;
    }

    // Boost friends' posts
    if (friendIds.has(post.authorId)) {
      score += 30;
    }

    // Boost posts with media
    if (post.media && post.media.length > 0) {
      score += 10;
    }

    return score;
  }

  private async formatPostResponse(post: any) {
    const mediaWithUrls = await Promise.all(
      (post.media || []).map(async (m: any) => ({
        id: m.id,
        url: await this.mediaService.getSignedUrl(m.mediaKey),
        mimeType: m.mimeType,
        position: m.position,
      })),
    );

    return {
      id: post.id,
      authorId: post.authorId,
      author: {
        displayName: post.author?.profile?.displayName ?? null,
        avatarUrl: post.author?.profile?.avatarKey
          ? await this.mediaService.getSignedUrl(post.author.profile.avatarKey)
          : null,
      },
      content: post.content,
      visibility: post.visibility,
      media: mediaWithUrls,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      isEdited: post.updatedAt > post.createdAt,
    };
  }
}
