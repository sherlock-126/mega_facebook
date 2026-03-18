import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserSearchService } from './user-search.service';
import { SearchUsersQueryDto } from './dto/search-users-query.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserSearchController {
  constructor(private readonly userSearchService: UserSearchService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search users by name or email' })
  @ApiResponse({ status: 200, description: 'Search results' })
  @ApiResponse({ status: 400, description: 'Query too short' })
  async searchUsers(@Query() query: SearchUsersQueryDto) {
    const { q, page = 1, limit = 20 } = query;
    const result = await this.userSearchService.searchUsers(q, page, limit);
    return { success: true, ...result };
  }
}
