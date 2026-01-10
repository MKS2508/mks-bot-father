import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'core/packages/*/src/**/*.test.ts',
      'core/packages/*/src/**/*.spec.ts',
      'apps/agent/src/**/*.test.ts',
      'apps/agent/src/**/*.spec.ts',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.integration.test.ts',
      '**/test_random_2025/**',
      '**/waxin-agent/**',
      '**/log-viewer/**',
    ],
    testTimeout: 15000,
    hookTimeout: 10000,
  },
})
