import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PostService } from '../post/post.service';
import { MediaService } from '../media/media.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly postService: PostService,
    private readonly mediaService: MediaService,
  ) {}

  async create(userId: string, dto: CreateCommentDto) {
    // Validate post exists and user has access
    await this.postService.findOne(dto.postId, userId);

    if (dto.parentId) {
      const parent = await this.prisma.comment.findFirst({
        where: { id: dto.parentId, deletedAt: null },
      });
      if (!parent) {
        throw new NotFoundException('Parent comment not found');
      }
      if (parent.postId !== dto.postId) {
        throw new BadRequestException('Parent comment belongs to a different post');
      }
      if (parent.parentId !== null) {
        throw new BadRequestException('Replies can only be one level deep');
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        postId: dto.postId,
        userId,
        parentId: dto.parentId ?? null,
        content: dto.content,
      },
      include: {
        user: { include: { profile: true } },
        _count: { select: { replies: true } },
      },
    });

    return this.formatCommentResponse(comment);
  }

  async listByPost(postId: string, userId: string, page: number = 1, limit: number = 20) {
    // Validate post access
    await this.postService.findOne(postId, userId);

    const skip = (page - 1) * limit;
    const where = {
      postId,
      parentId: null,
      deletedAt: null,
    };

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        include: {
          user: { include: { profile: true } },
          _count: { select: { replies: { where: { deletedAt: null } } } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.comment.count({ where }),
    ]);

    const data = await Promise.all(
      comments.map((c: any) => this.formatCommentResponse(c)),
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

  async listReplies(commentId: string, page: number = 1, limit: number = 20) {
    const parent = await this.prisma.comment.findFirst({
      where: { id: commentId },
    });
    if (!parent) {
      throw new NotFoundException('Comment not found');
    }

    const skip = (page - 1) * limit;
    const where = {
      parentId: commentId,
      deletedAt: null,
    };

    const [replies, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        include: {
          user: { include: { profile: true } },
          _count: { select: { replies: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.comment.count({ where }),
    ]);

    const data = await Promise.all(
      replies.map((r: any) => this.formatCommentResponse(r)),
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

  async update(commentId: string, userId: string, dto: UpdateCommentDto) {
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.deletedAt) {
      throw new BadRequestException('Cannot edit a deleted comment');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { content: dto.content },
      include: {
        user: { include: { profile: true } },
        _count: { select: { replies: true } },
      },
    });

    return this.formatCommentResponse(updated);
  }

  async softDelete(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.deletedAt) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    return { message: 'Comment deleted' };
  }

  private async formatCommentResponse(comment: any) {
    const avatarUrl = comment.user?.profile?.avatarKey
      ? await this.mediaService.getSignedUrl(comment.user.profile.avatarKey)
      : null;

    return {
      id: comment.id,
      postId: comment.postId,
      userId: comment.userId,
      parentId: comment.parentId,
      content: comment.content,
      author: {
        displayName: comment.user?.profile?.displayName ?? null,
        avatarUrl,
      },
      replyCount: comment._count?.replies ?? 0,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      isEdited: comment.updatedAt > comment.createdAt,
      isDeleted: comment.deletedAt !== null,
    };
  }
}
