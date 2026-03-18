import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';

describe('ProfileService', () => {
  let service: ProfileService;

  const mockPrisma = {
    user: { findUnique: jest.fn() },
    profile: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockMediaService = {
    upload: jest.fn(),
    getSignedUrl: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MediaService, useValue: mockMediaService },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyProfile', () => {
    it('should return profile with presigned URLs when profile exists', async () => {
      const userId = 'user-uuid';
      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'test@test.com',
        profile: {
          id: 'profile-uuid',
          userId,
          firstName: 'John',
          lastName: 'Doe',
          displayName: 'JohnD',
          bio: 'Hello',
          dateOfBirth: new Date('1990-01-01'),
          gender: 'MALE',
          phoneNumber: '+1234567890',
          location: 'NYC',
          avatarKey: 'profiles/user-uuid/avatar/abc.jpg',
          coverPhotoKey: 'profiles/user-uuid/cover/xyz.jpg',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      mockMediaService.getSignedUrl.mockResolvedValue('https://signed-url.com');

      const result = await service.getMyProfile(userId);

      expect(result.email).toBe('test@test.com');
      expect(result.firstName).toBe('John');
      expect(result.avatarUrl).toBe('https://signed-url.com');
      expect(result.coverPhotoUrl).toBe('https://signed-url.com');
      expect(mockMediaService.getSignedUrl).toHaveBeenCalledTimes(2);
    });

    it('should return skeleton when no profile exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'test@test.com',
        profile: null,
      });

      const result = await service.getMyProfile('user-uuid');

      expect(result.email).toBe('test@test.com');
      expect(result.firstName).toBeNull();
      expect(result.avatarUrl).toBeNull();
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMyProfile('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMyProfile', () => {
    it('should upsert profile and return updated data', async () => {
      const userId = 'user-uuid';
      const dto = { firstName: 'Jane', bio: 'Updated bio' };

      mockPrisma.profile.upsert.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'test@test.com',
        profile: {
          id: 'profile-uuid',
          userId,
          firstName: 'Jane',
          lastName: null,
          displayName: null,
          bio: 'Updated bio',
          dateOfBirth: null,
          gender: null,
          phoneNumber: null,
          location: null,
          avatarKey: null,
          coverPhotoKey: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const result = await service.updateMyProfile(userId, dto);

      expect(result.firstName).toBe('Jane');
      expect(result.bio).toBe('Updated bio');
      expect(mockPrisma.profile.upsert).toHaveBeenCalled();
    });

    it('should convert dateOfBirth string to Date', async () => {
      const userId = 'user-uuid';
      const dto = { dateOfBirth: '1990-06-15' };

      mockPrisma.profile.upsert.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'test@test.com',
        profile: { id: 'p', userId, firstName: null, lastName: null, displayName: null, bio: null, dateOfBirth: new Date('1990-06-15'), gender: null, phoneNumber: null, location: null, avatarKey: null, coverPhotoKey: null, createdAt: new Date(), updatedAt: new Date() },
      });

      await service.updateMyProfile(userId, dto);

      const upsertCall = mockPrisma.profile.upsert.mock.calls[0][0];
      expect(upsertCall.update.dateOfBirth).toBeInstanceOf(Date);
    });
  });

  describe('getPublicProfile', () => {
    it('should return public profile fields', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        profile: {
          displayName: 'JohnD',
          bio: 'Hello',
          location: 'NYC',
          avatarKey: 'key',
          coverPhotoKey: null,
          createdAt: new Date(),
        },
      });
      mockMediaService.getSignedUrl.mockResolvedValue('https://signed.com');

      const result = await service.getPublicProfile('user-uuid');

      expect(result.displayName).toBe('JohnD');
      expect(result.avatarUrl).toBe('https://signed.com');
      expect(result.coverPhotoUrl).toBeNull();
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getPublicProfile('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when profile not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ profile: null });
      await expect(service.getPublicProfile('user-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('uploadAvatar', () => {
    const mockFile = {
      originalname: 'photo.jpg',
      buffer: Buffer.from('test'),
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    it('should upload avatar and delete old one', async () => {
      mockMediaService.upload.mockResolvedValue({ key: 'new-key', bucket: 'b' });
      mockPrisma.profile.findUnique.mockResolvedValue({ avatarKey: 'old-key' });
      mockPrisma.profile.upsert.mockResolvedValue({});
      mockMediaService.getSignedUrl.mockResolvedValue('https://avatar-url.com');

      const result = await service.uploadAvatar('user-uuid', mockFile);

      expect(result.avatarUrl).toBe('https://avatar-url.com');
      expect(mockMediaService.upload).toHaveBeenCalled();
      expect(mockMediaService.delete).toHaveBeenCalledWith('old-key');
    });

    it('should not fail if old avatar deletion fails', async () => {
      mockMediaService.upload.mockResolvedValue({ key: 'new-key', bucket: 'b' });
      mockPrisma.profile.findUnique.mockResolvedValue({ avatarKey: 'old-key' });
      mockMediaService.delete.mockRejectedValue(new Error('S3 error'));
      mockPrisma.profile.upsert.mockResolvedValue({});
      mockMediaService.getSignedUrl.mockResolvedValue('https://url.com');

      const result = await service.uploadAvatar('user-uuid', mockFile);

      expect(result.avatarUrl).toBe('https://url.com');
    });
  });

  describe('uploadCover', () => {
    const mockFile = {
      originalname: 'cover.png',
      buffer: Buffer.from('test'),
      mimetype: 'image/png',
    } as Express.Multer.File;

    it('should upload cover photo', async () => {
      mockMediaService.upload.mockResolvedValue({ key: 'new-key', bucket: 'b' });
      mockPrisma.profile.findUnique.mockResolvedValue({ coverPhotoKey: null });
      mockPrisma.profile.upsert.mockResolvedValue({});
      mockMediaService.getSignedUrl.mockResolvedValue('https://cover-url.com');

      const result = await service.uploadCover('user-uuid', mockFile);

      expect(result.coverPhotoUrl).toBe('https://cover-url.com');
      expect(mockMediaService.delete).not.toHaveBeenCalled();
    });
  });

  describe('deleteAvatar', () => {
    it('should delete avatar when it exists', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue({ avatarKey: 'avatar-key' });
      mockPrisma.profile.update.mockResolvedValue({});

      const result = await service.deleteAvatar('user-uuid');

      expect(result.message).toBe('Avatar deleted');
      expect(mockMediaService.delete).toHaveBeenCalledWith('avatar-key');
      expect(mockPrisma.profile.update).toHaveBeenCalledWith({
        where: { userId: 'user-uuid' },
        data: { avatarKey: null },
      });
    });

    it('should be idempotent when no avatar exists', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(null);

      const result = await service.deleteAvatar('user-uuid');

      expect(result.message).toBe('Avatar deleted');
      expect(mockMediaService.delete).not.toHaveBeenCalled();
    });
  });

  describe('deleteCover', () => {
    it('should delete cover when it exists', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue({ coverPhotoKey: 'cover-key' });
      mockPrisma.profile.update.mockResolvedValue({});

      const result = await service.deleteCover('user-uuid');

      expect(result.message).toBe('Cover photo deleted');
      expect(mockMediaService.delete).toHaveBeenCalledWith('cover-key');
    });

    it('should be idempotent when no cover exists', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(null);

      const result = await service.deleteCover('user-uuid');

      expect(result.message).toBe('Cover photo deleted');
      expect(mockMediaService.delete).not.toHaveBeenCalled();
    });
  });
});
