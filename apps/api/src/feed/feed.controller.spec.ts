import { Test, TestingModule } from '@nestjs/testing';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';

describe('FeedController', () => {
  let controller: FeedController;

  const mockFeedService = {
    getFeed: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedController],
      providers: [
        { provide: FeedService, useValue: mockFeedService },
      ],
    }).compile();

    controller = module.get<FeedController>(FeedController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockReq = { user: { userId: 'user-1' } };

  describe('getFeed', () => {
    it('should return feed with default params', async () => {
      const feedResult = {
        data: [{ id: 'p1', content: 'Hello' }],
        meta: { nextCursor: null, hasMore: false, limit: 20 },
      };
      mockFeedService.getFeed.mockResolvedValue(feedResult);

      const result = await controller.getFeed(mockReq, {});

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(1);
      expect(mockFeedService.getFeed).toHaveBeenCalledWith('user-1', 'recent', undefined, 20);
    });

    it('should pass top mode and cursor', async () => {
      const feedResult = {
        data: [],
        meta: { nextCursor: null, hasMore: false, limit: 10 },
      };
      mockFeedService.getFeed.mockResolvedValue(feedResult);

      await controller.getFeed(mockReq, {
        mode: 'top',
        cursor: '2024-01-01T00:00:00.000Z',
        limit: 10,
      });

      expect(mockFeedService.getFeed).toHaveBeenCalledWith(
        'user-1',
        'top',
        '2024-01-01T00:00:00.000Z',
        10,
      );
    });

    it('should return success true', async () => {
      mockFeedService.getFeed.mockResolvedValue({
        data: [],
        meta: { nextCursor: null, hasMore: false, limit: 20 },
      });

      const result = await controller.getFeed(mockReq, {});

      expect(result.success).toBe(true);
      expect(result.meta.hasMore).toBe(false);
    });

    it('should pass cursor for pagination', async () => {
      mockFeedService.getFeed.mockResolvedValue({
        data: [],
        meta: { nextCursor: null, hasMore: false, limit: 20 },
      });

      await controller.getFeed(mockReq, { cursor: '2024-06-01T00:00:00Z' });

      expect(mockFeedService.getFeed).toHaveBeenCalledWith(
        'user-1',
        'recent',
        '2024-06-01T00:00:00Z',
        20,
      );
    });

    it('should handle custom limit', async () => {
      mockFeedService.getFeed.mockResolvedValue({
        data: [],
        meta: { nextCursor: null, hasMore: false, limit: 5 },
      });

      await controller.getFeed(mockReq, { limit: 5 });

      expect(mockFeedService.getFeed).toHaveBeenCalledWith('user-1', 'recent', undefined, 5);
    });
  });
});
