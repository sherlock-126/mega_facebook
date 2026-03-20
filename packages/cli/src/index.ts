#!/usr/bin/env node

import { Command } from 'commander';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = await fs.readJson(packageJsonPath);

const program = new Command();

program
  .name('autonow-fb')
  .description('CLI for quick setup and management of AutoNow FB platform')
  .version(packageJson.version);

// Setup command (default)
program
  .command('setup', { isDefault: true })
  .description('Run the interactive setup wizard')
  .action(async () => {
    const { setupCommand } = await import('./commands/setup.js');
    await setupCommand();
  });

// Doctor command
program
  .command('doctor')
  .description('Check system health and configuration')
  .action(async () => {
    const { doctorCommand } = await import('./commands/doctor.js');
    await doctorCommand();
  });

// Reset command
program
  .command('reset')
  .description('Reset the environment (delete all data)')
  .option('-f, --force', 'Skip confirmation prompts')
  .action(async (options) => {
    const { resetCommand } = await import('./commands/reset.js');
    await resetCommand(options);
  });

// Install command
program
  .command('install')
  .description('Download and install AutoNow FB from cloud')
  .option('-v, --version <version>', 'Specific version (default: latest)')
  .option('-f, --force', 'Overwrite existing installation')
  .option('--dry-run', 'Check version without installing')
  .option('--verify', 'Verify checksums after download')
  .action(async (options) => {
    const { installCommand } = await import('./commands/install.js');
    await installCommand(options);
  });

// Update command
program
  .command('update')
  .description('Check and update to latest version')
  .option('--check', 'Check only, do not update')
  .action(async (options) => {
    const { updateCommand } = await import('./commands/update.js');
    await updateCommand(options);
  });

// Version command
program
  .command('version')
  .description('Show version information')
  .option('--remote', 'Show available versions on cloud')
  .action(async (options) => {
    const { versionCommand } = await import('./commands/version.js');
    await versionCommand(options);
  });

// Start command - TODO: implement
// program
//   .command('start')
//   .description('Start all services')
//   .action(async () => {
//     const { startCommand } = await import('./commands/start.js');
//     await startCommand();
//   });

// Stop command - TODO: implement
// program
//   .command('stop')
//   .description('Stop all services')
//   .action(async () => {
//     const { stopCommand } = await import('./commands/stop.js');
//     await stopCommand();
//   });

// Logs command - TODO: implement
// program
//   .command('logs [service]')
//   .description('View service logs')
//   .action(async (service) => {
//     const { logsCommand } = await import('./commands/logs.js');
//     await logsCommand(service);
//   });

// Seed command - TODO: implement
// program
//   .command('seed')
//   .description('Generate sample data')
//   .option('--admin-only', 'Create admin account only')
//   .option('--full', 'Create full demo dataset')
//   .option('--force', 'Overwrite existing data')
//   .action(async (options) => {
//     const { seedCommand } = await import('./commands/seed.js');
//     await seedCommand(options);
//   });

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  console.log(chalk.cyan('\n🚀 Welcome to AutoNow FB CLI!\n'));
  console.log('Run the setup wizard to get started:\n');
  console.log('  ' + chalk.bold('npx autonow-fb setup'));
  console.log('\nOr use --help to see all available commands.\n');
}