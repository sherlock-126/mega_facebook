import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  clean: true,
  shims: true,
  dts: false,
  sourcemap: true,
  splitting: false,
  minify: false,
});