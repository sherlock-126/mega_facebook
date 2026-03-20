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
  onSuccess: async () => {
    const fs = require('fs');
    const path = require('path');

    // Make the output executable
    const outputPath = path.join(__dirname, 'dist/index.js');
    if (fs.existsSync(outputPath)) {
      fs.chmodSync(outputPath, 0o755);
    }

    console.log('✅ CLI build complete');
  }
});