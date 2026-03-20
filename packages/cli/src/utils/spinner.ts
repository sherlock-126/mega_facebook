import ora, { type Ora } from 'ora';
import chalk from 'chalk';

class SpinnerManager {
  private spinner: Ora | null = null;

  start(text: string): void {
    this.spinner = ora({
      text,
      color: 'cyan',
    }).start();
  }

  update(text: string): void {
    if (this.spinner) {
      this.spinner.text = text;
    }
  }

  succeed(text?: string): void {
    if (this.spinner) {
      this.spinner.succeed(text ? chalk.green(text) : undefined);
      this.spinner = null;
    }
  }

  fail(text?: string): void {
    if (this.spinner) {
      this.spinner.fail(text ? chalk.red(text) : undefined);
      this.spinner = null;
    }
  }

  warn(text?: string): void {
    if (this.spinner) {
      this.spinner.warn(text ? chalk.yellow(text) : undefined);
      this.spinner = null;
    }
  }

  info(text?: string): void {
    if (this.spinner) {
      this.spinner.info(text ? chalk.blue(text) : undefined);
      this.spinner = null;
    }
  }

  stop(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  isSpinning(): boolean {
    return this.spinner !== null && this.spinner.isSpinning;
  }
}

export const spinner = new SpinnerManager();