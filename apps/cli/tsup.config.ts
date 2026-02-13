import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  dts: true,
  noExternal: ['@moltbet/shared'],
  onSuccess: 'chmod +x dist/index.js',
});
