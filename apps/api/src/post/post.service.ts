import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { FriendshipService } from '../friendship/friendship.service';
import { SearchIndexerService } from '../search/search-indexer.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostVisibility } from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  MAX_MEDIA_COUNT,
  POST_MEDIA_KEY_PREFIX,
} from './constants/post.constants';

@Injectable()
export class PostService {
  private readonly logger = new Logger(PostService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
    private readonly friendshipService: FriendshipService,
    private readonly searchIndexer: SearchIndexerService,
  ) {}

  async create(
    userId: string,
    dto: CreatePostDto,
    files?: Express.Multer.File[],
  ) {
    const content = dto.content?.trim() ?? '';
    const hasMedia = files && files.length > 0;

    if (!content && !hasMedia) {
      throw new BadRequestException(
        'Post must have content or at least one media file',
      );
    }

    if (files && files.length > MAX_MEDIA_COUNT) {
      throw new BadRequestException(
        `Maximum ${MAX_MEDIA_COUNT} media files allowed`,
      );
    }

    const uploadedKeys: string[] = [];

    try {
      // Upload media files first
      if (files) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const ext = file.originalname.split('.').pop() ?? 'jpg';
          const key = `${POST_MEDIA_KEY_PREFIX}/${userId}/${randomUUID()}.${ext}`;
          await this.mediaService.upload(key, file.buffer, file.mimetype);
          uploadedKeys.push(key);
        }
      }

      // Create post + media in transaction
      const post = await this.prisma.$transaction(async (tx) => {
        const created = await tx.post.create({
          data: {
            authorId: userId,
            content,
            visibility: dto.visibility ?? PostVisibility.PUBLIC,
            media: uploadedKeys.length > 0
              ? {
                  create: uploadedKeys.map((key, position) => ({
                    mediaKey: key,
                    mimeType: files![position].mimetype,
                    position,
                  })),
                }
              : undefined,
          },
          include: {
            media: { orderBy: { position: 'asc' } },
            author: { include: { profile: true } },
          },
        });
        return created;
      });

      // Index post in Elasticsearch (fire-and-forget)
      this.searchIndexer.indexPost({
        postId: post.id,
        authorId: post.authorId,
        authorName: post.author?.profile?.displayName ?? null,
        authorAvatar: post.author?.profile?.avatarKey ?? null,
        content: post.content,
        visibility: post.visibility,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      });

      return this.formatPostResponse(post);
    } catch (error) {
      // Cleanup uploaded files on failure
      for (const key of uploadedKeys) {
        try {
          await this.mediaService.delete(key);
        } catch (cleanupErr) {
          this.logger.warn(
            `Failed to cleanup uploaded media ${key}: ${(cleanupErr as Error).message}`,
          );
        }
      }
      throw error;
    }
  }

  async findOne(postId: string, userId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      include: {
        media: { orderBy: { position: 'asc' } },
        author: { include: { profile: true } },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Visibility check
    if (post.visibility === PostVisibility.FRIENDS_ONLY && post.authorId !== userId) {
      const status = await this.friendshipService.getStatus(userId, post.authorId);
      if (status.status !== 'FRIENDS') {
        throw new ForbiddenException('You do not have access to this post');
      }
    }

    return this.formatPostResponse(post);
  }

  async findByUser(
    targetUserId: string,
    currentUserId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;
    const isOwn = targetUserId === currentUserId;

    let visibilityFilter: any;
    if (isOwn) {
      visibilityFilter = {};
    } else {
      const status = await this.friendshipService.getStatus(currentUserId, targetUserId);
      if (status.status === 'FRIENDS') {
        visibilityFilter = {};
      } else {
        visibilityFilter = { visibility: PostVisibility.PUBLIC };
      }
    }

    const where = {
      authorId: targetUserId,
      deletedAt: null,
      ...visibilityFilter,
    };

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: {
          media: { orderBy: { position: 'asc' } },
          author: { include: { profile: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.post.count({ where }),
    ]);

    const data = await Promise.all(posts.map((p) => this.formatPostResponse(p)));

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

  async update(postId: string, userId: string, dto: UpdatePostDto) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only modify your own posts');
    }

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: {
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.visibility !== undefined ? { visibility: dto.visibility } : {}),
      },
      include: {
        media: { orderBy: { position: 'asc' } },
        author: { include: { profile: true } },
      },
    });

    // Re-index updated post in Elasticsearch
    this.searchIndexer.indexPost({
      postId: updated.id,
      authorId: updated.authorId,
      authorName: (updated as any).author?.profile?.displayName ?? null,
      authorAvatar: (updated as any).author?.profile?.avatarKey ?? null,
      content: updated.content,
      visibility: updated.visibility,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });

    return this.formatPostResponse(updated);
  }

  async softDelete(postId: string, userId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only modify your own posts');
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });

    // Remove from Elasticsearch index
    this.searchIndexer.removePost(postId);

    return { message: 'Post deleted' };
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

    // Fetch reaction summary
    const reactionRows = await this.prisma.reaction.groupBy({
      by: ['type'],
      where: { targetType: 'POST', targetId: post.id },
      _count: { type: true },
    });
    const reactionByType: Record<string, number> = {};
    let reactionTotal = 0;
    for (const r of reactionRows) {
      reactionByType[r.type] = r._count.type;
      reactionTotal += r._count.type;
    }
    const topTypes = reactionRows
      .sort((a, b) => b._count.type - a._count.type)
      .slice(0, 3)
      .map((r) => r.type);

    // Fetch comment count
    const commentCount = await this.prisma.comment.count({
      where: { postId: post.id, deletedAt: null },
    });

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
      reactionSummary: {
        totalCount: reactionTotal,
        byType: reactionByType,
        topTypes,
      },
      commentCount,
    };
  }
}
