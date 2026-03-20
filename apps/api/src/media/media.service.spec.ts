import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MediaService } from './media.service';
import { S3_CLIENT } from './media.constants';

const mockSend = jest.fn();
const mockS3Client = { send: mockSend };

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://minio:9000/signed-url'),
}));

describe('MediaService', () => {
  let service: MediaService;

  beforeEach(async () => {
    mockSend.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: S3_CLIENT, useValue: mockS3Client },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                MINIO_BUCKET: 'mega-uploads',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  describe('onModuleInit', () => {
    it('should log when bucket already exists', async () => {
      mockSend.mockResolvedValueOnce({});
      await service.onModuleInit();
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should create bucket when not found', async () => {
      const notFoundError = new Error('Not Found');
      (notFoundError as any).name = 'NotFound';
      mockSend.mockRejectedValueOnce(notFoundError);
      mockSend.mockResolvedValueOnce({});

      await service.onModuleInit();
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should not crash when bucket check fails with other error', async () => {
      mockSend.mockRejectedValueOnce(new Error('Connection refused'));
      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });

    it('should not crash when bucket creation fails', async () => {
      const notFoundError = new Error('Not Found');
      (notFoundError as any).name = 'NotFound';
      mockSend.mockRejectedValueOnce(notFoundError);
      mockSend.mockRejectedValueOnce(new Error('Create failed'));

      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });

  describe('upload', () => {
    it('should upload file to default bucket', async () => {
      mockSend.mockResolvedValueOnce({});
      const result = await service.upload('test.jpg', Buffer.from('data'), 'image/jpeg');

      expect(result).toEqual({ key: 'test.jpg', bucket: 'mega-uploads' });
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should upload file to custom bucket', async () => {
      mockSend.mockResolvedValueOnce({});
      const result = await service.upload('test.jpg', Buffer.from('data'), 'image/jpeg', 'custom-bucket');

      expect(result).toEqual({ key: 'test.jpg', bucket: 'custom-bucket' });
    });
  });

  describe('getSignedUrl', () => {
    it('should return a presigned URL', async () => {
      const url = await service.getSignedUrl('test.jpg');
      expect(url).toBe('https://minio:9000/signed-url');
    });
  });

  describe('delete', () => {
    it('should delete an object', async () => {
      mockSend.mockResolvedValueOnce({});
      await expect(service.delete('test.jpg')).resolves.toBeUndefined();
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe('listFiles', () => {
    it('should return file keys', async () => {
      mockSend.mockResolvedValueOnce({
        Contents: [{ Key: 'file1.jpg' }, { Key: 'file2.jpg' }],
      });
      const result = await service.listFiles('uploads/');
      expect(result).toEqual(['file1.jpg', 'file2.jpg']);
    });

    it('should return empty array when no contents', async () => {
      mockSend.mockResolvedValueOnce({});
      const result = await service.listFiles();
      expect(result).toEqual([]);
    });
  });
});
