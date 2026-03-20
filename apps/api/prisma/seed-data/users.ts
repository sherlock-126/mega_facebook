import { PrismaClient, UserStatus, Gender } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcryptjs';

interface SeedUser {
  email: string;
  passwordHash: string;
  status: UserStatus;
  profile: {
    firstName: string;
    lastName: string;
    displayName: string;
    bio?: string;
    gender?: Gender;
    location?: string;
    dateOfBirth?: Date;
    avatarUrl?: string;
    coverUrl?: string;
  };
}

export async function generateUsers(count: number): Promise<SeedUser[]> {
  const users: SeedUser[] = [];
  const passwordHash = await bcrypt.hash('Test1234!', 12);

  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const gender = faker.helpers.arrayElement([
      Gender.MALE,
      Gender.FEMALE,
      Gender.OTHER,
      Gender.PREFER_NOT_TO_SAY,
    ]);

    users.push({
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      passwordHash,
      status: UserStatus.ACTIVE,
      profile: {
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        bio: faker.lorem.sentence({ min: 5, max: 15 }),
        gender,
        location: faker.location.city(),
        dateOfBirth: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
        avatarUrl: faker.image.avatar(),
        coverUrl: faker.image.urlPicsumPhotos({ width: 820, height: 312 }),
      },
    });
  }

  return users;
}

export async function createAdminUser(prisma: PrismaClient) {
  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@mega.dev' },
    update: {},
    create: {
      email: 'admin@mega.dev',
      passwordHash: adminPassword,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.profile.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      firstName: 'Admin',
      lastName: 'User',
      displayName: 'Platform Admin',
      bio: 'Platform administrator account',
      location: 'System',
    },
  });

  return admin;
}

export async function createTestUsers(prisma: PrismaClient, count: number = 5) {
  const testPassword = await bcrypt.hash('Test1234!', 12);
  const createdUsers = [];

  // Create deterministic test users for consistent testing
  for (let i = 1; i <= count; i++) {
    const user = await prisma.user.upsert({
      where: { email: `user${i}@mega.dev` },
      update: {},
      create: {
        email: `user${i}@mega.dev`,
        passwordHash: testPassword,
        status: UserStatus.ACTIVE,
      },
    });

    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        firstName: `Test`,
        lastName: `User${i}`,
        displayName: `Test User ${i}`,
        bio: `I'm test user number ${i}. Feel free to connect!`,
        gender: faker.helpers.arrayElement(Object.values(Gender)),
        location: faker.location.city(),
        dateOfBirth: faker.date.birthdate({ min: 20, max: 40, mode: 'age' }),
        avatarUrl: faker.image.avatar(),
        coverUrl: faker.image.urlPicsumPhotos({ width: 820, height: 312 }),
      },
    });

    createdUsers.push(user);
  }

  return createdUsers;
}

export async function createRandomUsers(prisma: PrismaClient, count: number = 20) {
  const users = await generateUsers(count);
  const createdUsers = [];

  for (const userData of users) {
    try {
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          passwordHash: userData.passwordHash,
          status: userData.status,
          profile: {
            create: userData.profile,
          },
        },
        include: {
          profile: true,
        },
      });

      createdUsers.push(user);
    } catch (error) {
      // Skip if email already exists
      console.warn(`Skipping duplicate user: ${userData.email}`);
    }
  }

  return createdUsers;
}