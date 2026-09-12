import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { globSync, readFileSync } from 'node:fs';
import { makeEntry } from './src/catalog';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'validate-recipe-collection',
      buildStart() {
        const assets = Object.fromEntries(
          globSync('recipes/**/*.assets/*').map((path) => ['../' + path, path]),
        );
        for (const path of globSync('recipes/**/*.jsonld'))
          makeEntry('../' + path, readFileSync(path, 'utf8'), assets);
      },
    },
  ],
  base: process.env.BASE_PATH || '/',
  test: { include: ['src/**/*.test.ts'] },
});
