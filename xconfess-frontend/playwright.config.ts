import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    headless: process.env.CI === 'true',
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'npm run dev',
    env: {
      ...process.env,
      BACKEND_API_URL: process.env.BACKEND_API_URL ?? 'http://127.0.0.1:4001',
      NEXT_PUBLIC_API_URL:
        process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:4001',
      NEXT_PUBLIC_WS_URL:
        process.env.NEXT_PUBLIC_WS_URL ?? 'ws://127.0.0.1:4001',
    },
    port: 3000,
    reuseExistingServer: process.env.CI !== 'true',
  },
});
