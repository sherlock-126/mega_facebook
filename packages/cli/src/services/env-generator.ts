import fs from 'fs-extra';
import { getPath, fileExists } from '../utils/paths.js';
import { logger } from '../utils/logger.js';
import { CONSTANTS } from '../constants.js';
import * as dotenv from 'dotenv';
import chalk from 'chalk';

export interface EnvConfig {
  skipExisting?: boolean;
  customValues?: Record<string, string>;
}

export async function generateEnvFiles(config: EnvConfig = {}): Promise<void> {
  const { skipExisting = false, customValues = {} } = config;

  // Read the .env.example file
  const examplePath = getPath(CONSTANTS.PATHS.envExample);
  const exampleExists = await fileExists(examplePath);

  if (!exampleExists) {
    throw new Error(`.env.example file not found at ${examplePath}`);
  }

  const exampleContent = await fs.readFile(examplePath, 'utf-8');
  const exampleVars = dotenv.parse(exampleContent);

  // Merge with custom values
  const finalVars = { ...exampleVars, ...customValues };

  // Generate content
  const envContent = generateEnvContent(finalVars);

  // Create .env for API
  await createEnvFile(
    getPath(CONSTANTS.ENV_FILES.api),
    envContent,
    skipExisting
  );

  // Create .env.local for Web (with NEXT_PUBLIC_ prefix handling)
  const webEnvContent = generateWebEnvContent(finalVars);
  await createEnvFile(
    getPath(CONSTANTS.ENV_FILES.web),
    webEnvContent,
    skipExisting
  );
}

async function createEnvFile(
  path: string,
  content: string,
  skipExisting: boolean
): Promise<void> {
  const exists = await fileExists(path);

  if (exists && skipExisting) {
    logger.info(`Skipping existing file: ${chalk.gray(path)}`);
    return;
  }

  if (exists) {
    // Backup existing file
    const backupPath = `${path}.backup.${Date.now()}`;
    await fs.copy(path, backupPath);
    logger.info(`Backed up existing file to: ${chalk.gray(backupPath)}`);
  }

  // Ensure directory exists
  await fs.ensureDir(path.replace(/\/[^/]+$/, ''));

  // Write the file
  await fs.writeFile(path, content, 'utf-8');
  logger.success(`Created: ${chalk.green(path)}`);
}

function generateEnvContent(vars: Record<string, string>): string {
  const sections = {
    database: ['DATABASE_URL'],
    redis: ['REDIS_URL'],
    minio: ['MINIO_ENDPOINT', 'MINIO_PORT', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY', 'MINIO_BUCKET', 'MINIO_USE_SSL'],
    elasticsearch: ['ELASTICSEARCH_URL'],
    api: ['API_PORT'],
    jwt: ['JWT_SECRET', 'JWT_ACCESS_EXPIRATION', 'JWT_REFRESH_EXPIRATION_DAYS'],
    web: ['NEXT_PUBLIC_API_URL'],
  };

  let content = '';

  for (const [section, keys] of Object.entries(sections)) {
    // Add section header
    content += `# ${section.charAt(0).toUpperCase() + section.slice(1)}\n`;

    // Add variables
    for (const key of keys) {
      if (key in vars) {
        content += `${key}=${vars[key]}\n`;
      }
    }

    content += '\n';
  }

  return content.trim() + '\n';
}

function generateWebEnvContent(vars: Record<string, string>): string {
  // For Next.js, we only need NEXT_PUBLIC_ prefixed variables
  const webVars: Record<string, string> = {};

  for (const [key, value] of Object.entries(vars)) {
    if (key.startsWith('NEXT_PUBLIC_')) {
      webVars[key] = value;
    }
  }

  // Add any additional web-specific variables if needed
  if (!webVars.NEXT_PUBLIC_API_URL && vars.API_PORT) {
    webVars.NEXT_PUBLIC_API_URL = `http://localhost:${vars.API_PORT}`;
  }

  return generateEnvContent(webVars);
}

export async function validateEnvFiles(): Promise<{
  valid: boolean;
  missing: string[];
}> {
  const missing: string[] = [];

  for (const [name, path] of Object.entries(CONSTANTS.ENV_FILES)) {
    const fullPath = getPath(path);
    const exists = await fileExists(fullPath);
    if (!exists) {
      missing.push(`${name}: ${path}`);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

export async function loadEnvVariables(): Promise<Record<string, string>> {
  const apiEnvPath = getPath(CONSTANTS.ENV_FILES.api);
  const exists = await fileExists(apiEnvPath);

  if (!exists) {
    return {};
  }

  const content = await fs.readFile(apiEnvPath, 'utf-8');
  return dotenv.parse(content);
}