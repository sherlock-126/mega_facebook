#!/usr/bin/env node

import { Command } from 'commander';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = await fs.readJson(packageJsonPath);

const program = new Command();

program
  .name('autonow-fb')
  .description('CLI tương tác để cài đặt và quản lý AutoNow FB')
  .version(packageJson.version);

// Setup command (default)
program
  .command('setup', { isDefault: true })
  .description('Run the interactive setup wizard')
  .action(async () => {
    const { setupCommand } = await import('./commands/setup.js');
    await setupCommand();
  });

// Doctor command
program
  .command('doctor')
  .description('Check system health and configuration')
  .action(async () => {
    const { doctorCommand } = await import('./commands/doctor.js');
    await doctorCommand();
  });

// Reset command
program
  .command('reset')
  .description('Reset the environment (delete all data)')
  .option('-f, --force', 'Skip confirmation prompts')
  .action(async (options) => {
    const { resetCommand } = await import('./commands/reset.js');
    await resetCommand(options);
  });

// Install command
program
  .command('install')
  .description('Tải và cài đặt AutoNow FB từ cloud')
  .option('-v, --version <version>', 'Phiên bản cụ thể (mặc định: latest)')
  .option('-f, --force', 'Ghi đè cài đặt hiện tại')
  .option('--dry-run', 'Kiểm tra phiên bản mà không cài đặt')
  .option('--verify', 'Xác minh checksum sau khi tải')
  .action(async (options) => {
    const { installCommand } = await import('./commands/install.js');
    await installCommand(options);
  });

// Update command
program
  .command('update')
  .description('Kiểm tra và cập nhật lên phiên bản mới')
  .option('--check', 'Chỉ kiểm tra, không cập nhật')
  .action(async (options) => {
    const { updateCommand } = await import('./commands/update.js');
    await updateCommand(options);
  });

// Version command
program
  .command('version')
  .description('Hiển thị thông tin phiên bản')
  .option('--remote', 'Hiển thị phiên bản có sẵn trên cloud')
  .action(async (options) => {
    const { versionCommand } = await import('./commands/version.js');
    await versionCommand(options);
  });

// Start command
program
  .command('start')
  .description('Khởi động tất cả dịch vụ')
  .action(async () => {
    const { startCommand } = await import('./commands/start.js');
    await startCommand();
  });

// Stop command
program
  .command('stop')
  .description('Dừng tất cả dịch vụ')
  .action(async () => {
    const { stopCommand } = await import('./commands/stop.js');
    await stopCommand();
  });

// Logs command
program
  .command('logs [service]')
  .description('Xem logs của dịch vụ')
  .action(async (service) => {
    const { logsCommand } = await import('./commands/logs.js');
    await logsCommand(service);
  });

// Seed command
program
  .command('seed')
  .description('Tạo dữ liệu mẫu')
  .option('--admin-only', 'Chỉ tạo tài khoản admin')
  .option('--full', 'Tạo toàn bộ dữ liệu demo')
  .option('--force', 'Ghi đè dữ liệu hiện có')
  .action(async (options) => {
    const { seedCommand } = await import('./commands/seed.js');
    await seedCommand(options);
  });

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  console.log(chalk.cyan('\n🚀 Chào mừng đến với AutoNow FB CLI!\n'));
  console.log('Chạy trình cài đặt để bắt đầu:\n');
  console.log('  ' + chalk.bold('npx autonow-fb setup'));
  console.log('\nHoặc dùng --help để xem tất cả các lệnh.\n');
}