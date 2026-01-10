/**
 * useLogs hook - Log management with JSON logging.
 *
 * Uses JsonLogger for structured JSONL file output.
 */

import { log } from '../lib/json-logger.js'
import type { LogEntry, LogFilter } from '../types.js'
import { LogLevel } from '../types.js'

// In-memory logs for TUI display
const logs: LogEntry[] = []
let filter: LogFilter = { level: 1 } // INFO by default

/**
 * Add a log entry (writes to JSON file + memory).
 */
export function addLog(entry: LogEntry): void {
  logs.push(entry)

  // Write to JSON file
  const levelMap: Record<number, 'DBG' | 'INF' | 'WRN' | 'ERR'> = {
    0: 'DBG',
    1: 'INF',
    2: 'WRN',
    3: 'ERR'
  }

  log.log(
    levelMap[entry.level] || 'INF',
    entry.message,
    { source: entry.component, ...entry.data }
  )
}

/**
 * Add a quick log message.
 */
export function logMessage(
  level: LogLevel,
  component: string,
  message: string,
  data?: unknown
): void {
  addLog({
    timestamp: new Date().toISOString(),
    level,
    component,
    message,
    data
  })
}

/**
 * Quick log functions.
 */
export const logDebug = (component: string, message: string, data?: unknown) =>
  logMessage(0, component, message, data)
export const logInfo = (component: string, message: string, data?: unknown) =>
  logMessage(1, component, message, data)
export const logWarn = (component: string, message: string, data?: unknown) =>
  logMessage(2, component, message, data)
export const logError = (component: string, message: string, data?: unknown) =>
  logMessage(3, component, message, data)

/**
 * Get all logs (filtered).
 */
export function getLogs(): LogEntry[] {
  return logs.filter((logEntry) => {
    if (logEntry.level < filter.level) return false
    if (filter.component && logEntry.component !== filter.component) return false
    if (filter.search && !logEntry.message.includes(filter.search)) return false
    if (filter.since && new Date(logEntry.timestamp) < filter.since) return false
    return true
  })
}

/**
 * Get logs by level.
 */
export function getLogsByLevel(level: LogLevel): LogEntry[] {
  return logs.filter((l) => l.level === level)
}

/**
 * Get logs by component.
 */
export function getLogsByComponent(component: string): LogEntry[] {
  return logs.filter((l) => l.component === component)
}

/**
 * Get recent logs.
 */
export function getRecentLogs(count = 50): LogEntry[] {
  return getLogs().slice(-count)
}

/**
 * Set log filter.
 */
export function setLogFilter(newFilter: Partial<LogFilter>): void {
  filter = { ...filter, ...newFilter }
  log.info('TUI', `Log filter updated: level=${LogLevel[filter.level]}`)
}

/**
 * Get current filter.
 */
export function getLogFilter(): LogFilter {
  return { ...filter }
}

/**
 * Clear all logs.
 */
export function clearLogs(): void {
  logs.length = 0
  log.info('TUI', 'Logs cleared')
}

/**
 * Get log count by level.
 */
export function getLogCount(): {
  debug: number
  info: number
  warn: number
  error: number
  total: number
} {
  return {
    debug: logs.filter((l) => l.level === 0).length,
    info: logs.filter((l) => l.level === 1).length,
    warn: logs.filter((l) => l.level === 2).length,
    error: logs.filter((l) => l.level === 3).length,
    total: logs.length
  }
}

/**
 * Export logs to string (for debugging).
 */
export function exportLogsToString(): string {
  return logs
    .map((entry) => {
      const level = LogLevel[entry.level]
      return `[${entry.timestamp}] [${level}] [${entry.component}] ${entry.message}`
    })
    .join('\n')
}

/**
 * Initialize log system.
 */
export function initLogs(): void {
  log.info('TUI', 'Log system initialized')
}
