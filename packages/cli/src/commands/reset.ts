import * as p from '@clack/prompts';
import chalk from 'chalk';
import { stopDockerServices, resetDockerServices } from '../services/docker-manager.js';
import { resetDatabase } from '../services/database-setup.js';
import { resetMinioBucket } from '../services/storage-setup.js';
import { logger } from '../utils/logger.js';

export async function resetCommand(options: { force?: boolean }): Promise<void> {
  console.log(chalk.bold.red('\n⚠️  Mega Facebook Reset\n'));

  if (!options.force) {
    console.log(chalk.yellow('This command will:'));
    console.log('  • Stop all Docker services');
    console.log('  • Delete all Docker volumes (database data)');
    console.log('  • Reset the database to a clean state');
    console.log('  • Clear MinIO storage configuration');
    console.log();

    const confirm = await p.confirm({
      message: chalk.red('Are you sure you want to reset everything?'),
      initialValue: false,
    });

    if (p.isCancel(confirm) || !confirm) {
      p.cancel('Reset cancelled');
      process.exit(0);
    }

    const doubleConfirm = await p.confirm({
      message: chalk.red('This action CANNOT be undone. Continue?'),
      initialValue: false,
    });

    if (p.isCancel(doubleConfirm) || !doubleConfirm) {
      p.cancel('Reset cancelled');
      process.exit(0);
    }
  }

  try {
    const s = p.spinner();

    // Stop Docker services
    s.start('Stopping Docker services');
    try {
      await stopDockerServices();
      s.stop('Docker services stopped');
    } catch (error) {
      s.stop('Failed to stop Docker services');
      logger.warning(String(error));
    }

    // Reset Docker services (remove volumes)
    s.start('Removing Docker volumes');
    try {
      await resetDockerServices();
      s.stop('Docker volumes removed');
    } catch (error) {
      s.stop('Failed to remove Docker volumes');
      logger.warning(String(error));
    }

    // Ask if user wants to restart services
    const restart = await p.confirm({
      message: 'Would you like to restart Docker services now?',
      initialValue: true,
    });

    if (!p.isCancel(restart) && restart) {
      // Import and run the setup flow
      const { setupCommand } = await import('./setup.js');
      await setupCommand();
    } else {
      p.outro(chalk.green('✓ Reset completed'));
      console.log('\n' + chalk.gray('Run') + ' ' + chalk.cyan('npx @mega/cli setup') + ' ' + chalk.gray('to set up the environment again.'));
    }
  } catch (error) {
    p.outro(chalk.red('❌ Reset failed'));
    logger.error(String(error));
    process.exit(1);
  }
}