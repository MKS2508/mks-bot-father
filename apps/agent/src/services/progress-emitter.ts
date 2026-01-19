/**
 * Global Progress Emitter for MCP Tools.
 *
 * Allows MCP tools to emit progress events that can be consumed
 * by external handlers (like Telegram StreamingHandler).
 */

import { EventEmitter } from 'events'

export interface IToolProgressEvent {
  toolId: string
  toolName: string
  type: 'progress' | 'step' | 'substep'
  percentage?: number
  message: string
  step?: string
  details?: Record<string, unknown>
  timestamp: number
}

class ProgressEmitter extends EventEmitter {
  private static instance: ProgressEmitter | null = null
  private activeToolId: string | null = null

  private constructor() {
    super()
    this.setMaxListeners(20)
  }

  static getInstance(): ProgressEmitter {
    if (!ProgressEmitter.instance) {
      ProgressEmitter.instance = new ProgressEmitter()
    }
    return ProgressEmitter.instance
  }

  /**
   * Set the currently active tool ID.
   * Progress events will be associated with this tool.
   */
  setActiveTool(toolId: string, toolName: string): void {
    this.activeToolId = toolId
    this.emit('tool:start', { toolId, toolName, timestamp: Date.now() })
  }

  /**
   * Clear the active tool when execution completes.
   */
  clearActiveTool(): void {
    this.activeToolId = null
  }

  /**
   * Emit a progress event from an MCP tool.
   */
  emitProgress(
    percentage: number,
    message: string,
    step?: string,
    details?: Record<string, unknown>
  ): void {
    const event: IToolProgressEvent = {
      toolId: this.activeToolId || 'unknown',
      toolName: 'unknown',
      type: 'progress',
      percentage,
      message,
      step,
      details,
      timestamp: Date.now()
    }
    this.emit('progress', event)
  }

  /**
   * Emit a step event (major phase change).
   */
  emitStep(message: string, step?: string, details?: Record<string, unknown>): void {
    const event: IToolProgressEvent = {
      toolId: this.activeToolId || 'unknown',
      toolName: 'unknown',
      type: 'step',
      message,
      step,
      details,
      timestamp: Date.now()
    }
    this.emit('progress', event)
  }

  /**
   * Emit a substep event (minor progress within a step).
   */
  emitSubstep(message: string, details?: Record<string, unknown>): void {
    const event: IToolProgressEvent = {
      toolId: this.activeToolId || 'unknown',
      toolName: 'unknown',
      type: 'substep',
      message,
      details,
      timestamp: Date.now()
    }
    this.emit('progress', event)
  }

  /**
   * Subscribe to progress events.
   */
  onProgress(callback: (event: IToolProgressEvent) => void): () => void {
    this.on('progress', callback)
    return () => this.off('progress', callback)
  }

  /**
   * Subscribe to tool start events.
   */
  onToolStart(callback: (data: { toolId: string; toolName: string; timestamp: number }) => void): () => void {
    this.on('tool:start', callback)
    return () => this.off('tool:start', callback)
  }
}

export const progressEmitter = ProgressEmitter.getInstance()

/**
 * Helper to create an onProgress callback that emits to the global emitter.
 */
export function createProgressCallback(toolName: string): (pct: number, msg: string, step?: string) => void {
  return (pct: number, msg: string, step?: string) => {
    progressEmitter.emitProgress(pct, msg, step, { toolName })
  }
}
