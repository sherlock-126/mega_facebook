import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  @Post('login')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  @ApiOperation({ summary: 'Login (scaffold — not yet implemented)' })
  @ApiResponse({ status: 501, description: 'Not implemented' })
  async login(@Body() _loginDto: LoginDto) {
    return {
      statusCode: HttpStatus.NOT_IMPLEMENTED,
      message: 'Login not yet implemented — see IAM epic',
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile from JWT' })
  @ApiResponse({ status: 200, description: 'User profile from token' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@Request() req: { user: { userId: string; email: string } }) {
    return req.user;
  }
}
