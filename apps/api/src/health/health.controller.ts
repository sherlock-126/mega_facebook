import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: PrismaHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check with database status' })
  check() {
    return this.health.check([() => this.db.isHealthy('database')]);
  }
}
