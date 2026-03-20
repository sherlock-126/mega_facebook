import { exec } from '../utils/exec.js';
import { getPath } from '../utils/paths.js';
import { logger } from '../utils/logger.js';
import { CONSTANTS } from '../constants.js';
import chalk from 'chalk';

export interface DockerStatus {
  running: boolean;
  services: Array<{
    name: string;
    status: 'running' | 'stopped' | 'error';
    health?: 'healthy' | 'unhealthy' | 'starting';
  }>;
}

export async function startDockerServices(): Promise<void> {
  const composePath = getPath(CONSTANTS.PATHS.dockerCompose);

  logger.info('Starting Docker services...');

  // Pull latest images first
  logger.info('Pulling Docker images (this may take a few minutes)...');
  await exec('docker', ['compose', '-f', composePath, 'pull'], {
    cwd: getPath(),
  });

  // Start services in detached mode
  await exec('docker', ['compose', '-f', composePath, 'up', '-d'], {
    cwd: getPath(),
  });

  logger.success('Docker services started');

  // Wait for services to be healthy
  await waitForHealthyServices();
}

export async function stopDockerServices(): Promise<void> {
  const composePath = getPath(CONSTANTS.PATHS.dockerCompose);

  logger.info('Stopping Docker services...');

  await exec('docker', ['compose', '-f', composePath, 'down'], {
    cwd: getPath(),
  });

  logger.success('Docker services stopped');
}

export async function resetDockerServices(): Promise<void> {
  const composePath = getPath(CONSTANTS.PATHS.dockerCompose);

  logger.info('Resetting Docker services (removing volumes)...');

  await exec('docker', ['compose', '-f', composePath, 'down', '-v'], {
    cwd: getPath(),
  });

  logger.success('Docker services reset');
}

export async function getDockerStatus(): Promise<DockerStatus> {
  const composePath = getPath(CONSTANTS.PATHS.dockerCompose);

  try {
    const { stdout } = await exec(
      'docker',
      ['compose', '-f', composePath, 'ps', '--format', 'json'],
      {
        cwd: getPath(),
        throwOnError: false,
      }
    );

    if (!stdout) {
      return { running: false, services: [] };
    }

    // Parse JSON output (each line is a separate JSON object)
    const lines = stdout.split('\n').filter((line) => line.trim());
    const services = lines.map((line) => {
      try {
        const container = JSON.parse(line);
        return {
          name: container.Service,
          status: container.State === 'running' ? 'running' : 'stopped',
          health: parseHealthStatus(container.Health),
        };
      } catch {
        return null;
      }
    }).filter(Boolean) as DockerStatus['services'];

    const running = services.some((s) => s.status === 'running');

    return { running, services };
  } catch (error) {
    logger.debug(`Failed to get Docker status: ${error}`);
    return { running: false, services: [] };
  }
}

function parseHealthStatus(health: string): 'healthy' | 'unhealthy' | 'starting' | undefined {
  if (!health || health === 'none') return undefined;
  if (health.includes('healthy')) return 'healthy';
  if (health.includes('unhealthy')) return 'unhealthy';
  if (health.includes('starting')) return 'starting';
  return undefined;
}

async function waitForHealthyServices(maxRetries = 30): Promise<void> {
  logger.info('Waiting for services to be healthy...');

  for (let i = 0; i < maxRetries; i++) {
    const status = await getDockerStatus();

    const unhealthyServices = status.services.filter(
      (s) => s.health && s.health !== 'healthy'
    );

    if (unhealthyServices.length === 0) {
      logger.success('All services are healthy');
      return;
    }

    // Show progress
    const healthyCount = status.services.filter(
      (s) => s.health === 'healthy'
    ).length;
    const totalWithHealth = status.services.filter((s) => s.health).length;

    logger.info(
      `Health check progress: ${chalk.green(healthyCount)}/${totalWithHealth} services healthy`
    );

    // Show unhealthy services
    for (const service of unhealthyServices) {
      logger.debug(`  ${service.name}: ${service.health}`);
    }

    // Wait before next check
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // If we get here, some services are still not healthy
  const status = await getDockerStatus();
  const stillUnhealthy = status.services.filter(
    (s) => s.health && s.health !== 'healthy'
  );

  if (stillUnhealthy.length > 0) {
    logger.warning('Some services are still not healthy:');
    for (const service of stillUnhealthy) {
      logger.warning(`  - ${service.name}: ${service.health}`);
    }
    logger.warning('You can continue, but some features may not work properly.');
  }
}

export async function checkDockerServicesRunning(): Promise<boolean> {
  const status = await getDockerStatus();
  return status.services.every((s) => s.status === 'running');
}