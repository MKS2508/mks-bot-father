/**
 * JSON Logger - Structured logging for mks-bot-father
 *
 * Writes logs in JSONL format for debugging and auditing.
 */

import { mkdirSync, existsSync, appendFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type LogLevel = 'DBG' | 'INF' | 'WRN' | 'ERR'

export interface LogMetrics {
  duration_ms?: number
  steps_completed?: number
  steps_total?: number
}

export interface JsonLogEntry {
  ts: string
  level: LogLevel
  src: string
  msg: string
  data?: Record<string, unknown>
  metrics?: LogMetrics
}

// ═══════════════════════════════════════════════════════════════════════════════
// JSON LOGGER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class JsonLogger {
  private logPath: string
  private logDir: string

  constructor(logDir?: string) {
    this.logDir = logDir || join(homedir(), '.config', 'mks-bot-father', 'logs')

    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true })
    }

    const today = new Date().toISOString().split('T')[0]
    this.logPath = join(this.logDir, `mbf-${today}.jsonl`)
  }

  log(entry: Omit<JsonLogEntry, 'ts' | 'loc'>): void {
    const fullEntry: JsonLogEntry = {
      ts: new Date().toISOString(),
      ...entry
    }

    try {
      appendFileSync(this.logPath, JSON.stringify(fullEntry) + '\n')
    } catch (err) {
      console.error('[JsonLogger] Write failed:', err)
    }
  }

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

  withMetrics(
    src: string,
    msg: string,
    metrics: LogMetrics,
    data?: Record<string, unknown>
  ): void {
    this.log({ level: 'INF', src, msg, data, metrics })
  }

  pipelineStart(data: { botName: string; options: Record<string, unknown> }): void {
    this.info('PIPELINE', 'Pipeline started', data)
  }

  pipelineComplete(data: {
    botName: string
    success: boolean
    durationMs: number
    stepsCompleted: number
    errors: string[]
  }): void {
    this.withMetrics(
      'PIPELINE',
      data.success ? 'Pipeline completed' : 'Pipeline failed',
      { duration_ms: data.durationMs, steps_completed: data.stepsCompleted },
      { botName: data.botName, success: data.success, errors: data.errors }
    )
  }

  pipelineStep(step: string, data: Record<string, unknown>): void {
    this.info('PIPELINE_STEP', `Step: ${step}`, data)
  }

  pipelineStepError(step: string, error: string): void {
    this.error('PIPELINE_STEP', `Step failed: ${step}`, { error })
  }

  getLogPath(): string {
    return this.logPath
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

export const log = {
  debug: (src: string, msg: string, data?: Record<string, unknown>) =>
    getLogger().debug(src, msg, data),
  info: (src: string, msg: string, data?: Record<string, unknown>) =>
    getLogger().info(src, msg, data),
  warn: (src: string, msg: string, data?: Record<string, unknown>) =>
    getLogger().warn(src, msg, data),
  error: (src: string, msg: string, data?: Record<string, unknown>) =>
    getLogger().error(src, msg, data),
  withMetrics: (
    src: string,
    msg: string,
    metrics: LogMetrics,
    data?: Record<string, unknown>
  ) => getLogger().withMetrics(src, msg, metrics, data),
  pipelineStart: (data: Parameters<JsonLogger['pipelineStart']>[0]) =>
    getLogger().pipelineStart(data),
  pipelineComplete: (data: Parameters<JsonLogger['pipelineComplete']>[0]) =>
    getLogger().pipelineComplete(data),
  pipelineStep: (step: string, data: Record<string, unknown>) =>
    getLogger().pipelineStep(step, data),
  pipelineStepError: (step: string, error: string) =>
    getLogger().pipelineStepError(step, error)
}
