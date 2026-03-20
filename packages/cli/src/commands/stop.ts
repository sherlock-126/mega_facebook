import chalk from 'chalk';
import { logger } from '../utils/logger.js';
import { findProjectRoot } from '../utils/paths.js';
import { DockerManager } from '../services/docker-manager.js';

export async function stopCommand(options: {
  services?: string[];
  removeVolumes?: boolean;
}): Promise<void> {
  const projectRoot = findProjectRoot();

  if (!projectRoot) {
    logger.error('Project not found. Please run this command from the project directory.');
    process.exit(1);
  }

  try {
    const dockerManager = new DockerManager({ projectRoot });

    if (options.removeVolumes) {
      // Stop and remove volumes (like reset but less aggressive)
      await dockerManager.reset();
      logger.success('Services stopped and volumes removed');
    } else {
      // Just stop the services
      await dockerManager.stop(options.services);
      logger.success('Services stopped successfully');
    }

    if (options.services && options.services.length > 0) {
      logger.info(`Stopped services: ${options.services.join(', ')}`);
    } else {
      logger.info('All Docker services have been stopped');
    }

    logger.newline();
    logger.info('To start services again, run:');
    logger.info(chalk.cyan('  mega-cli start'));
  } catch (error: any) {
    logger.error(`Failed to stop services: ${error.message}`);
    process.exit(1);
  }
}