/**
 * JsonLogger - Structured logging with transport support
 *
 * Environment-agnostic logger that works in both Node.js and browser-like environments.
 */

import type { LogTransport, JsonLogEntry, LogMetrics, JsonLoggerOptions } from './types.js'
import { shouldLog } from './types.js'

/**
 * Get caller location from stack trace
 * Works in Node.js and browser
 */
function getCallerLocation(): string | undefined {
  const err = new Error()
  const stack = err.stack
  if (!stack) return undefined

  const lines = stack.split('\n')

  // Find the first line that's not from json-logger.ts or node:internal
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i]
    if (
      !line.includes('json-logger') &&
      !line.includes('node:internal') &&
      !line.includes('anonymous')
    ) {
      // Extract file:line from stack trace
      // Format varies by environment:
      // Node: "    at functionName (file:line:col)" or "    at file:line:col"
      // Browser: "functionName@file:line:col" or "file:line:col"
      const match =
        line.match(/at\s+(?:.*?\s+\()?([^()]+):(\d+):\d+\)?/) ||
        line.match(/(?:\w+)@([^:]+):(\d+):\d+/)

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

/**
 * JsonLogger Class
 *
 * Main logger class with transport support
 */
export class JsonLogger {
  private transports: LogTransport[]
  private minLevel: string

  constructor(options: JsonLoggerOptions = {}) {
    this.transports = options.transports || []
    this.minLevel = options.level || 'INF'
  }

  /**
   * Add a transport
   */
  addTransport(transport: LogTransport): void {
    this.transports.push(transport)
  }

  /**
   * Remove a transport by name
   */
  removeTransport(name: string): void {
    this.transports = this.transports.filter(t => t.name !== name)
  }

  /**
   * Core log method - sends entry to all transports
   */
  log(entry: Omit<JsonLogEntry, 'ts' | 'loc'>): void {
    // Check level filtering
    if (!shouldLog(entry.level, this.minLevel as any)) {
      return
    }

    const fullEntry: JsonLogEntry = {
      ts: new Date().toISOString(),
      loc: getCallerLocation(),
      ...entry
    }

    // Send to all transports
    for (const transport of this.transports) {
      try {
        transport.log(fullEntry)
      } catch (err) {
        // Fallback to console if transport fails
        console.error(`[JsonLogger] Transport ${transport.name} failed:`, err)
      }
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
   * Log TUI/UI events
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
    const level = success ? 'INF' : 'ERR'
    this.log({
      level,
      src: 'TOOL',
      msg: success ? `Tool completed: ${toolName}` : `Tool failed: ${toolName}`,
      data: { tool: toolName, success, ...data }
    })
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Flush all transports (for async transports)
  // ─────────────────────────────────────────────────────────────────────────────

  async flush(): Promise<void> {
    for (const transport of this.transports) {
      if (transport.flush) {
        try {
          await transport.flush()
        } catch (err) {
          console.error(`[JsonLogger] Flush failed for ${transport.name}:`, err)
        }
      }
    }
  }
}
