import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const profile = user.profile;
    const avatarUrl = profile?.avatarKey
      ? await this.mediaService.getSignedUrl(profile.avatarKey)
      : null;
    const coverPhotoUrl = profile?.coverPhotoKey
      ? await this.mediaService.getSignedUrl(profile.coverPhotoKey)
      : null;

    return {
      id: profile?.id ?? null,
      userId,
      email: user.email,
      firstName: profile?.firstName ?? null,
      lastName: profile?.lastName ?? null,
      displayName: profile?.displayName ?? null,
      bio: profile?.bio ?? null,
      dateOfBirth: profile?.dateOfBirth ?? null,
      gender: profile?.gender ?? null,
      phoneNumber: profile?.phoneNumber ?? null,
      location: profile?.location ?? null,
      avatarUrl,
      coverPhotoUrl,
      createdAt: profile?.createdAt ?? null,
      updatedAt: profile?.updatedAt ?? null,
    };
  }

  async updateMyProfile(userId: string, dto: UpdateProfileDto) {
    const data: Record<string, unknown> = { ...dto };

    if (dto.dateOfBirth) {
      data.dateOfBirth = new Date(dto.dateOfBirth);
    }

    await this.prisma.profile.upsert({
      where: { userId },
      create: { userId, ...data } as any,
      update: data,
    });

    return this.getMyProfile(userId);
  }

  async getPublicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const profile = user.profile;
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const avatarUrl = profile.avatarKey
      ? await this.mediaService.getSignedUrl(profile.avatarKey)
      : null;
    const coverPhotoUrl = profile.coverPhotoKey
      ? await this.mediaService.getSignedUrl(profile.coverPhotoKey)
      : null;

    return {
      displayName: profile.displayName,
      bio: profile.bio,
      location: profile.location,
      avatarUrl,
      coverPhotoUrl,
      createdAt: profile.createdAt,
    };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const key = `profiles/${userId}/avatar/${randomUUID()}.${ext}`;

    await this.mediaService.upload(key, file.buffer, file.mimetype);

    const existing = await this.prisma.profile.findUnique({
      where: { userId },
      select: { avatarKey: true },
    });

    if (existing?.avatarKey) {
      try {
        await this.mediaService.delete(existing.avatarKey);
      } catch (error) {
        this.logger.warn(`Failed to delete old avatar: ${(error as Error).message}`);
      }
    }

    await this.prisma.profile.upsert({
      where: { userId },
      create: { userId, avatarKey: key },
      update: { avatarKey: key },
    });

    const avatarUrl = await this.mediaService.getSignedUrl(key);
    return { avatarUrl };
  }

  async uploadCover(userId: string, file: Express.Multer.File) {
    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const key = `profiles/${userId}/cover/${randomUUID()}.${ext}`;

    await this.mediaService.upload(key, file.buffer, file.mimetype);

    const existing = await this.prisma.profile.findUnique({
      where: { userId },
      select: { coverPhotoKey: true },
    });

    if (existing?.coverPhotoKey) {
      try {
        await this.mediaService.delete(existing.coverPhotoKey);
      } catch (error) {
        this.logger.warn(`Failed to delete old cover photo: ${(error as Error).message}`);
      }
    }

    await this.prisma.profile.upsert({
      where: { userId },
      create: { userId, coverPhotoKey: key },
      update: { coverPhotoKey: key },
    });

    const coverPhotoUrl = await this.mediaService.getSignedUrl(key);
    return { coverPhotoUrl };
  }

  async deleteAvatar(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { avatarKey: true },
    });

    if (profile?.avatarKey) {
      try {
        await this.mediaService.delete(profile.avatarKey);
      } catch (error) {
        this.logger.warn(`Failed to delete avatar from S3: ${(error as Error).message}`);
      }

      await this.prisma.profile.update({
        where: { userId },
        data: { avatarKey: null },
      });
    }

    return { message: 'Avatar deleted' };
  }

  async deleteCover(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { coverPhotoKey: true },
    });

    if (profile?.coverPhotoKey) {
      try {
        await this.mediaService.delete(profile.coverPhotoKey);
      } catch (error) {
        this.logger.warn(`Failed to delete cover photo from S3: ${(error as Error).message}`);
      }

      await this.prisma.profile.update({
        where: { userId },
        data: { coverPhotoKey: null },
      });
    }

    return { message: 'Cover photo deleted' };
  }
}
