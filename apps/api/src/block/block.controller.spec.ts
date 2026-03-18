import { Test, TestingModule } from '@nestjs/testing';
import { BlockController } from './block.controller';
import { BlockService } from './block.service';

describe('BlockController', () => {
  let controller: BlockController;

  const mockBlockService = {
    blockUser: jest.fn(),
    unblockUser: jest.fn(),
    listBlockedUsers: jest.fn(),
    getBlockStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlockController],
      providers: [
        { provide: BlockService, useValue: mockBlockService },
      ],
    }).compile();

    controller = module.get<BlockController>(BlockController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockReq = { user: { userId: 'user1' } };

  describe('blockUser', () => {
    it('should return success with block data', async () => {
      const blockData = { id: 'block1', blockerId: 'user1', blockedId: 'user2', createdAt: new Date() };
      mockBlockService.blockUser.mockResolvedValue(blockData);

      const result = await controller.blockUser(mockReq, 'user2');
      expect(result).toEqual({ success: true, data: blockData });
      expect(mockBlockService.blockUser).toHaveBeenCalledWith('user1', 'user2');
    });
  });

  describe('unblockUser', () => {
    it('should return success with message', async () => {
      mockBlockService.unblockUser.mockResolvedValue({ message: 'User unblocked successfully' });

      const result = await controller.unblockUser(mockReq, 'user2');
      expect(result).toEqual({ success: true, data: { message: 'User unblocked successfully' } });
    });
  });

  describe('listBlockedUsers', () => {
    it('should return paginated list', async () => {
      const listResult = {
        data: [{ userId: 'user2', displayName: 'User 2', avatarUrl: null, blockedAt: new Date() }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      mockBlockService.listBlockedUsers.mockResolvedValue(listResult);

      const result = await controller.listBlockedUsers(mockReq, { page: 1, limit: 20 } as any);
      expect(result).toEqual({ success: true, ...listResult });
    });
  });

  describe('getBlockStatus', () => {
    it('should return block status', async () => {
      mockBlockService.getBlockStatus.mockResolvedValue({ isBlocked: true, isBlockedBy: false });

      const result = await controller.getBlockStatus(mockReq, 'user2');
      expect(result).toEqual({ success: true, data: { isBlocked: true, isBlockedBy: false } });
    });
  });
});
