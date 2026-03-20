import { select } from '@clack/prompts';
import chalk from 'chalk';
import { logger } from '../utils/logger.js';
import { findProjectRoot } from '../utils/paths.js';
import { DatabaseSetup } from '../services/database-setup.js';
import { DockerManager } from '../services/docker-manager.js';

export async function seedCommand(options: {
  force?: boolean;
  adminOnly?: boolean;
  full?: boolean;
  docker?: boolean;
}): Promise<void> {
  const projectRoot = findProjectRoot();

  if (!projectRoot) {
    logger.error('Project not found. Please run this command from the project directory.');
    process.exit(1);
  }

  try {
    // If no options specified, ask the user
    let seedOptions = { ...options };

    if (!options.adminOnly && !options.full && !options.force) {
      const choice = await select({
        message: 'Select seeding mode:',
        options: [
          { value: 'sample', label: 'Sample data (5 users, posts, friendships)' },
          { value: 'admin', label: 'Admin account only' },
          { value: 'full', label: 'Full demo dataset (20+ users, extensive data)' },
        ],
      });

      if (choice === 'admin') {
        seedOptions.adminOnly = true;
      } else if (choice === 'full') {
        seedOptions.full = true;
      }
    }

    const dbSetup = new DatabaseSetup({ projectRoot });

    // Check if we should run in Docker
    if (options.docker) {
      // Check if Docker is running
      const dockerManager = new DockerManager({ projectRoot });
      const isRunning = await dockerManager.isRunning();

      if (!isRunning) {
        logger.error('Docker services are not running. Start them with: mega-cli start');
        process.exit(1);
      }

      // Run seed in Docker container
      await dbSetup.runSeedInDocker({
        adminOnly: seedOptions.adminOnly,
        full: seedOptions.full,
      });
    } else {
      // Run seed directly
      await dbSetup.seed({
        force: seedOptions.force,
        adminOnly: seedOptions.adminOnly,
        full: seedOptions.full,
      });
    }

    logger.newline();
    logger.success(chalk.green.bold('✅ Database seeding completed!'));
    logger.newline();
    logger.info('You can now log in with the test accounts shown above.');
  } catch (error: any) {
    logger.error(`Seeding failed: ${error.message}`);
    process.exit(1);
  }
}