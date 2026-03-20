import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs-extra';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getProjectRoot(): string {
  // CLI is at packages/cli, so go up 2 levels to reach project root
  return resolve(__dirname, '..', '..', '..');
}

export function getPath(...segments: string[]): string {
  return join(getProjectRoot(), ...segments);
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