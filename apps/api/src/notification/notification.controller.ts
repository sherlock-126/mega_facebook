import {
  Controller,
  Get,
  Patch,
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
import { NotificationService } from './notification.service';
import { NotificationQueryDto } from './dto/notification-query.dto';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications' })
  @ApiResponse({ status: 200, description: 'Notifications listed' })
  async listNotifications(
    @Request() req: { user: { userId: string } },
    @Query() query: NotificationQueryDto,
  ) {
    const { page = 1, limit = 20, type, isRead } = query;

    const filters: { type?: string[]; isRead?: boolean } = {};
    if (type) {
      filters.type = type.split(',').map((t) => t.trim());
    }
    if (isRead !== undefined) {
      filters.isRead = isRead === 'true';
    }

    const result = await this.notificationService.listNotifications(
      req.user.userId,
      page,
      limit,
      filters,
    );
    return { success: true, ...result };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count returned' })
  async getUnreadCount(@Request() req: { user: { userId: string } }) {
    const count = await this.notificationService.getUnreadCount(req.user.userId);
    return { success: true, data: { count } };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark single notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 403, description: 'Not your notification' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(
    @Request() req: { user: { userId: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.notificationService.markAsRead(id, req.user.userId);
    return { success: true, data };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@Request() req: { user: { userId: string } }) {
    const data = await this.notificationService.markAllAsRead(req.user.userId);
    return { success: true, data };
  }
}
