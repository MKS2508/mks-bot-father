/**
 * Tool Logger for MCP Tools.
 *
 * Provides structured JSONL logging for all tool executions with timing metrics.
 */

import { appendFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const LOG_DIR = join(homedir(), '.config', 'mks-bot-father', 'logs')

function getLogFile(): string {
  return join(LOG_DIR, `agent-${new Date().toISOString().split('T')[0]}.jsonl`)
}

interface ToolLogEntry {
  ts: string
  level: 'INF' | 'ERR' | 'WRN' | 'DBG'
  src: string
  tool: string
  msg: string
  data?: Record<string, unknown>
  metrics?: { duration_ms?: number; [key: string]: unknown }
}

function logTool(entry: Omit<ToolLogEntry, 'ts'>): void {
  try {
    if (!existsSync(LOG_DIR)) {
      mkdirSync(LOG_DIR, { recursive: true })
    }
    const logEntry: ToolLogEntry = {
      ts: new Date().toISOString(),
      ...entry
    }
    appendFileSync(getLogFile(), JSON.stringify(logEntry) + '\n')
  } catch {
    // Silently fail if logging fails - don't break tool execution
  }
}

export interface IToolLogger {
  start: (args: Record<string, unknown>) => number
  success: (startTime: number, data?: Record<string, unknown>) => void
  error: (startTime: number, error: unknown, data?: Record<string, unknown>) => void
  info: (msg: string, data?: Record<string, unknown>) => void
}

export function createToolLogger(toolName: string): IToolLogger {
  return {
    start(args: Record<string, unknown>): number {
      logTool({
        level: 'INF',
        src: 'TOOL',
        tool: toolName,
        msg: 'started',
        data: args
      })
      return Date.now()
    },

    success(startTime: number, data?: Record<string, unknown>): void {
      logTool({
        level: 'INF',
        src: 'TOOL',
        tool: toolName,
        msg: 'success',
        data,
        metrics: { duration_ms: Date.now() - startTime }
      })
    },

    error(startTime: number, error: unknown, data?: Record<string, unknown>): void {
      logTool({
        level: 'ERR',
        src: 'TOOL',
        tool: toolName,
        msg: 'failed',
        data: {
          ...data,
          error: error instanceof Error ? error.message : String(error)
        },
        metrics: { duration_ms: Date.now() - startTime }
      })
    },

    info(msg: string, data?: Record<string, unknown>): void {
      logTool({
        level: 'INF',
        src: 'TOOL',
        tool: toolName,
        msg,
        data
      })
    }
  }
}

export function logAgentEvent(
  level: 'INF' | 'ERR' | 'WRN' | 'DBG',
  msg: string,
  data?: Record<string, unknown>,
  metrics?: Record<string, unknown>
): void {
  logTool({
    level,
    src: 'AGENT',
    tool: '',
    msg,
    data,
    metrics
  })
}
