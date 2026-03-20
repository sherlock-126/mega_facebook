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
  .name('mega-cli')
  .description('Interactive CLI for setting up and managing Mega Facebook')
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

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  console.log(chalk.cyan('\n🚀 Welcome to Mega Facebook CLI!\n'));
  console.log('Run the setup wizard to get started:\n');
  console.log('  ' + chalk.bold('npx @mega/cli setup'));
  console.log('\nOr use --help to see all available commands.\n');
}