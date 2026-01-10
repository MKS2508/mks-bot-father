/**
 * JSON Logger for waxin-agent
 *
 * Uses @mks2508/better-logger for structured JSONL logging.
 */

import { Logger } from '@mks2508/better-logger'
import { existsSync, mkdirSync } from 'fs'
import { appendFileSync } from 'fs'

// Create log directory if it doesn't exist
const logDir = './logs'
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true })
}

// Log file path with date
const today = new Date().toISOString().split('T')[0]
const logFilePath = `${logDir}/waxin-${today}.jsonl`

// Write log entry to file
function writeLog(entry: {
  timestamp: string
  level: string
  source: string
  message: string
  data?: Record<string, unknown>
}): void {
  const line = JSON.stringify(entry) + '\n'
  appendFileSync(logFilePath, line)
}

// Create logger instance
const logger = new Logger()

// Configure TUI preset
logger.preset('minimal')
logger.showTimestamp()

// Wrap logger methods to write to file
const originalDebug = logger.debug
const originalInfo = logger.info
const originalWarn = logger.warn
const originalError = logger.error
const originalLog = logger.log

function wrapAndWrite(level: string) {
  return function (message: string, ...args: unknown[]) {
    // Call original logger method
    originalLog.call(logger, level, message, ...args)

    // Write to file
    writeLog({
      timestamp: new Date().toISOString(),
      level: level.toUpperCase().slice(0, 3),
      source: 'APP',
      message,
      data: args[0] as Record<string, unknown> | undefined,
    })
  }
}

logger.debug = wrapAndWrite('debug')
logger.info = wrapAndWrite('info')
logger.warn = wrapAndWrite('warn')
logger.error = wrapAndWrite('error')

// Export the logger instance
export { logger as log }

// Type for metrics (compatible with existing code)
export interface LogMetrics {
  durationMs?: number
  tokens?: number
  costUsd?: number
}

// Re-export LogLevel from better logger
export type { LogLevel } from '@mks2508/better-logger'

// TUI-specific logger with TUI source pre-configured
export const tuiLogger = {
  debug: (msg: string, data?: Record<string, unknown>) => logger.debug('TUI', msg, data),
  info: (msg: string, data?: Record<string, unknown>) => logger.info('TUI', msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => logger.warn('TUI', msg, data),
  error: (msg: string, data?: Record<string, unknown>) => logger.error('TUI', msg, data),
}
