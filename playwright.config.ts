import { defineConfig } from '@playwright/test'

const ci = (globalThis as { process?: { env?: { CI?: string } } }).process?.env?.CI

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: ci ? 2 : 0,
  use: { baseURL: 'http://localhost:5183' },
  webServer: {
    command: 'npm run dev -- --port 5183 --strictPort',
    url: 'http://localhost:5183',
    reuseExistingServer: true,
  },
})
