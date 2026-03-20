import boxen from 'boxen';
import chalk from 'chalk';
import terminalLink from 'terminal-link';
import { logger } from './logger.js';

export function showWelcome(): void {
  const title = chalk.bold.cyan('🚀 AutoNow FB');
  const version = chalk.gray('v1.0.0');
  const description = chalk.white('Nền tảng mạng xã hội thế hệ mới');

  const content = `${title} ${version}
${description}

${chalk.yellow('Bắt đầu nhanh:')}
  ${chalk.cyan('autonow-fb')}         Cài đặt tương tác
  ${chalk.cyan('autonow-fb install')}  Tải từ Cloud
  ${chalk.cyan('autonow-fb doctor')}   Kiểm tra hệ thống
  ${chalk.cyan('autonow-fb --help')}   Xem tất cả lệnh

${chalk.yellow('Tài nguyên:')}
  ${terminalLink('Tài liệu', 'https://github.com/sherlock-126/mega_facebook#readme')}
  ${terminalLink('Báo lỗi', 'https://github.com/sherlock-126/mega_facebook/issues')}`;

  const box = boxen(content, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'cyan',
    float: 'center',
  });

  logger.raw(box);
}

export function showSuccess(message: string): void {
  const box = boxen(chalk.green(`✅ ${message}`), {
    padding: 1,
    borderStyle: 'round',
    borderColor: 'green',
  });

  logger.raw(box);
}

export function showError(message: string): void {
  const box = boxen(chalk.red(`❌ ${message}`), {
    padding: 1,
    borderStyle: 'round',
    borderColor: 'red',
  });

  logger.raw(box);
}