import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { PaginationQueryDto } from '../friendship/dto/pagination-query.dto';

@ApiTags('comments')
@Controller('comments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a comment or reply' })
  @ApiResponse({ status: 201, description: 'Comment created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Post or parent comment not found' })
  async create(
    @Request() req: { user: { userId: string } },
    @Body() dto: CreateCommentDto,
  ) {
    const data = await this.commentService.create(req.user.userId, dto);
    return { success: true, data };
  }

  @Get('post/:postId')
  @ApiOperation({ summary: 'List top-level comments for a post' })
  @ApiResponse({ status: 200, description: 'Comments listed' })
  async listByPost(
    @Request() req: { user: { userId: string } },
    @Param('postId', ParseUUIDPipe) postId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const { page = 1, limit = 20 } = query;
    const result = await this.commentService.listByPost(
      postId,
      req.user.userId,
      page,
      limit,
    );
    return { success: true, ...result };
  }

  @Get(':commentId/replies')
  @ApiOperation({ summary: 'List replies for a comment' })
  @ApiResponse({ status: 200, description: 'Replies listed' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async listReplies(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const { page = 1, limit = 20 } = query;
    const result = await this.commentService.listReplies(commentId, page, limit);
    return { success: true, ...result };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a comment (author only)' })
  @ApiResponse({ status: 200, description: 'Comment updated' })
  @ApiResponse({ status: 403, description: 'Not the author' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async update(
    @Request() req: { user: { userId: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommentDto,
  ) {
    const data = await this.commentService.update(id, req.user.userId, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a comment (author only)' })
  @ApiResponse({ status: 200, description: 'Comment deleted' })
  @ApiResponse({ status: 403, description: 'Not the author' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async remove(
    @Request() req: { user: { userId: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.commentService.softDelete(id, req.user.userId);
    return { success: true, data };
  }
}
