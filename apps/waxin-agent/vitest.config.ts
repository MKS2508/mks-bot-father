/**
 * Vitest configuration for waxin-agent TUI
 * Testing framework configuration for OpenTUI + React application
 */

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules', 'dist', '**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/app.tsx',
        'src/components/**/*.tsx',
        'src/layouts/**/*.tsx',
      ],
    },
    setupFiles: [],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
})
