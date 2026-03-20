import semver from 'semver';
import which from 'which';
import { exec } from '../utils/exec.js';
import { logger } from '../utils/logger.js';
import { CONSTANTS } from '../constants.js';
import chalk from 'chalk';
import net from 'net';

export interface SystemCheckResult {
  valid: boolean;
  nodeVersion?: string;
  dockerVersion?: string;
  errors: string[];
  warnings: string[];
}

export async function checkNode(): Promise<{
  valid: boolean;
  version: string;
  error?: string;
}> {
  try {
    const nodeVersion = process.version;
    const isValid = semver.gte(nodeVersion, CONSTANTS.MIN_NODE_VERSION);

    if (!isValid) {
      return {
        valid: false,
        version: nodeVersion,
        error: `Node.js version ${nodeVersion} is below minimum required version ${CONSTANTS.MIN_NODE_VERSION}`,
      };
    }

    return { valid: true, version: nodeVersion };
  } catch (error) {
    return {
      valid: false,
      version: 'unknown',
      error: `Failed to check Node.js version: ${error}`,
    };
  }
}

export async function checkDocker(): Promise<{
  valid: boolean;
  version?: string;
  error?: string;
}> {
  try {
    // Check if Docker is installed
    const dockerPath = await which('docker').catch(() => null);
    if (!dockerPath) {
      return {
        valid: false,
        error: 'Docker is not installed. Please install Docker Desktop or Docker Engine.',
      };
    }

    // Check Docker version
    const { stdout: versionOutput } = await exec('docker', ['--version'], {
      throwOnError: false,
    });

    const versionMatch = versionOutput.match(/Docker version ([\d.]+)/);
    const version = versionMatch ? versionMatch[1] : 'unknown';

    // Check if Docker daemon is running
    const { exitCode } = await exec('docker', ['info'], {
      silent: true,
      throwOnError: false,
    });

    if (exitCode !== 0) {
      return {
        valid: false,
        version,
        error: 'Docker daemon is not running. Please start Docker Desktop or Docker Engine.',
      };
    }

    return { valid: true, version };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to check Docker: ${error}`,
    };
  }
}

export async function checkDockerCompose(): Promise<{
  valid: boolean;
  version?: string;
  error?: string;
}> {
  try {
    // Try docker compose (v2)
    const { stdout, exitCode } = await exec('docker', ['compose', 'version'], {
      throwOnError: false,
      silent: true,
    });

    if (exitCode === 0) {
      const versionMatch = stdout.match(/version v?([\d.]+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';
      return { valid: true, version };
    }

    // Fallback to docker-compose (v1)
    const composePath = await which('docker-compose').catch(() => null);
    if (composePath) {
      const { stdout: v1Output } = await exec('docker-compose', ['--version'], {
        throwOnError: false,
      });
      const v1Match = v1Output.match(/version ([\d.]+)/);
      const v1Version = v1Match ? v1Match[1] : 'unknown';
      return { valid: true, version: v1Version };
    }

    return {
      valid: false,
      error: 'Docker Compose is not installed. It should come with Docker Desktop.',
    };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to check Docker Compose: ${error}`,
    };
  }
}

export async function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false); // Port is in use
      } else {
        resolve(true); // Other error, assume port is free
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true); // Port is free
    });

    server.listen(port, '127.0.0.1');
  });
}

export async function checkPorts(): Promise<{
  valid: boolean;
  inUse: Array<{ name: string; port: number }>;
}> {
  const inUse: Array<{ name: string; port: number }> = [];

  for (const [name, port] of Object.entries(CONSTANTS.REQUIRED_PORTS)) {
    const isFree = await checkPort(port);
    if (!isFree) {
      inUse.push({ name, port });
    }
  }

  return {
    valid: inUse.length === 0,
    inUse,
  };
}

export async function runSystemCheck(): Promise<SystemCheckResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  logger.info('Checking system requirements...');

  // Check Node.js
  const nodeCheck = await checkNode();
  if (!nodeCheck.valid) {
    errors.push(nodeCheck.error!);
  } else {
    logger.success(`Node.js ${nodeCheck.version} ${chalk.gray('(OK)')}`);
  }

  // Check Docker
  const dockerCheck = await checkDocker();
  if (!dockerCheck.valid) {
    errors.push(dockerCheck.error!);
  } else {
    logger.success(`Docker ${dockerCheck.version} ${chalk.gray('(OK)')}`);
  }

  // Check Docker Compose
  const composeCheck = await checkDockerCompose();
  if (!composeCheck.valid) {
    errors.push(composeCheck.error!);
  } else {
    logger.success(`Docker Compose ${composeCheck.version} ${chalk.gray('(OK)')}`);
  }

  // Check ports
  const portsCheck = await checkPorts();
  if (!portsCheck.valid) {
    const portsList = portsCheck.inUse
      .map((p) => `${p.name} (${p.port})`)
      .join(', ');
    warnings.push(`The following ports are already in use: ${portsList}`);
    warnings.push('You may need to stop other services or change the port configuration.');
  }

  return {
    valid: errors.length === 0,
    nodeVersion: nodeCheck.version,
    dockerVersion: dockerCheck.version,
    errors,
    warnings,
  };
}