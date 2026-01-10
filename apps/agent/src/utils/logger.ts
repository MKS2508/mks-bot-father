/**
 * Logger utility for the Bot Manager Agent.
 *
 * Provides console output with colors + JSON file logging using @mks2508/shared-logger.
 */

import { JsonLogger, consoleTransport, fileTransport, cliPreset, type LogMetrics } from '@mks2508/shared-logger'

const logger = new JsonLogger(cliPreset({
  logDir: '~/.config/mks-bot-father/logs',
  level: process.env.DEBUG ? 'DBG' : 'INF'
}))

export { logger }

// Convenience exports for backward compatibility
export const log = {
  info(message: string, data?: Record<string, unknown>) {
    logger.info('AGENT', message, data)
  },

  success(message: string, data?: Record<string, unknown>) {
    logger.info('AGENT', message, data)
  },

  warn(message: string, data?: Record<string, unknown>) {
    logger.warn('AGENT', message, data)
  },

  error(message: string, data?: Record<string, unknown>) {
    logger.error('AGENT', message, data)
  },

  debug(message: string, data?: Record<string, unknown>) {
    logger.debug('AGENT', message, data)
  },

  assistant(message: string) {
    logger.info('AGENT', 'assistant_response', { preview: message.slice(0, 200) })
  },

  tool(name: string, input?: unknown) {
    logger.tool(name, { hasInput: !!input })
  },

  toolResult(tool: string, result: unknown, success = true, durationMs?: number) {
    const preview = typeof result === 'string'
      ? result.slice(0, 100)
      : JSON.stringify(result).slice(0, 100)

    logger.logWithMetrics(
      'AGENT',
      'tool_result',
      { duration_ms: durationMs },
      {
        tool,
        success,
        preview: preview.slice(0, 100)
      }
    )
  }
}

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
    data: metrics ? { ...data, ...metrics } : data
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
