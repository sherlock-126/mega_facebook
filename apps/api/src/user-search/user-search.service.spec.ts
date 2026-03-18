import { Test, TestingModule } from '@nestjs/testing';
import { UserSearchService } from './user-search.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UserSearchService', () => {
  let service: UserSearchService;

  const mockPrisma = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserSearchService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UserSearchService>(UserSearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchUsers', () => {
    it('should return paginated search results', async () => {
      const users = [
        {
          id: 'user1',
          profile: { displayName: 'John Doe', avatarKey: null, location: 'NYC' },
        },
      ];
      mockPrisma.user.findMany.mockResolvedValue(users);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.searchUsers('John', 1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].userId).toBe('user1');
      expect(result.data[0].displayName).toBe('John Doe');
      expect(result.meta.total).toBe(1);
    });

    it('should return empty results for no matches', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const result = await service.searchUsers('zzzzz', 1, 20);
      expect(result.data).toHaveLength(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should apply correct pagination offset', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(30);

      await service.searchUsers('test', 2, 10);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should handle null profile gracefully', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user1', profile: null },
      ]);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.searchUsers('test', 1, 20);
      expect(result.data[0].displayName).toBeNull();
      expect(result.data[0].avatarUrl).toBeNull();
    });

    it('should use case-insensitive search', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.searchUsers('JOHN', 1, 20);
      const call = mockPrisma.user.findMany.mock.calls[0][0];
      expect(call.where.profile.OR[0].firstName.mode).toBe('insensitive');
    });

    it('should only search ACTIVE users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.searchUsers('test', 1, 20);
      const call = mockPrisma.user.findMany.mock.calls[0][0];
      expect(call.where.status).toBe('ACTIVE');
    });

    it('should calculate totalPages correctly', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(45);

      const result = await service.searchUsers('test', 1, 20);
      expect(result.meta.totalPages).toBe(3);
    });
  });
});
