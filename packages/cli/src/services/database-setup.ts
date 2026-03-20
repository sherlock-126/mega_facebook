import { exec } from '../utils/exec.js';
import { getPath } from '../utils/paths.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

export async function generatePrismaClient(): Promise<void> {
  logger.info('Generating Prisma client...');

  await exec('pnpm', ['--filter', 'api', 'prisma:generate'], {
    cwd: getPath(),
  });

  logger.success('Prisma client generated');
}

export async function runMigrations(): Promise<void> {
  logger.info('Running database migrations...');

  try {
    await exec('pnpm', ['--filter', 'api', 'prisma:migrate'], {
      cwd: getPath(),
    });

    logger.success('Database migrations completed');
  } catch (error) {
    // Check if it's a common error
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('P1001')) {
      throw new Error(
        'Cannot connect to database. Please ensure PostgreSQL is running and DATABASE_URL is correct.'
      );
    } else if (errorMessage.includes('P1009')) {
      throw new Error(
        'Database already exists. Use the reset command if you want to start fresh.'
      );
    } else if (errorMessage.includes('P3009')) {
      logger.warning('Migrations are already up to date');
    } else {
      throw error;
    }
  }
}

export async function seedDatabase(force = false): Promise<void> {
  logger.info('Seeding database with sample data...');

  try {
    const seedCommand = force
      ? ['--filter', 'api', 'prisma:seed', '--', '--force']
      : ['--filter', 'api', 'prisma:seed'];

    await exec('pnpm', seedCommand, {
      cwd: getPath(),
    });

    logger.success('Database seeded successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('P2002')) {
      logger.warning('Some seed data already exists, skipping duplicates');
    } else {
      throw error;
    }
  }
}

export async function resetDatabase(): Promise<void> {
  logger.info('Resetting database (this will delete all data)...');

  try {
    // Reset the database
    await exec('pnpm', ['--filter', 'api', 'prisma:reset', '--', '--force'], {
      cwd: getPath(),
    });

    logger.success('Database reset completed');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('P1001')) {
      throw new Error(
        'Cannot connect to database. Please ensure PostgreSQL is running.'
      );
    } else {
      throw error;
    }
  }
}

export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  error?: string;
}> {
  try {
    // Try to run a simple Prisma command to test connection
    await exec('pnpm', ['--filter', 'api', 'exec', 'prisma', 'db', 'execute', '--', '--stdin'], {
      cwd: getPath(),
      throwOnError: false,
    });

    return { connected: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('P1001')) {
      return {
        connected: false,
        error: 'Cannot connect to database',
      };
    }

    return {
      connected: false,
      error: errorMessage,
    };
  }
}

export async function checkMigrationsStatus(): Promise<{
  upToDate: boolean;
  pending: number;
}> {
  try {
    const { stdout } = await exec(
      'pnpm',
      ['--filter', 'api', 'exec', 'prisma', 'migrate', 'status'],
      {
        cwd: getPath(),
        throwOnError: false,
      }
    );

    // Parse the output to check migration status
    const pendingMatch = stdout.match(/(\d+) migration\(s\) to apply/);
    const pending = pendingMatch ? parseInt(pendingMatch[1]) : 0;

    return {
      upToDate: pending === 0,
      pending,
    };
  } catch (error) {
    // If command fails, assume migrations are not up to date
    return {
      upToDate: false,
      pending: -1,
    };
  }
}