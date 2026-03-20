import chalk from 'chalk';
import { logger } from '../utils/logger.js';
import { findProjectRoot } from '../utils/paths.js';
import { DockerManager } from '../services/docker-manager.js';
import { exec } from '../utils/exec.js';
import { CONSTANTS } from '../constants.js';

export async function startCommand(options: {
  docker?: boolean;
  dev?: boolean;
  services?: string[];
}): Promise<void> {
  const projectRoot = findProjectRoot();

  if (!projectRoot) {
    logger.error('Project not found. Please run this command from the project directory.');
    process.exit(1);
  }

  try {
    // Start Docker services if requested or by default
    if (options.docker !== false) {
      const dockerManager = new DockerManager({ projectRoot });
      await dockerManager.start(options.services);
    }

    // Start development servers if requested
    if (options.dev) {
      logger.info('Starting development servers...');

      // Run pnpm dev in background
      exec('pnpm', ['dev'], {
        cwd: projectRoot,
      }).catch((error) => {
        logger.error(`Failed to start development servers: ${error}`);
      });

      // Wait a bit for servers to start
      await new Promise((resolve) => setTimeout(resolve, 3000));

      logger.success('Development servers are starting...');
      logger.newline();
      logger.info('Applications will be available at:');
      logger.success(`• Web: ${chalk.cyan(`http://localhost:${CONSTANTS.PORTS.WEB}`)}`);
      logger.success(`• API: ${chalk.cyan(`http://localhost:${CONSTANTS.PORTS.API}`)}`);
      logger.success(`• API Docs: ${chalk.cyan(`http://localhost:${CONSTANTS.PORTS.API}/api`)}`);
    } else {
      // Just show service URLs
      logger.newline();
      logger.info('Services are running at:');
      logger.success(`• PostgreSQL: ${chalk.cyan(`localhost:${CONSTANTS.PORTS.POSTGRES}`)}`);
      logger.success(`• Redis: ${chalk.cyan(`localhost:${CONSTANTS.PORTS.REDIS}`)}`);
      logger.success(`• MinIO: ${chalk.cyan(`http://localhost:${CONSTANTS.PORTS.MINIO}`)}`);
      logger.success(`• MinIO Console: ${chalk.cyan(`http://localhost:${CONSTANTS.PORTS.MINIO_CONSOLE}`)}`);
      logger.success(`• Elasticsearch: ${chalk.cyan(`http://localhost:${CONSTANTS.PORTS.ELASTICSEARCH}`)}`);
      logger.newline();
      logger.info('To start development servers, run:');
      logger.info(chalk.cyan('  mega-cli start --dev'));
    }
  } catch (error: any) {
    logger.error(`Failed to start services: ${error.message}`);
    process.exit(1);
  }
}