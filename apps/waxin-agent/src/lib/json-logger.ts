/**
 * JSON Logger for waxin-agent
 *
 * Uses @mks2508/better-logger for structured JSONL logging.
 */

import { existsSync, mkdirSync, appendFileSync } from 'fs'

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

// Create logging function that outputs to console and file
function wrapAndWrite(level: string) {
  return function (source: string, message: string, data?: Record<string, unknown>) {
    // Call console for TUI display (minimal styling)
    const levelColors: Record<string, string> = {
      debug: '\x1b[90m',   // gray
      info: '\x1b[36m',    // cyan
      warn: '\x1b[33m',    // yellow
      error: '\x1b[31m',   // red
    }
    const reset = '\x1b[0m'
    const color = levelColors[level] || reset
    const timestamp = new Date().toISOString().slice(11, 23)
    console.log(`${color}[${timestamp}] [${level.toUpperCase().slice(0, 3)}] [${source}] ${message}${reset}`)

    // Write to file
    writeLog({
      timestamp: new Date().toISOString(),
      level: level.toUpperCase().slice(0, 3),
      source,
      message,
      data,
    })
  }
}

// Create wrapper functions
const debugFn = wrapAndWrite('debug')
const infoFn = wrapAndWrite('info')
const warnFn = wrapAndWrite('warn')
const errorFn = wrapAndWrite('error')

// Generic log function that routes by level
function logByLevel(level: 'DBG' | 'INF' | 'WRN' | 'ERR', message: string, data?: Record<string, unknown>) {
  const levelFn = level === 'DBG' ? debugFn
    : level === 'INF' ? infoFn
    : level === 'WRN' ? warnFn
    : errorFn
  levelFn(data?.source as string || 'APP', message, data)
}

// Export a unified log object
export const log = {
  debug: debugFn,
  info: infoFn,
  warn: warnFn,
  error: errorFn,
  log: logByLevel,
}

// Type for metrics (compatible with existing code)
export interface LogMetrics {
  durationMs?: number
  tokens?: number
  costUsd?: number
}

// Log level type
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

// TUI-specific logger with TUI source pre-configured
export const tuiLogger = {
  debug: (msg: string, data?: Record<string, unknown>) => debugFn('TUI', msg, data),
  info: (msg: string, data?: Record<string, unknown>) => infoFn('TUI', msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => warnFn('TUI', msg, data),
  error: (msg: string, data?: Record<string, unknown>) => errorFn('TUI', msg, data),
}
