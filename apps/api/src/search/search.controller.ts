import {
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchService } from './search.service';
import { SearchIndexerService } from './search-indexer.service';
import { PrismaService } from '../prisma/prisma.service';
import { SearchQueryDto, SearchType, ReindexQueryDto, ReindexTarget } from './dto/search-query.dto';

@ApiTags('search')
@Controller('search')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly indexerService: SearchIndexerService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Global search for users and posts' })
  @ApiResponse({ status: 200, description: 'Search results' })
  @ApiResponse({ status: 400, description: 'Invalid query' })
  @ApiResponse({ status: 503, description: 'Search unavailable' })
  async search(
    @Request() req: { user: { userId: string } },
    @Query() query: SearchQueryDto,
  ) {
    const result = await this.searchService.search(
      req.user.userId,
      query.q,
      query.type ?? SearchType.ALL,
      query.page ?? 1,
      query.limit ?? 20,
    );
    return { success: true, ...result };
  }

  @Post('reindex')
  @ApiOperation({ summary: 'Reindex data into Elasticsearch (admin)' })
  @ApiResponse({ status: 200, description: 'Reindex completed' })
  async reindex(
    @Query() query: ReindexQueryDto,
  ) {
    const target = query.target ?? ReindexTarget.ALL;
    const result: { usersIndexed?: number; postsIndexed?: number } = {};

    if (target === ReindexTarget.ALL || target === ReindexTarget.USERS) {
      const users = await this.prisma.user.findMany({
        where: { status: 'ACTIVE' },
        include: { profile: true },
      });

      const userDocs = users
        .filter((u: any) => u.profile)
        .map((u: any) => ({
          userId: u.id,
          firstName: u.profile.firstName,
          lastName: u.profile.lastName,
          displayName: u.profile.displayName,
          bio: u.profile.bio,
          location: u.profile.location,
          avatarKey: u.profile.avatarKey,
          status: u.status,
          createdAt: u.createdAt,
        }));

      result.usersIndexed = await this.indexerService.bulkIndexUsers(userDocs);
    }

    if (target === ReindexTarget.ALL || target === ReindexTarget.POSTS) {
      const posts = await this.prisma.post.findMany({
        where: { deletedAt: null },
        include: { author: { include: { profile: true } } },
      });

      const postDocs = posts.map((p: any) => ({
        postId: p.id,
        authorId: p.authorId,
        authorName: p.author?.profile?.displayName ?? null,
        authorAvatar: p.author?.profile?.avatarKey ?? null,
        content: p.content,
        visibility: p.visibility,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));

      result.postsIndexed = await this.indexerService.bulkIndexPosts(postDocs);
    }

    return { success: true, data: result };
  }
}
