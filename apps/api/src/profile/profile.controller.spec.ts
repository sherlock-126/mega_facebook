import { Test, TestingModule } from '@nestjs/testing';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

describe('ProfileController', () => {
  let controller: ProfileController;

  const mockProfileService = {
    getMyProfile: jest.fn(),
    updateMyProfile: jest.fn(),
    getPublicProfile: jest.fn(),
    uploadAvatar: jest.fn(),
    uploadCover: jest.fn(),
    deleteAvatar: jest.fn(),
    deleteCover: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [{ provide: ProfileService, useValue: mockProfileService }],
    }).compile();

    controller = module.get<ProfileController>(ProfileController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyProfile', () => {
    it('should return success with profile data', async () => {
      const profileData = { id: 'p-id', email: 'test@test.com', firstName: 'John' };
      mockProfileService.getMyProfile.mockResolvedValue(profileData);

      const result = await controller.getMyProfile({ user: { userId: 'user-id' } });

      expect(result).toEqual({ success: true, data: profileData });
      expect(mockProfileService.getMyProfile).toHaveBeenCalledWith('user-id');
    });
  });

  describe('updateMyProfile', () => {
    it('should return success with updated profile', async () => {
      const updated = { id: 'p-id', firstName: 'Jane' };
      mockProfileService.updateMyProfile.mockResolvedValue(updated);
      const dto = { firstName: 'Jane' };

      const result = await controller.updateMyProfile({ user: { userId: 'user-id' } }, dto);

      expect(result).toEqual({ success: true, data: updated });
      expect(mockProfileService.updateMyProfile).toHaveBeenCalledWith('user-id', dto);
    });
  });

  describe('getPublicProfile', () => {
    it('should return success with public profile', async () => {
      const publicProfile = { displayName: 'JohnD', bio: 'Hi' };
      mockProfileService.getPublicProfile.mockResolvedValue(publicProfile);

      const result = await controller.getPublicProfile('user-uuid');

      expect(result).toEqual({ success: true, data: publicProfile });
      expect(mockProfileService.getPublicProfile).toHaveBeenCalledWith('user-uuid');
    });
  });

  describe('uploadAvatar', () => {
    it('should return success with avatar URL', async () => {
      const data = { avatarUrl: 'https://signed-url.com' };
      mockProfileService.uploadAvatar.mockResolvedValue(data);
      const file = { originalname: 'photo.jpg', buffer: Buffer.from('x'), mimetype: 'image/jpeg' } as Express.Multer.File;

      const result = await controller.uploadAvatar({ user: { userId: 'user-id' } }, file);

      expect(result).toEqual({ success: true, data });
    });
  });

  describe('uploadCover', () => {
    it('should return success with cover URL', async () => {
      const data = { coverPhotoUrl: 'https://signed-url.com' };
      mockProfileService.uploadCover.mockResolvedValue(data);
      const file = { originalname: 'cover.png', buffer: Buffer.from('x'), mimetype: 'image/png' } as Express.Multer.File;

      const result = await controller.uploadCover({ user: { userId: 'user-id' } }, file);

      expect(result).toEqual({ success: true, data });
    });
  });

  describe('deleteAvatar', () => {
    it('should return success message', async () => {
      mockProfileService.deleteAvatar.mockResolvedValue({ message: 'Avatar deleted' });

      const result = await controller.deleteAvatar({ user: { userId: 'user-id' } });

      expect(result).toEqual({ success: true, message: 'Avatar deleted' });
    });
  });

  describe('deleteCover', () => {
    it('should return success message', async () => {
      mockProfileService.deleteCover.mockResolvedValue({ message: 'Cover photo deleted' });

      const result = await controller.deleteCover({ user: { userId: 'user-id' } });

      expect(result).toEqual({ success: true, message: 'Cover photo deleted' });
    });
  });
});
