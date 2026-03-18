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
import { FriendshipService } from './friendship.service';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@ApiTags('friendships')
@Controller('friendships')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  @Post('request/:userId')
  @ApiOperation({ summary: 'Send friend request' })
  @ApiResponse({ status: 201, description: 'Friend request sent' })
  @ApiResponse({ status: 400, description: 'Bad request (self-request)' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Duplicate or already friends' })
  async sendRequest(
    @Request() req: { user: { userId: string } },
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    const data = await this.friendshipService.sendRequest(req.user.userId, userId);
    return { success: true, data };
  }

  @Get('requests/incoming')
  @ApiOperation({ summary: 'List incoming pending requests' })
  @ApiResponse({ status: 200, description: 'Incoming requests listed' })
  async getIncomingRequests(
    @Request() req: { user: { userId: string } },
    @Query() query: PaginationQueryDto,
  ) {
    const { page = 1, limit = 20 } = query;
    const result = await this.friendshipService.listIncomingRequests(
      req.user.userId,
      page,
      limit,
    );
    return { success: true, ...result };
  }

  @Get('requests/outgoing')
  @ApiOperation({ summary: 'List outgoing pending requests' })
  @ApiResponse({ status: 200, description: 'Outgoing requests listed' })
  async getOutgoingRequests(
    @Request() req: { user: { userId: string } },
    @Query() query: PaginationQueryDto,
  ) {
    const { page = 1, limit = 20 } = query;
    const result = await this.friendshipService.listOutgoingRequests(
      req.user.userId,
      page,
      limit,
    );
    return { success: true, ...result };
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept friend request' })
  @ApiResponse({ status: 200, description: 'Request accepted' })
  @ApiResponse({ status: 403, description: 'Not the addressee' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  @ApiResponse({ status: 409, description: 'Not pending' })
  async acceptRequest(
    @Request() req: { user: { userId: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.friendshipService.acceptRequest(id, req.user.userId);
    return { success: true, data };
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject friend request' })
  @ApiResponse({ status: 200, description: 'Request rejected' })
  @ApiResponse({ status: 403, description: 'Not the addressee' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  @ApiResponse({ status: 409, description: 'Not pending' })
  async rejectRequest(
    @Request() req: { user: { userId: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.friendshipService.rejectRequest(id, req.user.userId);
    return { success: true, data };
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Unfriend or cancel request' })
  @ApiResponse({ status: 200, description: 'Unfriended' })
  @ApiResponse({ status: 404, description: 'Friendship not found' })
  async unfriend(
    @Request() req: { user: { userId: string } },
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    const data = await this.friendshipService.unfriend(req.user.userId, userId);
    return { success: true, ...data };
  }

  @Get()
  @ApiOperation({ summary: 'List friends paginated' })
  @ApiResponse({ status: 200, description: 'Friends listed' })
  async listFriends(
    @Request() req: { user: { userId: string } },
    @Query() query: PaginationQueryDto,
  ) {
    const { page = 1, limit = 20 } = query;
    const result = await this.friendshipService.listFriends(
      req.user.userId,
      page,
      limit,
    );
    return { success: true, ...result };
  }

  @Get('status/:userId')
  @ApiOperation({ summary: 'Check friendship status with user' })
  @ApiResponse({ status: 200, description: 'Status returned' })
  async getStatus(
    @Request() req: { user: { userId: string } },
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    const data = await this.friendshipService.getStatus(req.user.userId, userId);
    return { success: true, data };
  }
}
