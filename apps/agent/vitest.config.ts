import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@mks2508/shared-logger': resolve(__dirname, '../../core/packages/shared-logger/dist/index.js'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.integration.test.ts', '**/prueba1automatizabotfather/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/index.ts',
        'src/cli.ts',
        'src/telegram/**',
        'src/tools/__tests__/helpers/**',
        'src/agent.ts',
        'src/types.ts',
        'src/memory/**',
        'src/prompts/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 65,
        statements: 80,
      },
    },
    testTimeout: 15000,
    hookTimeout: 10000,
  },
})
