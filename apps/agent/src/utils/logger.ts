/**
 * Logger utility for the Bot Manager Agent.
 *
 * Provides console output with colors + JSON file logging.
 */

import {
  JsonLogger,
  consoleTransport,
  fileTransport,
  type LogMetrics,
  type LogLevel,
  type JsonLogEntry,
  LOG_LEVEL_PRIORITY
} from '../lib/logger/index.js'

const consoleLevel: LogLevel = process.env.DEBUG ? 'DBG' : 'INF'

const filteredConsoleTransport = {
  name: 'console-filtered',
  log(entry: JsonLogEntry) {
    if (LOG_LEVEL_PRIORITY[entry.level] >= LOG_LEVEL_PRIORITY[consoleLevel]) {
      consoleTransport({ colors: true, timestamp: true }).log(entry)
    }
  }
}

const jsonLogger = new JsonLogger({
  level: 'DBG',
  transports: [
    filteredConsoleTransport,
    fileTransport({ dir: '~/.config/mks-bot-father/logs', prefix: 'agent' })
  ]
})

/**
 * Agent logger with convenience methods.
 * Wraps JsonLogger with agent-specific methods.
 */
export const logger = {
  info(message: string, data?: Record<string, unknown>) {
    jsonLogger.info('AGENT', message, data)
  },

  success(message: string, data?: Record<string, unknown>) {
    jsonLogger.info('AGENT', message, data)
  },

  warn(message: string, data?: Record<string, unknown>) {
    jsonLogger.warn('AGENT', message, data)
  },

  error(message: string, data?: Record<string, unknown>) {
    jsonLogger.error('AGENT', message, data)
  },

  debug(message: string, data?: Record<string, unknown>) {
    jsonLogger.debug('AGENT', message, data)
  },

  assistant(message: string) {
    jsonLogger.info('AGENT', 'assistant_response', { preview: message.slice(0, 200) })
  },

  tool(name: string, input?: unknown) {
    jsonLogger.log({
      level: 'INF',
      src: 'AGENT',
      msg: 'tool_call',
      data: { tool: name, hasInput: !!input }
    })
  },

  toolResult(tool: string, result: unknown, success = true, durationMs?: number) {
    const preview = typeof result === 'string'
      ? result.slice(0, 100)
      : JSON.stringify(result).slice(0, 100)

    const level = success ? 'INF' : 'ERR'
    jsonLogger.log({
      level,
      src: 'AGENT',
      msg: 'tool_result',
      data: {
        tool,
        success,
        preview: preview.slice(0, 100),
        duration_ms: durationMs
      }
    })
  },

  log(entry: { level: string; src: string; msg: string; data?: Record<string, unknown> }) {
    jsonLogger.log(entry as Parameters<typeof jsonLogger.log>[0])
  },

  executionComplete(metrics: {
    prompt: string
    durationMs: number
    inputTokens: number
    outputTokens: number
    costUsd: number
    toolCalls: number
    success: boolean
  }) {
    jsonLogger.executionComplete(metrics)
  }
}

// Alias for backward compatibility
export const log = logger

/**
 * Log agent event with optional metrics
 */
export function logAgentEvent(
  level: 'INF' | 'ERR' | 'WRN' | 'DBG',
  msg: string,
  data?: Record<string, unknown>,
  metrics?: LogMetrics
): void {
  logger.log({
    level,
    src: 'AGENT',
    msg,
    data: metrics ? { ...data, metrics } : data
  })
}

/**
 * Log execution complete with metrics
 */
export function logExecutionComplete(metrics: {
  prompt: string
  durationMs: number
  inputTokens: number
  outputTokens: number
  costUsd: number
  toolCalls: number
  success: boolean
}): void {
  logger.executionComplete(metrics)
}
