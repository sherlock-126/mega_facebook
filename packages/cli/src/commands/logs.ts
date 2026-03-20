import chalk from 'chalk';
import { logger } from '../utils/logger.js';
import { findProjectRoot } from '../utils/paths.js';
import { DockerManager } from '../services/docker-manager.js';

export async function logsCommand(options: {
  service?: string;
  lines?: number;
  follow?: boolean;
}): Promise<void> {
  const projectRoot = findProjectRoot();

  if (!projectRoot) {
    logger.error('Project not found. Please run this command from the project directory.');
    process.exit(1);
  }

  try {
    const dockerManager = new DockerManager({ projectRoot });

    // Check if services are running
    const status = await dockerManager.status();
    if (Object.keys(status).length === 0) {
      logger.error('No Docker services are running.');
      logger.info('Start services with: mega-cli start');
      process.exit(1);
    }

    // If no service specified, show available services
    if (!options.service) {
      logger.info('Available services:');
      for (const service of Object.keys(status)) {
        logger.success(`• ${service}`);
      }
      logger.newline();
      logger.info('To view logs for a specific service:');
      logger.info(chalk.cyan('  mega-cli logs [service]'));
      logger.info('Example: mega-cli logs api');
      return;
    }

    // Check if the service exists
    if (!status[options.service]) {
      logger.error(`Service '${options.service}' not found or not running.`);
      logger.info('Available services: ' + Object.keys(status).join(', '));
      process.exit(1);
    }

    // Get logs
    const logs = await dockerManager.logs(options.service, options.lines || 100);

    if (logs) {
      logger.raw(logs);
    } else {
      logger.info(`No logs available for service: ${options.service}`);
    }

    if (options.follow) {
      logger.newline();
      logger.info('Note: Real-time log following is not yet implemented.');
      logger.info('Use Docker Compose directly for real-time logs:');
      logger.info(chalk.cyan(`  docker compose -f docker/docker-compose.yml logs -f ${options.service}`));
    }
  } catch (error: any) {
    logger.error(`Failed to retrieve logs: ${error.message}`);
    process.exit(1);
  }
}
