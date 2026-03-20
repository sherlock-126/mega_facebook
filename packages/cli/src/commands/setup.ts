import * as p from '@clack/prompts';
import chalk from 'chalk';
import { runSystemCheck } from '../services/system-check.js';
import { generateEnvFiles, validateEnvFiles } from '../services/env-generator.js';
import { startDockerServices, getDockerStatus } from '../services/docker-manager.js';
import { generatePrismaClient, runMigrations, seedDatabase } from '../services/database-setup.js';
import { createMinioBucket } from '../services/storage-setup.js';
import { logger } from '../utils/logger.js';
import { getPath, fileExists } from '../utils/paths.js';
import { CONSTANTS } from '../constants.js';
import fs from 'fs-extra';

interface SetupState {
  step: string;
  completed: string[];
  timestamp: number;
}

export async function setupCommand(): Promise<void> {
  console.clear();

  p.intro(chalk.bgCyan.black(' 🚀 Mega Facebook Setup Wizard '));

  // Load previous state if exists
  const state = await loadSetupState();
  if (state && state.completed.length > 0) {
    const resume = await p.confirm({
      message: `Found previous setup state. Resume from step "${state.step}"?`,
      initialValue: true,
    });

    if (p.isCancel(resume)) {
      p.cancel('Setup cancelled');
      process.exit(0);
    }

    if (!resume) {
      await clearSetupState();
      state.completed = [];
    }
  }

  try {
    // Step 1: System Check
    if (!state.completed.includes('system-check')) {
      const s = p.spinner();
      s.start('Checking system requirements');

      const systemCheck = await runSystemCheck();

      if (!systemCheck.valid) {
        s.stop('System check failed');
        p.outro(chalk.red('❌ System requirements not met'));

        for (const error of systemCheck.errors) {
          logger.error(error);
        }

        for (const warning of systemCheck.warnings) {
          logger.warning(warning);
        }

        process.exit(1);
      }

      s.stop('System requirements met');
      await saveSetupState('system-check', [...state.completed, 'system-check']);
    }

    // Step 2: Environment Configuration
    if (!state.completed.includes('env-config')) {
      const envCheck = await validateEnvFiles();

      if (!envCheck.valid) {
        const createEnv = await p.confirm({
          message: 'Environment files not found. Create them from template?',
          initialValue: true,
        });

        if (p.isCancel(createEnv)) {
          p.cancel('Setup cancelled');
          process.exit(0);
        }

        if (createEnv) {
          // Optionally customize some values
          const customize = await p.confirm({
            message: 'Would you like to customize any environment values?',
            initialValue: false,
          });

          let customValues: Record<string, string> = {};

          if (customize && !p.isCancel(customize)) {
            const jwtSecret = await p.text({
              message: 'JWT Secret (leave empty for default):',
              placeholder: 'dev-secret-do-not-use-in-production',
            });

            if (!p.isCancel(jwtSecret) && jwtSecret) {
              customValues.JWT_SECRET = jwtSecret;
            }
          }

          await generateEnvFiles({ customValues });
        }
      } else {
        logger.info('Environment files already exist');
      }

      await saveSetupState('env-config', [...state.completed, 'env-config']);
    }

    // Step 3: Docker Services
    if (!state.completed.includes('docker-services')) {
      const dockerStatus = await getDockerStatus();

      if (!dockerStatus.running || dockerStatus.services.length === 0) {
        const startDocker = await p.confirm({
          message: 'Docker services are not running. Start them now?',
          initialValue: true,
        });

        if (p.isCancel(startDocker)) {
          p.cancel('Setup cancelled');
          process.exit(0);
        }

        if (startDocker) {
          const s = p.spinner();
          s.start('Starting Docker services (this may take a few minutes)');

          try {
            await startDockerServices();
            s.stop('Docker services started');
          } catch (error) {
            s.stop('Failed to start Docker services');
            logger.error(String(error));
            process.exit(1);
          }
        }
      } else {
        logger.info('Docker services are already running');
      }

      await saveSetupState('docker-services', [...state.completed, 'docker-services']);
    }

    // Step 4: Database Setup
    if (!state.completed.includes('database-setup')) {
      const s = p.spinner();

      try {
        s.start('Generating Prisma client');
        await generatePrismaClient();
        s.stop('Prisma client generated');

        s.start('Running database migrations');
        await runMigrations();
        s.stop('Database migrations completed');
      } catch (error) {
        s.stop('Database setup failed');
        logger.error(String(error));

        const retry = await p.confirm({
          message: 'Database setup failed. Would you like to retry?',
          initialValue: true,
        });

        if (!p.isCancel(retry) && retry) {
          // Retry database setup
          await generatePrismaClient();
          await runMigrations();
        } else {
          process.exit(1);
        }
      }

      await saveSetupState('database-setup', [...state.completed, 'database-setup']);
    }

    // Step 5: Storage Setup
    if (!state.completed.includes('storage-setup')) {
      const s = p.spinner();
      s.start('Setting up MinIO storage');

      try {
        await createMinioBucket();
        s.stop('MinIO storage configured');
      } catch (error) {
        s.stop('MinIO setup failed');
        logger.warning(`MinIO setup failed: ${error}`);
        logger.warning('You can set up MinIO manually later');
      }

      await saveSetupState('storage-setup', [...state.completed, 'storage-setup']);
    }

    // Step 6: Optional Seed Data
    if (!state.completed.includes('seed-data')) {
      const shouldSeed = await p.confirm({
        message: 'Would you like to seed the database with sample data?',
        initialValue: false,
      });

      if (!p.isCancel(shouldSeed) && shouldSeed) {
        const s = p.spinner();
        s.start('Seeding database');

        try {
          await seedDatabase();
          s.stop('Database seeded');
        } catch (error) {
          s.stop('Seeding failed');
          logger.warning(`Seeding failed: ${error}`);
        }
      }

      await saveSetupState('seed-data', [...state.completed, 'seed-data']);
    }

    // Clear setup state on success
    await clearSetupState();

    // Success!
    p.outro(chalk.green('✨ Setup completed successfully!'));

    console.log('\n' + chalk.bold('Next steps:'));
    console.log(chalk.gray('1. Start the development servers:'));
    console.log('   ' + chalk.cyan('pnpm dev'));
    console.log(chalk.gray('2. Open your browser:'));
    console.log('   ' + chalk.cyan('http://localhost:3000'));
    console.log(chalk.gray('3. API documentation:'));
    console.log('   ' + chalk.cyan('http://localhost:3001/api'));
    console.log('\n' + chalk.gray('Run') + ' ' + chalk.cyan('npx @mega/cli doctor') + ' ' + chalk.gray('to check system status anytime.'));

  } catch (error) {
    p.outro(chalk.red('❌ Setup failed'));
    logger.error(String(error));
    process.exit(1);
  }
}

async function loadSetupState(): Promise<SetupState> {
  const statePath = getPath(CONSTANTS.CLI_STATE_FILE);
  const exists = await fileExists(statePath);

  if (!exists) {
    return { step: '', completed: [], timestamp: Date.now() };
  }

  try {
    const content = await fs.readJson(statePath);

    // Check if state is older than 1 hour
    if (Date.now() - content.timestamp > 3600000) {
      await clearSetupState();
      return { step: '', completed: [], timestamp: Date.now() };
    }

    return content;
  } catch {
    return { step: '', completed: [], timestamp: Date.now() };
  }
}

async function saveSetupState(step: string, completed: string[]): Promise<void> {
  const statePath = getPath(CONSTANTS.CLI_STATE_FILE);
  await fs.writeJson(statePath, {
    step,
    completed,
    timestamp: Date.now(),
  });
}

async function clearSetupState(): Promise<void> {
  const statePath = getPath(CONSTANTS.CLI_STATE_FILE);
  await fs.remove(statePath).catch(() => {});
}