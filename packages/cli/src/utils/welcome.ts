import boxen from 'boxen';
import chalk from 'chalk';
import terminalLink from 'terminal-link';
import { logger } from './logger.js';

export function showWelcome(): void {
  const title = chalk.bold.cyan('🚀 Mega Facebook CLI');
  const version = chalk.gray('v1.0.0');
  const description = chalk.white('Quick setup and management for your social platform');

  const content = `${title} ${version}
${description}

${chalk.yellow('Getting Started:')}
  ${chalk.cyan('mega-cli')}         Interactive setup wizard
  ${chalk.cyan('mega-cli doctor')}  Check system requirements
  ${chalk.cyan('mega-cli --help')}  Show all commands

${chalk.yellow('Resources:')}
  ${terminalLink('Documentation', 'https://github.com/sherlock-126/mega_facebook#readme')}
  ${terminalLink('Report Issues', 'https://github.com/sherlock-126/mega_facebook/issues')}`;

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