import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @ApiPropertyOptional({ example: 'a1b2c3d4...' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
