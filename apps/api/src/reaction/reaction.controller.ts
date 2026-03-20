import {
  Controller,
  Get,
  Post,
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
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReactionService } from './reaction.service';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { ReactionUsersQueryDto } from './dto/reaction-query.dto';
import { ReactionTargetType } from '@prisma/client';

@ApiTags('reactions')
@Controller('reactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReactionController {
  constructor(private readonly reactionService: ReactionService) {}

  @Post()
  @ApiOperation({ summary: 'Toggle a reaction (create/update/remove)' })
  @ApiResponse({ status: 200, description: 'Reaction toggled' })
  @ApiResponse({ status: 400, description: 'Invalid target' })
  @ApiResponse({ status: 404, description: 'Target not found' })
  async toggle(
    @Request() req: { user: { userId: string } },
    @Body() dto: CreateReactionDto,
  ) {
    const data = await this.reactionService.toggle(req.user.userId, dto);
    return { success: true, data };
  }

  @Delete(':targetType/:targetId')
  @ApiOperation({ summary: 'Remove own reaction' })
  @ApiParam({ name: 'targetType', enum: ReactionTargetType })
  @ApiResponse({ status: 200, description: 'Reaction removed' })
  @ApiResponse({ status: 404, description: 'No reaction found' })
  async remove(
    @Request() req: { user: { userId: string } },
    @Param('targetType') targetType: ReactionTargetType,
    @Param('targetId', ParseUUIDPipe) targetId: string,
  ) {
    const data = await this.reactionService.remove(
      req.user.userId,
      targetType,
      targetId,
    );
    return { success: true, data };
  }

  @Get(':targetType/:targetId')
  @ApiOperation({ summary: 'Get reaction summary for a target' })
  @ApiParam({ name: 'targetType', enum: ReactionTargetType })
  @ApiResponse({ status: 200, description: 'Reaction summary' })
  async getSummary(
    @Request() req: { user: { userId: string } },
    @Param('targetType') targetType: ReactionTargetType,
    @Param('targetId', ParseUUIDPipe) targetId: string,
  ) {
    const data = await this.reactionService.getSummary(
      req.user.userId,
      targetType,
      targetId,
    );
    return { success: true, data };
  }

  @Get(':targetType/:targetId/users')
  @ApiOperation({ summary: 'List users who reacted' })
  @ApiParam({ name: 'targetType', enum: ReactionTargetType })
  @ApiResponse({ status: 200, description: 'Users listed' })
  async getUsers(
    @Param('targetType') targetType: ReactionTargetType,
    @Param('targetId', ParseUUIDPipe) targetId: string,
    @Query() query: ReactionUsersQueryDto,
  ) {
    const { type, page = 1, limit = 20 } = query;
    const result = await this.reactionService.getUsers(
      targetType,
      targetId,
      type,
      page,
      limit,
    );
    return { success: true, ...result };
  }
}
