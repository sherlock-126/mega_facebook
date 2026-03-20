import chalk from 'chalk';
import { runSystemCheck } from '../services/system-check.js';
import { validateEnvFiles } from '../services/env-generator.js';
import { getDockerStatus } from '../services/docker-manager.js';
import { checkDatabaseConnection, checkMigrationsStatus } from '../services/database-setup.js';
import { checkMinIOConnection } from '../services/storage-setup.js';
import { logger } from '../utils/logger.js';

interface HealthCheckResult {
  category: string;
  items: Array<{
    name: string;
    status: 'ok' | 'warning' | 'error';
    message?: string;
  }>;
}

export async function doctorCommand(): Promise<void> {
  console.log(chalk.bold('\n🩺 Mega Facebook Health Check\n'));
  console.log(chalk.gray('Checking system health...\n'));

  const results: HealthCheckResult[] = [];

  // System Requirements
  const systemResult: HealthCheckResult = {
    category: 'System Requirements',
    items: [],
  };

  const systemCheck = await runSystemCheck();
  systemResult.items.push({
    name: 'Node.js',
    status: systemCheck.nodeVersion ? 'ok' : 'error',
    message: systemCheck.nodeVersion || 'Not found',
  });

  systemResult.items.push({
    name: 'Docker',
    status: systemCheck.dockerVersion ? 'ok' : 'error',
    message: systemCheck.dockerVersion || 'Not installed',
  });

  if (systemCheck.warnings.length > 0) {
    systemResult.items.push({
      name: 'Ports',
      status: 'warning',
      message: systemCheck.warnings.join(', '),
    });
  } else {
    systemResult.items.push({
      name: 'Ports',
      status: 'ok',
      message: 'All required ports are available',
    });
  }

  results.push(systemResult);

  // Environment Configuration
  const envResult: HealthCheckResult = {
    category: 'Environment Configuration',
    items: [],
  };

  const envCheck = await validateEnvFiles();
  if (envCheck.valid) {
    envResult.items.push({
      name: 'Environment Files',
      status: 'ok',
      message: 'All environment files present',
    });
  } else {
    envResult.items.push({
      name: 'Environment Files',
      status: 'error',
      message: `Missing: ${envCheck.missing.join(', ')}`,
    });
  }

  results.push(envResult);

  // Docker Services
  const dockerResult: HealthCheckResult = {
    category: 'Docker Services',
    items: [],
  };

  const dockerStatus = await getDockerStatus();
  for (const service of dockerStatus.services) {
    let status: 'ok' | 'warning' | 'error' = 'error';
    let message = service.status;

    if (service.status === 'running') {
      if (service.health === 'healthy') {
        status = 'ok';
        message = 'Running (healthy)';
      } else if (service.health === 'starting') {
        status = 'warning';
        message = 'Running (starting)';
      } else if (service.health === 'unhealthy') {
        status = 'error';
        message = 'Running (unhealthy)';
      } else {
        status = 'ok';
        message = 'Running';
      }
    }

    dockerResult.items.push({
      name: service.name,
      status,
      message,
    });
  }

  if (dockerStatus.services.length === 0) {
    dockerResult.items.push({
      name: 'Services',
      status: 'error',
      message: 'No services running',
    });
  }

  results.push(dockerResult);

  // Database
  const dbResult: HealthCheckResult = {
    category: 'Database',
    items: [],
  };

  const dbConnection = await checkDatabaseConnection();
  dbResult.items.push({
    name: 'Connection',
    status: dbConnection.connected ? 'ok' : 'error',
    message: dbConnection.connected ? 'Connected' : dbConnection.error || 'Not connected',
  });

  if (dbConnection.connected) {
    const migrationStatus = await checkMigrationsStatus();
    dbResult.items.push({
      name: 'Migrations',
      status: migrationStatus.upToDate ? 'ok' : 'warning',
      message: migrationStatus.upToDate
        ? 'Up to date'
        : `${migrationStatus.pending} pending migrations`,
    });
  }

  results.push(dbResult);

  // Storage
  const storageResult: HealthCheckResult = {
    category: 'Storage (MinIO)',
    items: [],
  };

  const minioConnection = await checkMinIOConnection();
  storageResult.items.push({
    name: 'Connection',
    status: minioConnection.connected ? 'ok' : 'warning',
    message: minioConnection.connected
      ? 'Connected'
      : minioConnection.error || 'Not connected',
  });

  if (minioConnection.connected && minioConnection.buckets) {
    storageResult.items.push({
      name: 'Buckets',
      status: minioConnection.buckets.includes('mega-uploads') ? 'ok' : 'warning',
      message: minioConnection.buckets.includes('mega-uploads')
        ? 'mega-uploads bucket exists'
        : 'mega-uploads bucket not found',
    });
  }

  results.push(storageResult);

  // Display results
  let hasErrors = false;
  let hasWarnings = false;

  for (const result of results) {
    console.log(chalk.bold.underline(result.category));

    for (const item of result.items) {
      const statusIcon =
        item.status === 'ok'
          ? chalk.green('✓')
          : item.status === 'warning'
          ? chalk.yellow('⚠')
          : chalk.red('✗');

      const statusText =
        item.status === 'ok'
          ? chalk.green(item.message)
          : item.status === 'warning'
          ? chalk.yellow(item.message)
          : chalk.red(item.message);

      console.log(`  ${statusIcon} ${item.name}: ${statusText}`);

      if (item.status === 'error') hasErrors = true;
      if (item.status === 'warning') hasWarnings = true;
    }

    console.log();
  }

  // Summary
  console.log(chalk.bold('Summary:'));
  if (!hasErrors && !hasWarnings) {
    console.log(chalk.green('✨ All systems operational!'));
  } else if (hasErrors) {
    console.log(chalk.red('❌ Some systems have errors. Run "npx @mega/cli setup" to fix.'));
  } else if (hasWarnings) {
    console.log(chalk.yellow('⚠️  Some warnings detected, but the system should work.'));
  }

  // Set exit code based on status
  process.exit(hasErrors ? 1 : 0);
}