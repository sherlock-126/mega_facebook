import { PrismaClient, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const testPassword = await bcrypt.hash('Test1234!', 12);

  // Admin user
  await prisma.user.upsert({
    where: { email: 'admin@mega.dev' },
    update: {},
    create: {
      email: 'admin@mega.dev',
      passwordHash: adminPassword,
      status: UserStatus.ACTIVE,
    },
  });
  console.log('  Admin user: admin@mega.dev');

  // Test users
  for (let i = 1; i <= 5; i++) {
    const email = `user${i}@mega.dev`;
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash: testPassword,
        status: UserStatus.ACTIVE,
      },
    });
    console.log(`  Test user: ${email}`);
  }

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
