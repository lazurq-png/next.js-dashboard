import { randomBytes } from 'node:crypto';
import { defineConfig, devices } from '@playwright/test';

// Its own port, so a `npm run dev` already running on 3000 is never reused by accident.
const PORT = 3100;

// `dev` by default: it needs no build, so browser tests of pages that do not read
// the database run even where the database is unreachable. E2E_SERVER=start tests
// the production build instead (`next build` must have run first); CI does both.
const server =
  process.env.E2E_SERVER === 'start'
    ? `npx next start -p ${PORT}`
    : `npx next dev --turbopack -p ${PORT}`;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: server,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // A throwaway session secret, as in CI: NextAuth refuses to run without one,
    // and test sessions never need to outlive the test server.
    env: {
      AUTH_SECRET: process.env.AUTH_SECRET ?? randomBytes(32).toString('base64'),
      AUTH_TRUST_HOST: 'true',
    },
  },
});
