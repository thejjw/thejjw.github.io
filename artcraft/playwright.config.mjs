import { defineConfig } from '@playwright/test';

const baseURL = process.env.ARTCRAFT_BASE_URL || 'http://127.0.0.1:4173';

/**
 * Smoke tests for the ArtCraft suite.
 *
 * Without ARTCRAFT_BASE_URL the tests run against a local server that
 * serves the built site, the way GitHub Pages does: no single page app
 * fallback and the same content types. With ARTCRAFT_BASE_URL they run
 * against a deployed site.
 */
export default defineConfig({
  testDir: 'artcraft/tests',
  timeout: 300000,
  expect: { timeout: 60000 },
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL,
    browserName: 'chromium',
    launchOptions: {
      args: [
        '--enable-unsafe-swiftshader',
        '--use-gl=angle',
        '--use-angle=swiftshader',
      ],
    },
  },
  webServer: process.env.ARTCRAFT_BASE_URL
    ? undefined
    : {
        command: 'node scripts/artcraft/serve.mjs',
        url: 'http://127.0.0.1:4173/crafting/',
        reuseExistingServer: !process.env.CI,
        timeout: 60000,
      },
});
