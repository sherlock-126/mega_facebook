import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PresenceService } from './presence.service';
import { BatchPresenceQueryDto } from './dto/batch-presence.dto';

@ApiTags('presence')
@Controller('presence')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PresenceController {
  constructor(
    private readonly presenceService: PresenceService,
    private readonly prismaService: PrismaService,
  ) {}

  @Get(':userId')
  @ApiOperation({ summary: 'Get presence status of a user' })
  @ApiResponse({ status: 200, description: 'Presence data returned' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getPresence(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Request() req: { user: { userId: string } },
  ) {
    const user = await this.prismaService.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const data = await this.presenceService.getPresence(userId, req.user.userId);
    return { success: true, data };
  }

  @Post('batch')
  @ApiOperation({ summary: 'Get presence status for multiple users' })
  @ApiResponse({ status: 200, description: 'Batch presence data returned' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async getBatchPresence(
    @Body() dto: BatchPresenceQueryDto,
    @Request() req: { user: { userId: string } },
  ) {
    const data = await this.presenceService.getBatchPresence(dto.userIds, req.user.userId);
    return { success: true, data };
  }
}
