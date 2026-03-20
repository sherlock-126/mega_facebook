import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import tar from 'tar';
import semver from 'semver';
import chalk from 'chalk';
import crypto from 'crypto';
import { confirm, intro, outro } from '@clack/prompts';
import { R2Client } from '../services/r2-client.js';
import { ConfigManager } from '../services/config-manager.js';
import { logger } from '../utils/logger.js';
import { spinner } from '../utils/spinner.js';
import { exec } from '../utils/exec.js';

interface InstallOptions {
  version?: string;
  force?: boolean;
  dryRun?: boolean;
  verify?: boolean;
}

export async function installCommand(options: InstallOptions): Promise<void> {
  intro(chalk.cyan('🚀 AutoNow FB - Cài đặt từ Cloud'));

  const r2Client = new R2Client();
  const config = new ConfigManager();

  try {
    // Fetch manifest
    const version = options.version || 'latest';
    logger.info(`Đang kiểm tra phiên bản ${version}...`);

    const manifest = await r2Client.fetchManifest(version);
    logger.success(`Tìm thấy phiên bản: ${manifest.version}`);
    logger.info(`Build ID: ${manifest.buildId}`);
    logger.info(`Ngày build: ${new Date(manifest.timestamp).toLocaleString('vi-VN')}`);

    // Check if already installed
    const currentVersion = config.getInstalledVersion();
    if (currentVersion && !options.force) {
      if (semver.eq(currentVersion, manifest.version)) {
        logger.info('Phiên bản này đã được cài đặt.');
        if (!await confirm({
          message: 'Bạn có muốn cài đặt lại không?',
          initialValue: false
        })) {
          outro(chalk.yellow('Đã hủy cài đặt'));
          return;
        }
      } else if (semver.gt(currentVersion, manifest.version)) {
        logger.warn(`Phiên bản hiện tại (${currentVersion}) mới hơn phiên bản muốn cài (${manifest.version})`);
        if (!options.force) {
          if (!await confirm({
            message: 'Bạn có muốn downgrade không?',
            initialValue: false
          })) {
            outro(chalk.yellow('Đã hủy cài đặt'));
            return;
          }
        }
      }
    }

    // Dry run mode
    if (options.dryRun) {
      logger.info('Chế độ dry-run: Không thực hiện cài đặt thật');
      logger.info('Sẽ tải xuống:');
      logger.info(`  - API: ${formatBytes(manifest.artifacts.api.size)}`);
      logger.info(`  - Web: ${formatBytes(manifest.artifacts.web.size)}`);
      outro(chalk.green('✅ Kiểm tra hoàn tất'));
      return;
    }

    // Check requirements
    if (manifest.requirements?.node) {
      const nodeVersion = process.version;
      if (!semver.satisfies(nodeVersion, manifest.requirements.node)) {
        throw new Error(`Yêu cầu Node.js ${manifest.requirements.node}, hiện tại: ${nodeVersion}`);
      }
    }

    // Determine install path
    const installPath = config.getInstallPath() || path.join(os.homedir(), '.autonow-fb');
    await fs.ensureDir(installPath);

    // Check disk space
    const totalSize = manifest.artifacts.api.size + manifest.artifacts.web.size;
    if (!await r2Client.checkDiskSpace(totalSize * 1.5, installPath)) {
      throw new Error('Không đủ dung lượng đĩa');
    }

    logger.info(`Đường dẫn cài đặt: ${installPath}`);

    // Download artifacts
    const artifactsDir = path.join(installPath, 'artifacts');
    await fs.ensureDir(artifactsDir);

    // Download API artifact
    logger.newline();
    logger.info('Đang tải API service...');
    const apiPath = path.join(artifactsDir, 'api.tar.gz');
    await r2Client.downloadArtifact(
      manifest.artifacts.api.url,
      apiPath,
      options.verify ? manifest.artifacts.api.checksum : undefined,
      manifest.artifacts.api.size
    );

    // Download Web artifact
    logger.newline();
    logger.info('Đang tải Web application...');
    const webPath = path.join(artifactsDir, 'web.tar.gz');
    await r2Client.downloadArtifact(
      manifest.artifacts.web.url,
      webPath,
      options.verify ? manifest.artifacts.web.checksum : undefined,
      manifest.artifacts.web.size
    );

    // Extract artifacts
    logger.newline();
    spinner.start('Đang giải nén API...');
    const apiDir = path.join(installPath, 'api');
    await fs.ensureDir(apiDir);
    await tar.extract({
      file: apiPath,
      cwd: apiDir
    });
    spinner.succeed('API đã được giải nén');

    spinner.start('Đang giải nén Web...');
    const webDir = path.join(installPath, 'web');
    await fs.ensureDir(webDir);
    await tar.extract({
      file: webPath,
      cwd: webDir
    });
    spinner.succeed('Web đã được giải nén');

    // Post-install setup
    logger.newline();
    logger.info('Đang chạy cài đặt sau khi tải...');

    // Generate .env files if not exist
    const envPath = path.join(installPath, '.env');
    if (!await fs.pathExists(envPath)) {
      spinner.start('Đang tạo file cấu hình...');
      await generateEnvFile(envPath);
      spinner.succeed('File cấu hình đã được tạo');
    }

    // Save installation info
    config.saveInstallInfo({
      version: manifest.version,
      installPath,
      installedAt: new Date().toISOString()
    });

    // Clean up artifacts
    await fs.remove(artifactsDir);

    outro(chalk.green('✅ Cài đặt thành công!'));

    logger.newline();
    logger.info('Các bước tiếp theo:');
    logger.info('1. Chạy Docker services:');
    logger.info(chalk.cyan('   autonow-fb start'));
    logger.info('2. Chạy database migrations:');
    logger.info(chalk.cyan('   cd ' + installPath));
    logger.info(chalk.cyan('   npm run db:migrate'));
    logger.info('3. Truy cập ứng dụng:');
    logger.info(chalk.cyan('   http://localhost:3000'));

  } catch (error: any) {
    logger.error(`Cài đặt thất bại: ${error.message}`);
    process.exit(1);
  }
}

// Helper functions
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

async function generateEnvFile(envPath: string): Promise<void> {
  const defaultEnv = `# AutoNow FB Configuration
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/autonow_fb

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=${generateRandomSecret()}
JWT_REFRESH_SECRET=${generateRandomSecret()}

# MinIO (S3)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET_NAME=autonow-fb

# Elasticsearch
ELASTICSEARCH_NODE=http://localhost:9200
`;

  await fs.writeFile(envPath, defaultEnv);
}

function generateRandomSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}