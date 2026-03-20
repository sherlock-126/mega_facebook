import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PresenceController } from './presence.controller';
import { PresenceService } from './presence.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PresenceController', () => {
  let controller: PresenceController;

  const mockPresenceService = {
    getPresence: jest.fn(),
    getBatchPresence: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PresenceController],
      providers: [
        { provide: PresenceService, useValue: mockPresenceService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<PresenceController>(PresenceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPresence', () => {
    const req = { user: { userId: 'requester-1' } };

    it('should return presence data for existing user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPresenceService.getPresence.mockResolvedValue({
        userId: 'user-1',
        status: 'online',
        lastSeenAt: null,
      });

      const result = await controller.getPresence('user-1', req);

      expect(result).toEqual({
        success: true,
        data: { userId: 'user-1', status: 'online', lastSeenAt: null },
      });
      expect(mockPresenceService.getPresence).toHaveBeenCalledWith('user-1', 'requester-1');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(controller.getPresence('missing-id', req)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBatchPresence', () => {
    const req = { user: { userId: 'requester-1' } };

    it('should return batch presence data', async () => {
      const mockData = [
        { userId: 'user-1', status: 'online', lastSeenAt: null },
        { userId: 'user-2', status: 'offline', lastSeenAt: '2026-01-01T00:00:00Z' },
      ];
      mockPresenceService.getBatchPresence.mockResolvedValue(mockData);

      const result = await controller.getBatchPresence(
        { userIds: ['user-1', 'user-2'] },
        req,
      );

      expect(result).toEqual({ success: true, data: mockData });
      expect(mockPresenceService.getBatchPresence).toHaveBeenCalledWith(
        ['user-1', 'user-2'],
        'requester-1',
      );
    });
  });
});
