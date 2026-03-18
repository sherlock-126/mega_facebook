import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserStatus } from '@prisma/client';

@Injectable()
export class UserSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async searchUsers(query: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const pattern = `%${query}%`;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          status: UserStatus.ACTIVE,
          profile: {
            OR: [
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } },
              { displayName: { contains: query, mode: 'insensitive' } },
            ],
          },
        },
        include: { profile: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({
        where: {
          status: UserStatus.ACTIVE,
          profile: {
            OR: [
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } },
              { displayName: { contains: query, mode: 'insensitive' } },
            ],
          },
        },
      }),
    ]);

    const data = users.map((u) => ({
      userId: u.id,
      displayName: u.profile?.displayName ?? null,
      avatarUrl: u.profile?.avatarKey ?? null,
      location: u.profile?.location ?? null,
    }));

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
