import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    getProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should return success with user data', async () => {
      const user = { id: 'uuid', email: 'test@test.com', createdAt: new Date() };
      mockAuthService.register.mockResolvedValue(user);

      const result = await controller.register({ email: 'test@test.com', password: 'password123' });

      expect(result).toEqual({ success: true, data: user });
      expect(mockAuthService.register).toHaveBeenCalledWith('test@test.com', 'password123');
    });
  });

  describe('login', () => {
    it('should return success with tokens', async () => {
      const tokens = { accessToken: 'at', refreshToken: 'rt', expiresIn: 900 };
      mockAuthService.login.mockResolvedValue(tokens);

      const result = await controller.login({ email: 'test@test.com', password: 'password123' });

      expect(result).toEqual({ success: true, data: tokens });
    });
  });

  describe('refresh', () => {
    it('should return success with new tokens', async () => {
      const tokens = { accessToken: 'new-at', refreshToken: 'new-rt', expiresIn: 900 };
      mockAuthService.refresh.mockResolvedValue(tokens);

      const result = await controller.refresh({ refreshToken: 'old-rt' });

      expect(result).toEqual({ success: true, data: tokens });
    });
  });

  describe('logout', () => {
    it('should return success message', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);
      const req = { user: { userId: 'user-id', jti: 'jti-123', exp: 1234567890 } };

      const result = await controller.logout(req, { refreshToken: 'rt' });

      expect(result).toEqual({ success: true, message: 'Logged out successfully' });
      expect(mockAuthService.logout).toHaveBeenCalledWith('user-id', 'jti-123', 1234567890, 'rt');
    });
  });

  describe('forgotPassword', () => {
    it('should return success message regardless', async () => {
      mockAuthService.forgotPassword.mockResolvedValue(undefined);

      const result = await controller.forgotPassword({ email: 'test@test.com' });

      expect(result).toEqual({ success: true, message: 'If that email exists, a reset link has been sent' });
    });
  });

  describe('resetPassword', () => {
    it('should return success message', async () => {
      mockAuthService.resetPassword.mockResolvedValue(undefined);

      const result = await controller.resetPassword({ token: 'reset-token', newPassword: 'newPass123' });

      expect(result).toEqual({ success: true, message: 'Password has been reset' });
    });
  });

  describe('getProfile', () => {
    it('should return success with profile data', async () => {
      const profile = { id: 'user-id', email: 'test@test.com', status: 'ACTIVE', createdAt: new Date() };
      mockAuthService.getProfile.mockResolvedValue(profile);

      const result = await controller.getProfile({ user: { userId: 'user-id' } });

      expect(result).toEqual({ success: true, data: profile });
    });
  });
});
