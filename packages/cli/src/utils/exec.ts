import { execa, type ExecaError } from 'execa';
import { logger } from './logger.js';

export interface ExecOptions {
  cwd?: string;
  silent?: boolean;
  throwOnError?: boolean;
}

export async function exec(
  command: string,
  args: string[] = [],
  options: ExecOptions = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const { cwd = process.cwd(), silent = false, throwOnError = true } = options;

  try {
    if (!silent) {
      logger.debug(`Executing: ${command} ${args.join(' ')}`);
    }

    const result = await execa(command, args, {
      cwd,
      reject: false,
    });

    if (result.exitCode !== 0 && throwOnError) {
      throw new Error(
        `Command failed with exit code ${result.exitCode}: ${result.stderr || result.stdout}`
      );
    }

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode || 0,
    };
  } catch (error) {
    const execError = error as ExecaError;
    if (throwOnError) {
      throw new Error(
        `Failed to execute ${command}: ${execError.message}`
      );
    }
    return {
      stdout: execError.stdout || '',
      stderr: execError.stderr || execError.message,
      exitCode: execError.exitCode || 1,
    };
  }
}