import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  clean: true,
  minify: true,
  shims: true,
  bundle: true,
  splitting: false,
  sourcemap: false,
  dts: false,
  noExternal: [/.*/], // Bundle all dependencies
  platform: 'node',
  outDir: 'dist',
  esbuildOptions(options) {
    options.banner = {
      js: '#!/usr/bin/env node'
    };
  },
  // For creating standalone executables
  async onSuccess() {
    const { existsSync, chmodSync, copyFileSync } = await import('fs');
    const { join, dirname } = await import('path');
    const { fileURLToPath } = await import('url');

    const __dirname = dirname(fileURLToPath(import.meta.url));

    // Make the output executable
    const outputPath = join(__dirname, 'dist/index.js');
    if (existsSync(outputPath)) {
      chmodSync(outputPath, 0o755);
    }

    // Create the cli.js entry point
    const cliPath = join(__dirname, 'dist/cli.js');
    if (existsSync(outputPath) && !existsSync(cliPath)) {
      copyFileSync(outputPath, cliPath);
      chmodSync(cliPath, 0o755);
    }

    console.log('✅ CLI build complete');
  }
});