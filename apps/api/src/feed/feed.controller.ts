import {
  Controller,
  Get,
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
import { FeedService } from './feed.service';
import { FeedQueryDto } from './dto/feed-query.dto';

@ApiTags('feed')
@Controller('feed')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  @ApiOperation({ summary: 'Get newsfeed with cursor pagination' })
  @ApiResponse({ status: 200, description: 'Feed retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getFeed(
    @Request() req: { user: { userId: string } },
    @Query() query: FeedQueryDto,
  ) {
    const { mode = 'recent', cursor, limit = 20 } = query;
    const result = await this.feedService.getFeed(
      req.user.userId,
      mode,
      cursor,
      limit,
    );
    return { success: true, ...result };
  }
}
