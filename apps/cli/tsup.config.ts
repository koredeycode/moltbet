import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  dts: true,
  noExternal: [],
  onSuccess: 'chmod +x dist/index.js',
});
