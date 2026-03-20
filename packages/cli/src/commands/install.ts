import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import * as tar from 'tar';
import crypto from 'crypto';
import { confirm, text } from '@clack/prompts';
import { logger } from '../utils/logger';
import { R2_CONFIG } from '../config/r2';
import { getConfig, setConfig } from '../services/config-manager';
import semver from 'semver';

export const installCommand = new Command('install')
  .description('Install Mega Facebook from cloud release')
  .option('-v, --version <version>', 'Specific version to install')
  .option('-f, --force', 'Force install even if already exists')
  .option('-d, --dry-run', 'Check available version without installing')
  .option('--verify', 'Verify checksums after download')
  .option('-p, --path <path>', 'Installation path', process.cwd())
  .action(async (options) => {
    const spinner = ora();

    try {
      // Fetch manifest
      spinner.start('Fetching release manifest...');
      const manifestUrl = options.version
        ? `${R2_CONFIG.baseUrl}/releases/v${options.version}/manifest.json`
        : `${R2_CONFIG.baseUrl}/releases/latest/manifest.json`;

      let manifest;
      try {
        const response = await axios.get(manifestUrl);
        manifest = response.data;
      } catch (error: any) {
        spinner.fail('Failed to fetch manifest');
        if (error.response?.status === 404) {
          logger.error(`Version ${options.version || 'latest'} not found`);
        } else {
          logger.error(`Network error: ${error.message}`);
        }
        process.exit(1);
      }
      spinner.succeed(`Found version ${manifest.version}`);

      // Check if already installed
      const config = getConfig();
      if (config.installedVersion && !options.force && !options.dryRun) {
        const shouldUpdate = await confirm({
          message: `Version ${config.installedVersion} is already installed. Overwrite?`,
        });
        if (!shouldUpdate) {
          logger.info('Installation cancelled');
          process.exit(0);
        }
      }

      // Dry run - just show info
      if (options.dryRun) {
        console.log('\n' + chalk.cyan('Release Information:'));
        console.log(`  Version: ${manifest.version}`);
        console.log(`  Build: ${manifest.buildId}`);
        console.log(`  Date: ${manifest.timestamp}`);
        console.log(`  API: ${(manifest.artifacts.api.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  Web: ${(manifest.artifacts.web.size / 1024 / 1024).toFixed(2)} MB`);
        process.exit(0);
      }

      // Check Node version
      const nodeVersion = process.version;
      if (manifest.requirements?.node && !semver.satisfies(nodeVersion, manifest.requirements.node)) {
        logger.error(`Node version ${nodeVersion} does not satisfy ${manifest.requirements.node}`);
        process.exit(1);
      }

      // Set installation path
      const installPath = path.resolve(options.path);
      await fs.ensureDir(installPath);

      // Download artifacts
      console.log('\n' + chalk.cyan('Downloading artifacts...'));

      const artifacts = ['api', 'web'];
      const downloadedFiles: { [key: string]: string } = {};

      for (const artifact of artifacts) {
        const artifactInfo = manifest.artifacts[artifact];
        if (!artifactInfo) continue;

        spinner.start(`Downloading ${artifact}...`);
        const tempFile = path.join(installPath, `.${artifact}.tar.gz.tmp`);

        try {
          const response = await axios.get(artifactInfo.url, {
            responseType: 'stream',
            onDownloadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                spinner.text = `Downloading ${artifact}... ${percentCompleted}%`;
              }
            },
          });

          const writer = fs.createWriteStream(tempFile);
          response.data.pipe(writer);

          await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
          });

          // Verify checksum if requested
          if (options.verify && artifactInfo.checksum) {
            spinner.text = `Verifying ${artifact} checksum...`;
            const fileBuffer = await fs.readFile(tempFile);
            const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
            const expectedHash = artifactInfo.checksum.replace('sha256:', '');

            if (hash !== expectedHash) {
              throw new Error(`Checksum mismatch for ${artifact}`);
            }
          }

          downloadedFiles[artifact] = tempFile;
          spinner.succeed(`Downloaded ${artifact}`);
        } catch (error: any) {
          spinner.fail(`Failed to download ${artifact}`);
          throw error;
        }
      }

      // Extract artifacts
      console.log('\n' + chalk.cyan('Extracting artifacts...'));

      for (const [artifact, filePath] of Object.entries(downloadedFiles)) {
        spinner.start(`Extracting ${artifact}...`);
        const targetDir = path.join(installPath, `apps/${artifact}`);
        await fs.ensureDir(targetDir);

        try {
          await tar.x({
            file: filePath,
            cwd: targetDir,
            strip: 2, // Remove apps/api or apps/web prefix
          });
          spinner.succeed(`Extracted ${artifact}`);

          // Clean up temp file
          await fs.remove(filePath);
        } catch (error: any) {
          spinner.fail(`Failed to extract ${artifact}`);
          throw error;
        }
      }

      // Generate .env files if they don't exist
      spinner.start('Setting up environment...');
      const envFiles = [
        { source: 'apps/api/.env.example', target: 'apps/api/.env' },
        { source: 'apps/web/.env.example', target: 'apps/web/.env.local' }
      ];

      for (const { source, target } of envFiles) {
        const sourcePath = path.join(installPath, source);
        const targetPath = path.join(installPath, target);

        if (await fs.pathExists(sourcePath) && !(await fs.pathExists(targetPath))) {
          await fs.copy(sourcePath, targetPath);
          logger.info(`Created ${target}`);
        }
      }
      spinner.succeed('Environment setup complete');

      // Update config
      setConfig({
        installedVersion: manifest.version,
        installedAt: new Date().toISOString(),
        installPath: installPath,
      });

      // Success message
      console.log('\n' + chalk.green('✅ Installation complete!'));
      console.log('\nNext steps:');
      console.log('  1. Start Docker services: ' + chalk.cyan('docker-compose up -d'));
      console.log('  2. Run database migrations: ' + chalk.cyan('npm run db:migrate'));
      console.log('  3. Start the development server: ' + chalk.cyan('npm run dev'));
      console.log('\nInstalled at: ' + chalk.yellow(installPath));

    } catch (error: any) {
      spinner.fail('Installation failed');
      logger.error(error.message);
      process.exit(1);
    }
  });