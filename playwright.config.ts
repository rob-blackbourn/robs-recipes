import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173/test-kitchen/',
    headless: true,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
    trace: 'retain-on-failure',
  },
  webServer: {
    command:
      'npm run build -- --base=/test-kitchen/ && npm run preview -- --base=/test-kitchen/ --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/test-kitchen/',
    timeout: 60000,
  },
});
