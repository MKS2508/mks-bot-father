/**
 * Shared Logger Types
 *
 * Common types for structured logging across the mks-bot-father ecosystem.
 */

export type LogLevel = 'DBG' | 'INF' | 'WRN' | 'ERR'

export interface LogMetrics {
  duration_ms?: number
  tokens?: { in: number; out: number }
  cost_usd?: number
  memory_mb?: number
  tool_count?: number
}

export interface JsonLogEntry {
  ts: string
  level: LogLevel
  src: string
  msg: string
  loc?: string
  data?: Record<string, unknown>
  metrics?: LogMetrics
}

export interface LogTransport {
  name: string
  log(entry: JsonLogEntry): void
  flush?(): Promise<void> | void
}

export interface ConsoleTransportOptions {
  colors?: boolean
  level?: LogLevel
  timestamp?: boolean
}

export interface FileTransportOptions {
  dir: string
  prefix?: string
}

export interface JsonLoggerOptions {
  transports?: LogTransport[]
  level?: LogLevel
}

/**
 * Level priority for filtering (higher number = lower priority)
 */
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  'DBG': 0,
  'INF': 1,
  'WRN': 2,
  'ERR': 3
}

/**
 * Check if a log entry should be included based on level
 */
export function shouldLog(entryLevel: LogLevel, minLevel: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[entryLevel] >= LOG_LEVEL_PRIORITY[minLevel]
}
