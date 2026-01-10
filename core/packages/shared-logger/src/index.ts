/**
 * @mks2508/shared-logger
 *
 * Shared structured logging library for the mks-bot-father ecosystem.
 *
 * @example
 * ```typescript
 * import { JsonLogger, consoleTransport, fileTransport } from '@mks2508/shared-logger'
 *
 * const logger = new JsonLogger({
 *   transports: [
 *     consoleTransport({ colors: true }),
 *     fileTransport({ dir: './logs' })
 *   ]
 * })
 *
 * logger.info('APP', 'Application started')
 * logger.error('APP', 'Something failed', { error: 'details' })
 * logger.executionComplete({ ... })
 * ```
 */

// Core exports
export { JsonLogger } from './json-logger.js'

// Types
export type {
  LogLevel,
  LogMetrics,
  JsonLogEntry,
  LogTransport,
  ConsoleTransportOptions,
  FileTransportOptions,
  JsonLoggerOptions
} from './types.js'
export { shouldLog, LOG_LEVEL_PRIORITY } from './types.js'

// Transports
export {
  FileTransport,
  fileTransport,
  ConsoleTransport,
  consoleTransport
} from './transports/index.js'

// Presets
export { cliPreset, tuiPreset, testPreset } from './presets.js'
