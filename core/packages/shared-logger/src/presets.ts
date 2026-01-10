/**
 * Logger Presets
 *
 * Pre-configured logger instances for common use cases.
 */

import { consoleTransport, fileTransport } from './transports/index.js'
import type { JsonLoggerOptions } from './types.js'

/**
 * Create a CLI logger preset
 *
 * Colored console output + JSONL file logging
 */
export function cliPreset(options: {
  logDir?: string
  level?: string
}): JsonLoggerOptions {
  return {
    level: (options.level || 'INF') as any,
    transports: [
      consoleTransport({ colors: true, timestamp: true }),
      fileTransport({ dir: options.logDir || '~/.config/mks-bot-father/logs', prefix: 'agent' })
    ]
  }
}

/**
 * Create a TUI logger preset
 *
 * JSONL file logging only (no console output for TUI)
 */
export function tuiPreset(options: {
  logDir?: string
  level?: string
}): JsonLoggerOptions {
  return {
    level: (options.level || 'INF') as any,
    transports: [
      fileTransport({ dir: options.logDir || './logs', prefix: 'waxin' })
    ]
  }
}

/**
 * Create a test logger preset
 *
 * Console output only, no file logging
 */
export function testPreset(options?: {
  level?: string
}): JsonLoggerOptions {
  return {
    level: (options?.level || 'DBG') as any,
    transports: [
      consoleTransport({ colors: true, timestamp: false })
    ]
  }
}
