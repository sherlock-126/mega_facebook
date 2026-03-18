import { PrismaClient, UserStatus, Gender, FriendshipStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const testPassword = await bcrypt.hash('Test1234!', 12);

  // Admin user
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
      displayName: 'Admin',
      bio: 'Platform administrator',
    },
  });
  console.log('  Admin user: admin@mega.dev (with profile)');

  // Test users
  const genders = [Gender.MALE, Gender.FEMALE, Gender.OTHER, Gender.PREFER_NOT_TO_SAY, Gender.MALE];
  for (let i = 1; i <= 5; i++) {
    const email = `user${i}@mega.dev`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash: testPassword,
        status: UserStatus.ACTIVE,
      },
    });
    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        firstName: `User`,
        lastName: `${i}`,
        displayName: `Test User ${i}`,
        bio: `Hi, I am test user ${i}`,
        gender: genders[i - 1],
        location: 'Ho Chi Minh City',
      },
    });
    console.log(`  Test user: ${email} (with profile)`);
  }

  // Seed friendships between test users
  const allUsers = await prisma.user.findMany({ orderBy: { email: 'asc' } });
  const userMap = new Map(allUsers.map((u) => [u.email, u]));

  const user1 = userMap.get('user1@mega.dev')!;
  const user2 = userMap.get('user2@mega.dev')!;
  const user3 = userMap.get('user3@mega.dev')!;
  const user4 = userMap.get('user4@mega.dev')!;

  // user1 and user2 are friends
  await prisma.friendship.upsert({
    where: { requesterId_addresseeId: { requesterId: user1.id, addresseeId: user2.id } },
    update: {},
    create: {
      requesterId: user1.id,
      addresseeId: user2.id,
      status: FriendshipStatus.ACCEPTED,
    },
  });
  console.log('  Friendship: user1 <-> user2 (ACCEPTED)');

  // user1 and user3 are friends
  await prisma.friendship.upsert({
    where: { requesterId_addresseeId: { requesterId: user1.id, addresseeId: user3.id } },
    update: {},
    create: {
      requesterId: user1.id,
      addresseeId: user3.id,
      status: FriendshipStatus.ACCEPTED,
    },
  });
  console.log('  Friendship: user1 <-> user3 (ACCEPTED)');

  // user4 sent pending request to user1
  await prisma.friendship.upsert({
    where: { requesterId_addresseeId: { requesterId: user4.id, addresseeId: user1.id } },
    update: {},
    create: {
      requesterId: user4.id,
      addresseeId: user1.id,
      status: FriendshipStatus.PENDING,
    },
  });
  console.log('  Friendship: user4 -> user1 (PENDING)');

  console.log('Seeding complete.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
