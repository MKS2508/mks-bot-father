import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.e2e.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 60000,
    hookTimeout: 30000,
    reporters: ['verbose'],
    outputFile: {
      json: './e2e-results.json',
    },
    pool: 'forks',
    isolate: false,
    env: {
      E2E_TEST: 'true',
    },
  },
})
