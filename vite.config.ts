/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 5173, strictPort: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.ts', 'src/main.tsx', 'src/vite-env.d.ts'],
      // Floor sits below the current ~48% lines because the React shells (App,
      // Sidebar, dialogs) and native service are covered by Playwright e2e, not
      // unit tests. The unit-tested logic modules run well above this.
      thresholds: {
        lines: 45,
        functions: 60,
        branches: 75,
        statements: 45,
      },
    },
  },
})
