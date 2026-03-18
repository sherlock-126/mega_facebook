import { Test, TestingModule } from '@nestjs/testing';
import { FeedService } from './feed.service';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { FriendshipService } from '../friendship/friendship.service';
import { BlockService } from '../block/block.service';
import { PostVisibility, FriendshipStatus } from '@prisma/client';

describe('FeedService', () => {
  let service: FeedService;

  const mockPrisma = {
    friendship: {
      findMany: jest.fn(),
    },
    post: {
      findMany: jest.fn(),
    },
  };

  const mockMedia = {
    getSignedUrl: jest.fn().mockResolvedValue('https://signed-url.test'),
  };

  const mockFriendship = {};
  const mockBlockService = {
    isBlocked: jest.fn().mockResolvedValue(false),
    getBlockedUserIds: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MediaService, useValue: mockMedia },
        { provide: FriendshipService, useValue: mockFriendship },
        { provide: BlockService, useValue: mockBlockService },
      ],
    }).compile();

    service = module.get<FeedService>(FeedService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const makeMockPost = (id: string, authorId: string, overrides: any = {}) => ({
    id,
    authorId,
    content: `Post ${id}`,
    visibility: PostVisibility.PUBLIC,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    media: [],
    author: { profile: { displayName: 'User', avatarKey: null }, status: 'ACTIVE' },
    ...overrides,
  });

  describe('getFeed', () => {
    it('should return posts from friends and self', async () => {
      mockPrisma.friendship.findMany.mockResolvedValue([
        { requesterId: 'user-1', addresseeId: 'friend-1' },
      ]);
      mockPrisma.post.findMany.mockResolvedValue([
        makeMockPost('p1', 'user-1'),
        makeMockPost('p2', 'friend-1'),
      ]);

      const result = await service.getFeed('user-1', 'recent');

      expect(result.data.length).toBe(2);
      expect(result.meta.hasMore).toBe(false);
    });

    it('should handle user with no friends', async () => {
      mockPrisma.friendship.findMany.mockResolvedValue([]);
      mockPrisma.post.findMany.mockResolvedValue([
        makeMockPost('p1', 'user-1'),
      ]);

      const result = await service.getFeed('user-1', 'recent');

      expect(result.data.length).toBe(1);
    });

    it('should respect cursor pagination', async () => {
      mockPrisma.friendship.findMany.mockResolvedValue([]);
      mockPrisma.post.findMany.mockResolvedValue([]);

      const result = await service.getFeed(
        'user-1',
        'recent',
        '2024-01-01T00:00:00.000Z',
        20,
      );

      expect(result.data.length).toBe(0);
      expect(result.meta.hasMore).toBe(false);
      expect(result.meta.nextCursor).toBeNull();
    });

    it('should indicate hasMore when more posts exist', async () => {
      mockPrisma.friendship.findMany.mockResolvedValue([]);
      // Return limit + 1 posts to indicate more
      const posts = Array.from({ length: 3 }, (_, i) =>
        makeMockPost(`p${i}`, 'user-1'),
      );
      mockPrisma.post.findMany.mockResolvedValue(posts);

      const result = await service.getFeed('user-1', 'recent', undefined, 2);

      expect(result.data.length).toBe(2);
      expect(result.meta.hasMore).toBe(true);
      expect(result.meta.nextCursor).toBeDefined();
    });

    it('should return sorted posts in top mode', async () => {
      mockPrisma.friendship.findMany.mockResolvedValue([
        { requesterId: 'user-1', addresseeId: 'friend-1' },
      ]);

      const now = new Date();
      const posts = [
        makeMockPost('p1', 'stranger', { createdAt: new Date(now.getTime() - 1000) }),
        makeMockPost('p2', 'friend-1', { createdAt: new Date(now.getTime() - 2000) }),
        makeMockPost('p3', 'user-1', { createdAt: new Date(now.getTime() - 3000) }),
      ];
      mockPrisma.post.findMany.mockResolvedValue(posts);

      const result = await service.getFeed('user-1', 'top');

      expect(result.data.length).toBe(3);
    });

    it('should handle empty feed', async () => {
      mockPrisma.friendship.findMany.mockResolvedValue([]);
      mockPrisma.post.findMany.mockResolvedValue([]);

      const result = await service.getFeed('user-1', 'recent');

      expect(result.data).toEqual([]);
      expect(result.meta.hasMore).toBe(false);
      expect(result.meta.nextCursor).toBeNull();
    });

    it('should use default limit', async () => {
      mockPrisma.friendship.findMany.mockResolvedValue([]);
      mockPrisma.post.findMany.mockResolvedValue([]);

      await service.getFeed('user-1');

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 21 }),
      );
    });

    it('should resolve media URLs', async () => {
      mockPrisma.friendship.findMany.mockResolvedValue([]);
      const postWithMedia = makeMockPost('p1', 'user-1', {
        media: [
          { id: 'm1', mediaKey: 'posts/key.jpg', mimeType: 'image/jpeg', position: 0 },
        ],
      });
      mockPrisma.post.findMany.mockResolvedValue([postWithMedia]);

      const result = await service.getFeed('user-1', 'recent');

      expect(result.data[0].media[0].url).toBe('https://signed-url.test');
      expect(mockMedia.getSignedUrl).toHaveBeenCalled();
    });

    it('should extract friend IDs correctly from both directions', async () => {
      mockPrisma.friendship.findMany.mockResolvedValue([
        { requesterId: 'user-1', addresseeId: 'friend-1' },
        { requesterId: 'friend-2', addresseeId: 'user-1' },
      ]);
      mockPrisma.post.findMany.mockResolvedValue([]);

      await service.getFeed('user-1', 'recent');

      const call = mockPrisma.post.findMany.mock.calls[0][0];
      expect(call.where.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ authorId: { in: ['friend-1', 'friend-2'] } }),
        ]),
      );
    });

    it('should set isEdited correctly', async () => {
      mockPrisma.friendship.findMany.mockResolvedValue([]);
      const editedPost = makeMockPost('p1', 'user-1', {
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      });
      mockPrisma.post.findMany.mockResolvedValue([editedPost]);

      const result = await service.getFeed('user-1', 'recent');

      expect(result.data[0].isEdited).toBe(true);
    });
  });
});
