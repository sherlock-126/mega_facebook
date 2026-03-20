import updateNotifier from 'update-notifier';
import { readFileSync } from 'fs';
import chalk from 'chalk';
import { logger } from '../utils/logger.js';
import { getCliPath } from '../utils/paths.js';
import { ConfigManager } from '../services/config-manager.js';
import { exec } from '../utils/exec.js';
import { spinner } from '../utils/spinner.js';

export async function updateCommand(options: { check?: boolean }): Promise<void> {
  try {
    const packageJsonPath = getCliPath('package.json');
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    // Check for updates
    const notifier = updateNotifier({ pkg, updateCheckInterval: 0 });

    if (notifier.update) {
      logger.info(chalk.yellow('Update available!'));
      logger.info(`Current version: ${chalk.red(notifier.current)}`);
      logger.info(`Latest version: ${chalk.green(notifier.latest)}`);
      logger.newline();

      if (options.check) {
        logger.info('To update, run:');
        logger.info(chalk.cyan(`  npm install -g ${pkg.name}@latest`));
      } else {
        // Perform update
        spinner.start('Updating CLI...');

        try {
          await exec('npm', ['install', '-g', `${pkg.name}@latest`], {
            timeout: 60000,
          });

          spinner.succeed('CLI updated successfully!');
          logger.info('Please restart your terminal for changes to take effect.');
        } catch (error) {
          spinner.fail('Failed to update CLI');
          logger.error('Please try updating manually:');
          logger.info(chalk.cyan(`  npm install -g ${pkg.name}@latest`));
        }
      }
    } else {
      logger.success('You are running the latest version!');
    }

    // Update last check time
    const config = new ConfigManager();
    config.updateLastUpdateCheck();
  } catch (error: any) {
    logger.error(`Failed to check for updates: ${error.message}`);
    process.exit(1);
  }
}