import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs-extra';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getProjectRoot(): string {
  // CLI is at packages/cli, so go up 2 levels to reach project root
  return resolve(__dirname, '..', '..', '..');
}

export function findProjectRoot(): string {
  // For installed CLI, find the project root from current directory
  let currentDir = process.cwd();

  while (currentDir !== '/') {
    if (fs.existsSync(join(currentDir, 'package.json'))) {
      const pkg = fs.readJsonSync(join(currentDir, 'package.json'));
      if (pkg.name === 'mega-facebook' || fs.existsSync(join(currentDir, 'turbo.json'))) {
        return currentDir;
      }
    }
    currentDir = dirname(currentDir);
  }

  // Fallback to current directory
  return process.cwd();
}

export function getPath(...segments: string[]): string {
  return join(getProjectRoot(), ...segments);
}

export function getCliPath(): string {
  return resolve(__dirname, '..', '..');
}

export function getConfigDir(): string {
  return join(os.homedir(), '.autonow-fb');
}

export function getConfigPath(): string {
  return join(getConfigDir(), 'config.json');
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(path: string): Promise<void> {
  await fs.ensureDir(path);
}