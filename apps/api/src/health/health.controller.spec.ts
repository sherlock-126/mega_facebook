import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma.health';
import { MediaHealthIndicator } from './media.health';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;

  const mockPrismaHealthIndicator = {
    isHealthy: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
  };

  const mockMediaHealthIndicator = {
    isHealthy: jest.fn().mockResolvedValue({ storage: { status: 'up' } }),
  };

  const mockHealthCheckService = {
    check: jest.fn().mockImplementation((indicators) => {
      return Promise.all(indicators.map((fn: () => Promise<unknown>) => fn()));
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: PrismaHealthIndicator, useValue: mockPrismaHealthIndicator },
        { provide: MediaHealthIndicator, useValue: mockMediaHealthIndicator },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call health check service', async () => {
    await controller.check();
    expect(healthCheckService.check).toHaveBeenCalled();
  });

  it('should check database health', async () => {
    await controller.check();
    expect(mockPrismaHealthIndicator.isHealthy).toHaveBeenCalledWith('database');
  });

  it('should check storage health', async () => {
    await controller.check();
    expect(mockMediaHealthIndicator.isHealthy).toHaveBeenCalledWith('storage');
  });
});
