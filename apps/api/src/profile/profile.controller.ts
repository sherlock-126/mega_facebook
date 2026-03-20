import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AVATAR_MAX_SIZE, COVER_MAX_SIZE } from './constants/profile.constants';

@ApiTags('profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyProfile(@Request() req: { user: { userId: string } }) {
    const data = await this.profileService.getMyProfile(req.user.userId);
    return { success: true, data };
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateMyProfile(
    @Request() req: { user: { userId: string } },
    @Body() dto: UpdateProfileDto,
  ) {
    const data = await this.profileService.updateMyProfile(req.user.userId, dto);
    return { success: true, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get public profile by user ID' })
  @ApiResponse({ status: 200, description: 'Public profile retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getPublicProfile(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.profileService.getPublicProfile(id);
    return { success: true, data };
  }

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Upload avatar' })
  @ApiResponse({ status: 201, description: 'Avatar uploaded' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadAvatar(
    @Request() req: { user: { userId: string } },
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: AVATAR_MAX_SIZE }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const data = await this.profileService.uploadAvatar(req.user.userId, file);
    return { success: true, data };
  }

  @Post('me/cover')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Upload cover photo' })
  @ApiResponse({ status: 201, description: 'Cover photo uploaded' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadCover(
    @Request() req: { user: { userId: string } },
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: COVER_MAX_SIZE }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const data = await this.profileService.uploadCover(req.user.userId, file);
    return { success: true, data };
  }

  @Delete('me/avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete avatar' })
  @ApiResponse({ status: 200, description: 'Avatar deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteAvatar(@Request() req: { user: { userId: string } }) {
    const data = await this.profileService.deleteAvatar(req.user.userId);
    return { success: true, ...data };
  }

  @Delete('me/cover')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete cover photo' })
  @ApiResponse({ status: 200, description: 'Cover photo deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteCover(@Request() req: { user: { userId: string } }) {
    const data = await this.profileService.deleteCover(req.user.userId);
    return { success: true, ...data };
  }
}
