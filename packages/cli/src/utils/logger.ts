import chalk from 'chalk';

export const logger = {
  info: (message: string) => {
    console.log(chalk.blue('ℹ'), message);
  },
  success: (message: string) => {
    console.log(chalk.green('✓'), message);
  },
  error: (message: string) => {
    console.log(chalk.red('✗'), message);
  },
  warning: (message: string) => {
    console.log(chalk.yellow('⚠'), message);
  },
  debug: (message: string) => {
    if (process.env.DEBUG) {
      console.log(chalk.gray('[DEBUG]'), message);
    }
  },
};