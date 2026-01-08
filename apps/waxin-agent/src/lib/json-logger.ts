/**
 * JSON Logger - Structured logging for waxin-agent
 *
 * Writes logs in JSONL format for easy parsing and real-time viewing.
 */

import { mkdirSync, existsSync, appendFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

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
  loc?: string  // caller location (file:line)
  data?: Record<string, unknown>
  metrics?: LogMetrics
}

function getCallerLocation(): string | undefined {
  const err = new Error()
  const stack = err.stack?.split('\n')
  if (!stack) return undefined

  // Find the first line that's not from json-logger.ts
  for (let i = 2; i < stack.length; i++) {
    const line = stack[i]
    if (!line.includes('json-logger') && !line.includes('node:internal')) {
      // Extract file:line from stack trace
      // Format: "    at functionName (file:line:col)" or "    at file:line:col"
      const match = line.match(/at\s+(?:.*?\s+\()?([^()]+):(\d+):\d+\)?/)
      if (match) {
        let file = match[1]
        const lineNum = match[2]
        // Shorten path - keep only last 2 parts
        const parts = file.split('/')
        if (parts.length > 2) {
          file = parts.slice(-2).join('/')
        }
        return `${file}:${lineNum}`
      }
    }
  }
  return undefined
}

// ═══════════════════════════════════════════════════════════════════════════════
// JSON LOGGER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class JsonLogger {
  private logPath: string
  private logDir: string

  constructor(logDir?: string) {
    this.logDir = logDir || resolve(__dirname, '../../logs')

    // Ensure log directory exists
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true })
    }

    const today = new Date().toISOString().split('T')[0]
    this.logPath = resolve(this.logDir, `waxin-${today}.jsonl`)
  }

  /**
   * Write a log entry to file.
   */
  log(entry: Omit<JsonLogEntry, 'ts' | 'loc'>): void {
    const fullEntry: JsonLogEntry = {
      ts: new Date().toISOString(),
      loc: getCallerLocation(),
      ...entry
    }

    try {
      appendFileSync(this.logPath, JSON.stringify(fullEntry) + '\n')
    } catch (err) {
      console.error('[JsonLogger] Write failed:', err)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Convenience methods by level
  // ─────────────────────────────────────────────────────────────────────────────

  debug(src: string, msg: string, data?: Record<string, unknown>): void {
    this.log({ level: 'DBG', src, msg, data })
  }

  info(src: string, msg: string, data?: Record<string, unknown>): void {
    this.log({ level: 'INF', src, msg, data })
  }

  warn(src: string, msg: string, data?: Record<string, unknown>): void {
    this.log({ level: 'WRN', src, msg, data })
  }

  error(src: string, msg: string, data?: Record<string, unknown>): void {
    this.log({ level: 'ERR', src, msg, data })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // With metrics
  // ─────────────────────────────────────────────────────────────────────────────

  logWithMetrics(
    src: string,
    msg: string,
    metrics: LogMetrics,
    data?: Record<string, unknown>
  ): void {
    this.log({ level: 'INF', src, msg, data, metrics })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Specialized logging methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Log TUI events
   */
  tui(msg: string, data?: Record<string, unknown>): void {
    this.info('TUI', msg, data)
  }

  /**
   * Log agent execution
   */
  agent(msg: string, data?: Record<string, unknown>): void {
    this.info('AGENT', msg, data)
  }

  /**
   * Log tool calls
   */
  tool(toolName: string, data?: Record<string, unknown>): void {
    this.info('TOOL', `Tool called: ${toolName}`, { tool: toolName, ...data })
  }

  /**
   * Log tool result
   */
  toolResult(toolName: string, success: boolean, data?: Record<string, unknown>): void {
    if (success) {
      this.info('TOOL', `Tool completed: ${toolName}`, { tool: toolName, success: true, ...data })
    } else {
      this.error('TOOL', `Tool failed: ${toolName}`, { tool: toolName, success: false, ...data })
    }
  }

  /**
   * Log execution complete with full metrics
   */
  executionComplete(data: {
    prompt: string
    durationMs: number
    inputTokens: number
    outputTokens: number
    costUsd: number
    toolCalls: number
    success: boolean
  }): void {
    this.logWithMetrics(
      'AGENT',
      data.success ? 'Execution complete' : 'Execution failed',
      {
        duration_ms: data.durationMs,
        tokens: { in: data.inputTokens, out: data.outputTokens },
        cost_usd: data.costUsd,
        tool_count: data.toolCalls
      },
      { prompt: data.prompt.slice(0, 100) }
    )
  }

  /**
   * Log stats update
   */
  stats(stats: {
    totalTokens: number
    totalCost: number
    sessionDuration: number
    toolCalls: number
  }): void {
    this.logWithMetrics('STATS', 'Session stats update', {
      tokens: { in: 0, out: stats.totalTokens },
      cost_usd: stats.totalCost,
      duration_ms: stats.sessionDuration,
      tool_count: stats.toolCalls
    })
  }

  /**
   * Get current log file path
   */
  getLogPath(): string {
    return this.logPath
  }

  /**
   * Get memory usage in MB
   */
  getMemoryMB(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 10) / 10
    }
    return 0
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

let globalLogger: JsonLogger | null = null

export function getLogger(): JsonLogger {
  if (!globalLogger) {
    globalLogger = new JsonLogger()
  }
  return globalLogger
}

// Export convenience functions that use the global logger
export const log = {
  debug: (src: string, msg: string, data?: Record<string, unknown>) =>
    getLogger().debug(src, msg, data),
  info: (src: string, msg: string, data?: Record<string, unknown>) =>
    getLogger().info(src, msg, data),
  warn: (src: string, msg: string, data?: Record<string, unknown>) =>
    getLogger().warn(src, msg, data),
  error: (src: string, msg: string, data?: Record<string, unknown>) =>
    getLogger().error(src, msg, data),
  tui: (msg: string, data?: Record<string, unknown>) => getLogger().tui(msg, data),
  agent: (msg: string, data?: Record<string, unknown>) => getLogger().agent(msg, data),
  tool: (toolName: string, data?: Record<string, unknown>) => getLogger().tool(toolName, data),
  toolResult: (toolName: string, success: boolean, data?: Record<string, unknown>) =>
    getLogger().toolResult(toolName, success, data),
  executionComplete: (data: Parameters<JsonLogger['executionComplete']>[0]) =>
    getLogger().executionComplete(data),
  stats: (stats: Parameters<JsonLogger['stats']>[0]) => getLogger().stats(stats),
  withMetrics: (
    src: string,
    msg: string,
    metrics: LogMetrics,
    data?: Record<string, unknown>
  ) => getLogger().logWithMetrics(src, msg, metrics, data)
}
