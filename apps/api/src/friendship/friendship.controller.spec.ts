import { Test, TestingModule } from '@nestjs/testing';
import { FriendshipController } from './friendship.controller';
import { FriendshipService } from './friendship.service';

describe('FriendshipController', () => {
  let controller: FriendshipController;
  let service: FriendshipService;

  const mockService = {
    sendRequest: jest.fn(),
    acceptRequest: jest.fn(),
    rejectRequest: jest.fn(),
    unfriend: jest.fn(),
    listFriends: jest.fn(),
    listIncomingRequests: jest.fn(),
    listOutgoingRequests: jest.fn(),
    getStatus: jest.fn(),
  };

  const mockReq = { user: { userId: 'user1' } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FriendshipController],
      providers: [{ provide: FriendshipService, useValue: mockService }],
    }).compile();

    controller = module.get<FriendshipController>(FriendshipController);
    service = module.get<FriendshipService>(FriendshipService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendRequest', () => {
    it('should call service.sendRequest and return success', async () => {
      const data = { id: 'f1', status: 'PENDING' };
      mockService.sendRequest.mockResolvedValue(data);
      const result = await controller.sendRequest(mockReq, 'user2');
      expect(result).toEqual({ success: true, data });
      expect(mockService.sendRequest).toHaveBeenCalledWith('user1', 'user2');
    });
  });

  describe('getIncomingRequests', () => {
    it('should return paginated incoming requests', async () => {
      const paginatedResult = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      mockService.listIncomingRequests.mockResolvedValue(paginatedResult);
      const result = await controller.getIncomingRequests(mockReq, { page: 1, limit: 20 });
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('getOutgoingRequests', () => {
    it('should return paginated outgoing requests', async () => {
      const paginatedResult = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      mockService.listOutgoingRequests.mockResolvedValue(paginatedResult);
      const result = await controller.getOutgoingRequests(mockReq, { page: 1, limit: 20 });
      expect(result.success).toBe(true);
    });
  });

  describe('acceptRequest', () => {
    it('should call service.acceptRequest and return success', async () => {
      const data = { id: 'f1', status: 'ACCEPTED' };
      mockService.acceptRequest.mockResolvedValue(data);
      const result = await controller.acceptRequest(mockReq, 'f1');
      expect(result).toEqual({ success: true, data });
    });
  });

  describe('rejectRequest', () => {
    it('should call service.rejectRequest and return success', async () => {
      const data = { id: 'f1', status: 'REJECTED' };
      mockService.rejectRequest.mockResolvedValue(data);
      const result = await controller.rejectRequest(mockReq, 'f1');
      expect(result).toEqual({ success: true, data });
    });
  });

  describe('unfriend', () => {
    it('should call service.unfriend and return success', async () => {
      mockService.unfriend.mockResolvedValue({ message: 'Unfriended successfully' });
      const result = await controller.unfriend(mockReq, 'user2');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Unfriended successfully');
    });
  });

  describe('listFriends', () => {
    it('should return paginated friends', async () => {
      const paginatedResult = { data: [{ userId: 'user2' }], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } };
      mockService.listFriends.mockResolvedValue(paginatedResult);
      const result = await controller.listFriends(mockReq, { page: 1, limit: 20 });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getStatus', () => {
    it('should return friendship status', async () => {
      mockService.getStatus.mockResolvedValue({ status: 'NONE' });
      const result = await controller.getStatus(mockReq, 'user2');
      expect(result).toEqual({ success: true, data: { status: 'NONE' } });
    });
  });
});
