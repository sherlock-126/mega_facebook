import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [AuthService],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('login should return 501 not implemented', async () => {
    const result = await controller.login({ email: 'test@test.com', password: 'password' });
    expect(result.statusCode).toBe(HttpStatus.NOT_IMPLEMENTED);
  });

  it('getProfile should return user from request', () => {
    const req = { user: { userId: '123', email: 'test@test.com' } };
    const result = controller.getProfile(req);
    expect(result).toEqual({ userId: '123', email: 'test@test.com' });
  });
});
