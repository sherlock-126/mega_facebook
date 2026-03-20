import chalk from 'chalk';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger.js';
import { getCliPath, findProjectRoot } from '../utils/paths.js';

export function versionCommand(): void {
  try {
    // Get CLI version
    const cliPackageJsonPath = getCliPath('package.json');
    const cliPackageJson = JSON.parse(readFileSync(cliPackageJsonPath, 'utf-8'));
    const cliVersion = cliPackageJson.version;

    logger.info(chalk.bold('Mega Facebook CLI'));
    logger.success('CLI Version: ' + chalk.cyan(cliVersion));

    // Try to get project version if in a project directory
    const projectRoot = findProjectRoot();
    if (projectRoot) {
      const projectPackageJsonPath = join(projectRoot, 'package.json');
      try {
        const projectPackageJson = JSON.parse(readFileSync(projectPackageJsonPath, 'utf-8'));
        logger.success('Project: ' + chalk.cyan(projectPackageJson.name || 'mega-facebook'));
      } catch {
        // Project package.json might not exist or be readable
      }
    }

    logger.newline();
    logger.info('Node.js: ' + process.version);
    logger.info('Platform: ' + process.platform);
    logger.info('Architecture: ' + process.arch);
  } catch (error: any) {
    logger.error('Failed to get version information: ' + error.message);
    process.exit(1);
  }
}
