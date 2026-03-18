import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
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
import { BlockService } from './block.service';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@ApiTags('blocks')
@Controller('blocks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BlockController {
  constructor(private readonly blockService: BlockService) {}

  @Post(':userId')
  @ApiOperation({ summary: 'Block a user' })
  @ApiResponse({ status: 201, description: 'User blocked' })
  @ApiResponse({ status: 400, description: 'Cannot block yourself' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Already blocked' })
  async blockUser(
    @Request() req: { user: { userId: string } },
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    const data = await this.blockService.blockUser(req.user.userId, userId);
    return { success: true, data };
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiResponse({ status: 200, description: 'User unblocked' })
  @ApiResponse({ status: 404, description: 'Not blocked' })
  async unblockUser(
    @Request() req: { user: { userId: string } },
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    const data = await this.blockService.unblockUser(req.user.userId, userId);
    return { success: true, data };
  }

  @Get()
  @ApiOperation({ summary: 'List blocked users' })
  @ApiResponse({ status: 200, description: 'Blocked users listed' })
  async listBlockedUsers(
    @Request() req: { user: { userId: string } },
    @Query() query: PaginationQueryDto,
  ) {
    const { page = 1, limit = 20 } = query;
    const result = await this.blockService.listBlockedUsers(
      req.user.userId,
      page,
      limit,
    );
    return { success: true, ...result };
  }

  @Get('status/:userId')
  @ApiOperation({ summary: 'Check block status with user' })
  @ApiResponse({ status: 200, description: 'Block status returned' })
  async getBlockStatus(
    @Request() req: { user: { userId: string } },
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    const data = await this.blockService.getBlockStatus(req.user.userId, userId);
    return { success: true, data };
  }
}
