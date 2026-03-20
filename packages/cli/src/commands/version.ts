import chalk from 'chalk';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger.js';
import { getCliPath, findProjectRoot } from '../utils/paths.js';
import { ConfigManager } from '../services/config-manager.js';
import { R2Client } from '../services/r2-client.js';

interface VersionOptions {
  remote?: boolean;
}

export async function versionCommand(options: VersionOptions = {}): Promise<void> {
  try {
    // Get CLI version
    const cliPackageJsonPath = getCliPath('package.json');
    const cliPackageJson = JSON.parse(readFileSync(cliPackageJsonPath, 'utf-8'));
    const cliVersion = cliPackageJson.version;
    const config = new ConfigManager();

    logger.info(chalk.bold('AutoNow FB CLI'));
    logger.success('CLI Version: ' + chalk.cyan(cliVersion));

    // Show installed version
    const installedVersion = config.getInstalledVersion();
    if (installedVersion) {
      logger.info('Installed Version: ' + chalk.yellow(installedVersion));
      const installPath = config.getInstallPath();
      if (installPath) {
        logger.info('Install Path: ' + installPath);
      }
    }

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

    // Check remote version if requested
    if (options.remote) {
      const r2Client = new R2Client();
      try {
        logger.newline();
        logger.info('Đang kiểm tra phiên bản trên cloud...');

        const manifest = await r2Client.fetchManifest('latest');
        logger.info('Remote Version: ' + chalk.cyan(manifest.version));
        logger.info('Build Date: ' + new Date(manifest.timestamp).toLocaleString('vi-VN'));

        // Fetch available versions
        const versions = await r2Client.fetchVersions();
        if (versions.length > 0) {
          logger.newline();
          logger.info('Các phiên bản có sẵn:');
          versions.slice(0, 5).forEach(v => {
            const marker = v.stable ? chalk.green('✓') : chalk.yellow('β');
            logger.info(`  ${marker} ${v.version} - ${new Date(v.releaseDate).toLocaleDateString('vi-VN')}`);
          });
          if (versions.length > 5) {
            logger.info(`  ... và ${versions.length - 5} phiên bản khác`);
          }
        }
      } catch (error: any) {
        logger.warn('Không thể kiểm tra phiên bản remote');
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