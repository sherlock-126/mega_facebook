import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import Conf from 'conf';
import { getConfigDir, getConfigPath } from '../utils/paths.js';
import { logger } from '../utils/logger.js';

export interface CliConfig {
  lastProjectPath?: string;
  lastUpdateCheck?: number;
  skipUpdateCheck?: boolean;
  defaultEnvironment?: 'development' | 'production';
  telemetryEnabled?: boolean;
  preferences?: {
    colorOutput?: boolean;
    verboseLogging?: boolean;
  };
}

// Singleton instance
let configManagerInstance: ConfigManager;

function getConfigManager(): ConfigManager {
  if (!configManagerInstance) {
    configManagerInstance = new ConfigManager();
  }
  return configManagerInstance;
}

// Export functions for backward compatibility
export function getConfig<K extends keyof CliConfig>(key: K): CliConfig[K] {
  return getConfigManager().get(key);
}

export function setConfig<K extends keyof CliConfig>(key: K, value: CliConfig[K]): void {
  getConfigManager().set(key, value);
}

export class ConfigManager {
  private store: Conf<CliConfig>;
  private configDir: string;

  constructor() {
    this.configDir = getConfigDir();

    // Ensure config directory exists
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true });
    }

    this.store = new Conf<CliConfig>({
      projectName: 'mega-cli',
      cwd: this.configDir,
      defaults: {
        telemetryEnabled: false,
        defaultEnvironment: 'development',
        preferences: {
          colorOutput: true,
          verboseLogging: false,
        },
      },
    });
  }

  get<K extends keyof CliConfig>(key: K): CliConfig[K] {
    return this.store.get(key);
  }

  set<K extends keyof CliConfig>(key: K, value: CliConfig[K]): void {
    this.store.set(key, value);
  }

  getAll(): CliConfig {
    return this.store.store;
  }

  reset(): void {
    this.store.clear();
    logger.success('Configuration reset to defaults');
  }

  getProjectPath(): string | undefined {
    return this.get('lastProjectPath');
  }

  setProjectPath(path: string): void {
    this.set('lastProjectPath', path);
  }

  shouldCheckForUpdates(): boolean {
    const skipCheck = this.get('skipUpdateCheck');
    if (skipCheck) return false;

    const lastCheck = this.get('lastUpdateCheck');
    if (!lastCheck) return true;

    // Check once per day
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return lastCheck < oneDayAgo;
  }

  updateLastUpdateCheck(): void {
    this.set('lastUpdateCheck', Date.now());
  }

  exportConfig(filePath: string): void {
    const config = this.getAll();
    writeFileSync(filePath, JSON.stringify(config, null, 2));
    logger.success(`Configuration exported to: ${filePath}`);
  }

  importConfig(filePath: string): void {
    if (!existsSync(filePath)) {
      throw new Error(`Configuration file not found: ${filePath}`);
    }

    try {
      const content = readFileSync(filePath, 'utf-8');
      const config = JSON.parse(content) as CliConfig;

      // Validate and set each config value
      for (const [key, value] of Object.entries(config)) {
        this.set(key as keyof CliConfig, value);
      }

      logger.success('Configuration imported successfully');
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error}`);
    }
  }

  printConfig(): void {
    const config = this.getAll();
    logger.info('Current Configuration:');
    logger.raw(JSON.stringify(config, null, 2));
  }
}