import semver from 'semver';
import chalk from 'chalk';
import { confirm, intro, outro } from '@clack/prompts';
import { R2Client } from '../services/r2-client.js';
import { ConfigManager } from '../services/config-manager.js';
import { logger } from '../utils/logger.js';
import { installCommand } from './install.js';

interface UpdateOptions {
  check?: boolean;
}

export async function updateCommand(options: UpdateOptions): Promise<void> {
  intro(chalk.cyan('🔄 AutoNow FB - Kiểm tra cập nhật'));

  const r2Client = new R2Client();
  const config = new ConfigManager();

  try {
    // Get current version
    const currentVersion = config.getInstalledVersion();
    if (!currentVersion) {
      logger.warn('Chưa cài đặt AutoNow FB. Hãy chạy:');
      logger.info(chalk.cyan('  autonow-fb install'));
      return;
    }

    logger.info(`Phiên bản hiện tại: ${chalk.yellow(currentVersion)}`);

    // Fetch latest version from R2
    logger.info('Đang kiểm tra phiên bản mới...');
    const manifest = await r2Client.fetchManifest('latest');
    const latestVersion = manifest.version;

    logger.info(`Phiên bản mới nhất: ${chalk.green(latestVersion)}`);

    // Compare versions
    if (semver.eq(currentVersion, latestVersion)) {
      outro(chalk.green('✅ Bạn đang dùng phiên bản mới nhất!'));
      return;
    }

    const isNewer = semver.gt(latestVersion, currentVersion);

    if (isNewer) {
      logger.newline();
      logger.info(chalk.yellow('📦 Có phiên bản mới!'));
      logger.info(`Từ ${currentVersion} → ${latestVersion}`);

      if (options.check) {
        logger.newline();
        logger.info('Để cập nhật, chạy lệnh:');
        logger.info(chalk.cyan('  autonow-fb update'));
        return;
      }

      // Show changelog if available
      try {
        const versions = await r2Client.fetchVersions();
        const targetVersion = versions.find(v => v.version === latestVersion);
        if (targetVersion) {
          logger.info(`Ngày phát hành: ${new Date(targetVersion.releaseDate).toLocaleDateString('vi-VN')}`);
        }
      } catch {
        // Ignore if can't fetch versions
      }

      logger.newline();
      const shouldUpdate = await confirm({
        message: 'Bạn có muốn cập nhật không?',
        initialValue: true
      });

      if (!shouldUpdate) {
        outro(chalk.yellow('Đã hủy cập nhật'));
        return;
      }

      // Perform update by running install command
      logger.newline();
      await installCommand({
        version: latestVersion,
        force: true,
        verify: true
      });

    } else {
      logger.warn(`Phiên bản cloud (${latestVersion}) cũ hơn phiên bản hiện tại (${currentVersion})`);
      logger.info('Có thể bạn đang dùng phiên bản phát triển.');
    }

    // Update last check time
    config.updateLastUpdateCheck();

  } catch (error: any) {
    logger.error(`Không thể kiểm tra cập nhật: ${error.message}`);
    process.exit(1);
  }
}