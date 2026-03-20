import { Test, TestingModule } from '@nestjs/testing';
import { ElasticsearchService } from './elasticsearch.service';
import { ES_CLIENT } from './elasticsearch.constants';

describe('ElasticsearchService', () => {
  let service: ElasticsearchService;

  const mockClient = {
    index: jest.fn(),
    delete: jest.fn(),
    search: jest.fn(),
    bulk: jest.fn(),
    close: jest.fn(),
    cluster: { health: jest.fn() },
    indices: {
      exists: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElasticsearchService,
        { provide: ES_CLIENT, useValue: mockClient },
      ],
    }).compile();

    service = module.get<ElasticsearchService>(ElasticsearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should create indices if they do not exist', async () => {
      mockClient.indices.exists.mockResolvedValue(false);
      mockClient.indices.create.mockResolvedValue({});

      await service.onModuleInit();

      expect(mockClient.indices.exists).toHaveBeenCalledTimes(2);
      expect(mockClient.indices.create).toHaveBeenCalledTimes(2);
    });

    it('should skip index creation if indices already exist', async () => {
      mockClient.indices.exists.mockResolvedValue(true);

      await service.onModuleInit();

      expect(mockClient.indices.create).not.toHaveBeenCalled();
    });

    it('should not throw if ES is unavailable', async () => {
      mockClient.indices.exists.mockRejectedValue(new Error('Connection refused'));

      await expect(service.onModuleInit()).resolves.not.toThrow();
    });
  });

  describe('index', () => {
    it('should index a document', async () => {
      mockClient.index.mockResolvedValue({ result: 'created' });

      await service.index('test-index', 'doc-1', { field: 'value' });

      expect(mockClient.index).toHaveBeenCalledWith({
        index: 'test-index',
        id: 'doc-1',
        body: { field: 'value' },
        refresh: 'wait_for',
      });
    });
  });

  describe('delete', () => {
    it('should delete a document', async () => {
      mockClient.delete.mockResolvedValue({ result: 'deleted' });

      await service.delete('test-index', 'doc-1');

      expect(mockClient.delete).toHaveBeenCalledWith({
        index: 'test-index',
        id: 'doc-1',
        refresh: 'wait_for',
      });
    });

    it('should return null for 404 errors', async () => {
      mockClient.delete.mockRejectedValue({ meta: { statusCode: 404 } });

      const result = await service.delete('test-index', 'nonexistent');

      expect(result).toBeNull();
    });

    it('should rethrow non-404 errors', async () => {
      mockClient.delete.mockRejectedValue(new Error('Server error'));

      await expect(service.delete('test-index', 'doc-1')).rejects.toThrow('Server error');
    });
  });

  describe('search', () => {
    it('should execute search query', async () => {
      const searchResult = { hits: { total: { value: 1 }, hits: [] } };
      mockClient.search.mockResolvedValue(searchResult);

      const result = await service.search('test-index', { query: { match_all: {} } });

      expect(result).toEqual(searchResult);
      expect(mockClient.search).toHaveBeenCalledWith({
        index: 'test-index',
        body: { query: { match_all: {} } },
      });
    });
  });

  describe('isHealthy', () => {
    it('should return true when cluster is healthy', async () => {
      mockClient.cluster.health.mockResolvedValue({ status: 'green' });

      expect(await service.isHealthy()).toBe(true);
    });

    it('should return true when cluster is yellow', async () => {
      mockClient.cluster.health.mockResolvedValue({ status: 'yellow' });

      expect(await service.isHealthy()).toBe(true);
    });

    it('should return false when cluster is red', async () => {
      mockClient.cluster.health.mockResolvedValue({ status: 'red' });

      expect(await service.isHealthy()).toBe(false);
    });

    it('should return false on connection error', async () => {
      mockClient.cluster.health.mockRejectedValue(new Error('Connection refused'));

      expect(await service.isHealthy()).toBe(false);
    });
  });

  describe('onModuleDestroy', () => {
    it('should close the client', async () => {
      mockClient.close.mockResolvedValue(undefined);

      await service.onModuleDestroy();

      expect(mockClient.close).toHaveBeenCalled();
    });
  });
});
