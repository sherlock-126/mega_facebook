import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessageService } from './message.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MessageQueryDto } from './dto/message-query.dto';
import { PaginationQueryDto } from '../friendship/dto/pagination-query.dto';

@ApiTags('conversations')
@Controller('conversations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create or get existing 1-1 conversation' })
  @ApiResponse({ status: 201, description: 'Conversation created or retrieved' })
  @ApiResponse({ status: 400, description: 'Self-conversation' })
  @ApiResponse({ status: 404, description: 'Participant not found' })
  async createConversation(
    @Request() req: { user: { userId: string } },
    @Body() dto: CreateConversationDto,
  ) {
    const data = await this.messageService.createOrGetConversation(req.user.userId, dto);
    return { success: true, data };
  }

  @Get()
  @ApiOperation({ summary: 'List conversations with last message and unread count' })
  @ApiResponse({ status: 200, description: 'Conversations listed' })
  async listConversations(
    @Request() req: { user: { userId: string } },
    @Query() query: PaginationQueryDto,
  ) {
    const { page = 1, limit = 20 } = query;
    const result = await this.messageService.listConversations(req.user.userId, page, limit);
    return { success: true, ...result };
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get messages for a conversation with cursor pagination' })
  @ApiResponse({ status: 200, description: 'Messages listed' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getMessages(
    @Request() req: { user: { userId: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: MessageQueryDto,
  ) {
    const result = await this.messageService.getMessages(
      id,
      req.user.userId,
      query.cursor,
      query.limit || 50,
    );
    return { success: true, ...result };
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a message to a conversation' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async sendMessage(
    @Request() req: { user: { userId: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    const data = await this.messageService.sendMessage(id, req.user.userId, dto);
    return { success: true, data };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  @ApiResponse({ status: 200, description: 'Conversation marked as read' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async markAsRead(
    @Request() req: { user: { userId: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.messageService.markAsRead(id, req.user.userId);
    return { success: true, data };
  }
}
