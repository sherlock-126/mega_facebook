import { Test, TestingModule } from '@nestjs/testing';
import { UserSearchController } from './user-search.controller';
import { UserSearchService } from './user-search.service';

describe('UserSearchController', () => {
  let controller: UserSearchController;

  const mockService = {
    searchUsers: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserSearchController],
      providers: [{ provide: UserSearchService, useValue: mockService }],
    }).compile();

    controller = module.get<UserSearchController>(UserSearchController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('searchUsers', () => {
    it('should return search results with success flag', async () => {
      const paginatedResult = {
        data: [{ userId: 'user1', displayName: 'John', avatarUrl: null, location: 'NYC' }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      mockService.searchUsers.mockResolvedValue(paginatedResult);

      const mockReq = { user: { userId: 'currentUser' } };
      const result = await controller.searchUsers(mockReq, { q: 'John', page: 1, limit: 20 });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockService.searchUsers).toHaveBeenCalledWith('John', 'currentUser', 1, 20);
    });

    it('should use default page and limit', async () => {
      const paginatedResult = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      mockService.searchUsers.mockResolvedValue(paginatedResult);

      const mockReq = { user: { userId: 'currentUser' } };
      await controller.searchUsers(mockReq, { q: 'test' } as any);
      expect(mockService.searchUsers).toHaveBeenCalledWith('test', 'currentUser', 1, 20);
    });

    it('should pass custom pagination params', async () => {
      const paginatedResult = { data: [], meta: { total: 0, page: 3, limit: 10, totalPages: 0 } };
      mockService.searchUsers.mockResolvedValue(paginatedResult);

      const mockReq = { user: { userId: 'currentUser' } };
      await controller.searchUsers(mockReq, { q: 'test', page: 3, limit: 10 });
      expect(mockService.searchUsers).toHaveBeenCalledWith('test', 'currentUser', 3, 10);
    });
  });
});
