/**
 * PerformanceTracker - Mark-based performance timing and memory tracking
 * Updates both local measurements and debugStore
 *
 * Adapted from @mks2508/opentui-image for waxin-agent TUI
 */

import { useDebugStore, type PerformanceMetrics as DebugPerformanceMetrics } from '../stores/debugStore.js'

export interface PerformanceMetrics {
  decode: number
  resize: number
  convert: number
  agentExec?: number
  toolCall?: number
  render?: number
  total: number
  memory: number
}

export interface FrameStats {
  fps: number
  frameCount: number
  averageFrameTime: number
  minFrameTime: number
  maxFrameTime: number
  stdDev: number
}

export interface MemoryStats {
  heapUsedMB: number
  heapTotalMB: number
  arrayBuffersMB: number
  externalMB: number
}

export class PerformanceTracker {
  private marks: Map<string, number> = new Map()
  private measurements: Map<string, number> = new Map()
  private frameTimes: number[] = []
  private frameCount = 0
  private maxFrameBuffer = 300 // ~5 seconds at 60fps

  start(label: string): void {
    this.marks.set(label, performance.now())
  }

  end(label: string): number {
    const startTime = this.marks.get(label)
    if (startTime === undefined) {
      return 0
    }
    const elapsed = performance.now() - startTime
    this.measurements.set(label, elapsed)
    this.marks.delete(label)

    // Update debugStore with new metrics
    const metrics = this.getMetrics()
    const debugMetrics: DebugPerformanceMetrics = {
      agentExec: metrics.agentExec ?? 0,
      toolCall: metrics.toolCall ?? 0,
      render: metrics.render ?? 0,
      decode: metrics.decode,
      resize: metrics.resize,
      convert: metrics.convert,
      total: metrics.total,
    }
    useDebugStore.getState().updatePerformanceMetrics(debugMetrics)

    return elapsed
  }

  get(label: string): number {
    return this.measurements.get(label) ?? 0
  }

  set(label: string, value: number): void {
    this.measurements.set(label, value)
  }

  reset(): void {
    this.marks.clear()
    this.measurements.clear()
    this.frameTimes = []
    this.frameCount = 0
  }

  getMemoryMB(): number {
    if (typeof process !== "undefined" && process.memoryUsage) {
      const usage = process.memoryUsage()
      return Math.round((usage.heapUsed / 1024 / 1024) * 10) / 10
    }
    return 0
  }

  getMemoryStats(): MemoryStats {
    if (typeof process !== "undefined" && process.memoryUsage) {
      const usage = process.memoryUsage()
      return {
        heapUsedMB: Math.round((usage.heapUsed / 1024 / 1024) * 10) / 10,
        heapTotalMB: Math.round((usage.heapTotal / 1024 / 1024) * 10) / 10,
        arrayBuffersMB: Math.round((usage.arrayBuffers / 1024 / 1024) * 10) / 10,
        externalMB: Math.round((usage.external / 1024 / 1024) * 10) / 10,
      }
    }
    return {
      heapUsedMB: 0,
      heapTotalMB: 0,
      arrayBuffersMB: 0,
      externalMB: 0,
    }
  }

  getMetrics(): PerformanceMetrics {
    const decode = this.get("decode")
    const resize = this.get("resize")
    const convert = this.get("convert")
    const agentExec = this.measurements.has("agentExec") ? this.get("agentExec") : undefined
    const toolCall = this.measurements.has("toolCall") ? this.get("toolCall") : undefined
    const render = this.measurements.has("render") ? this.get("render") : undefined
    const total = decode + resize + convert + (agentExec ?? 0) + (toolCall ?? 0) + (render ?? 0)

    return {
      decode,
      resize,
      convert,
      agentExec,
      toolCall,
      render,
      total,
      memory: this.getMemoryMB(),
    }
  }

  // FPS tracking methods
  recordFrameTime(frameTimeMs: number): void {
    this.frameTimes.push(frameTimeMs)
    this.frameCount++

    if (this.frameTimes.length > this.maxFrameBuffer) {
      this.frameTimes.shift()
    }
  }

  getFrameStats(): FrameStats {
    if (this.frameTimes.length === 0) {
      return {
        fps: 0,
        frameCount: 0,
        averageFrameTime: 0,
        minFrameTime: 0,
        maxFrameTime: 0,
        stdDev: 0,
      }
    }

    const sum = this.frameTimes.reduce((a, b) => a + b, 0)
    const avg = sum / this.frameTimes.length
    const min = Math.min(...this.frameTimes)
    const max = Math.max(...this.frameTimes)

    let variance = 0
    for (const ft of this.frameTimes) {
      variance += Math.pow(ft - avg, 2)
    }
    const stdDev = Math.sqrt(variance / this.frameTimes.length)

    // Calculate FPS based on recent frames
    const recentFrames = this.frameTimes.slice(-60) // Last ~1 second at 60fps
    const recentAvg = recentFrames.reduce((a, b) => a + b, 0) / recentFrames.length
    const fps = recentAvg > 0 ? Math.round(1000 / recentAvg) : 0

    return {
      fps,
      frameCount: this.frameCount,
      averageFrameTime: Math.round(avg * 10) / 10,
      minFrameTime: Math.round(min * 10) / 10,
      maxFrameTime: Math.round(max * 10) / 10,
      stdDev: Math.round(stdDev * 10) / 10,
    }
  }

  formatMetrics(): string {
    const m = this.getMetrics()
    const parts: string[] = []

    if (m.agentExec !== undefined && m.agentExec > 0) parts.push(`agent: ${m.agentExec.toFixed(0)}ms`)
    if (m.toolCall !== undefined && m.toolCall > 0) parts.push(`tool: ${m.toolCall.toFixed(0)}ms`)
    if (m.render !== undefined && m.render > 0) parts.push(`render: ${m.render.toFixed(1)}ms`)
    if (m.decode > 0) parts.push(`decode: ${m.decode.toFixed(1)}ms`)
    parts.push(`mem: ${m.memory.toFixed(1)}MB`)

    return parts.join(" │ ")
  }

  formatCompact(): string {
    const m = this.getMetrics()
    const parts: string[] = []

    if (m.agentExec !== undefined && m.agentExec > 0) {
      parts.push(`⚡${(m.agentExec / 1000).toFixed(1)}s`)
    }
    parts.push(`💾${m.memory.toFixed(0)}MB`)

    return parts.join(" ")
  }

  formatDebugPanel(options?: {
    model?: string
    sessionId?: string
    toolCalls?: number
  }): string[] {
    const m = this.getMetrics()
    const lines: string[] = []

    if (options?.model) {
      lines.push(`Model: ${options.model}`)
    }
    lines.push("─".repeat(30))

    if (m.agentExec !== undefined) {
      lines.push(`Agent:    ${m.agentExec.toFixed(0).padStart(8)}ms`)
    }
    if (m.toolCall !== undefined) {
      lines.push(`Tools:    ${m.toolCall.toFixed(0).padStart(8)}ms`)
    }
    if (m.render !== undefined) {
      lines.push(`Render:   ${m.render.toFixed(1).padStart(8)}ms`)
    }
    if (m.decode > 0) {
      lines.push(`Decode:   ${m.decode.toFixed(1).padStart(8)}ms`)
    }

    lines.push("─".repeat(30))
    lines.push(`Memory:   ${m.memory.toFixed(1).padStart(8)} MB`)
    lines.push("─".repeat(30))

    if (options?.toolCalls !== undefined) {
      lines.push(`Tool calls: ${options.toolCalls}`)
    }
    if (options?.sessionId) {
      lines.push(`Session: ${options.sessionId.slice(-8)}`)
    }

    return lines
  }

  formatFPSPanel(): string[] {
    const frame = this.getFrameStats()
    const memory = this.getMemoryStats()

    return [
      `┌─ Performance Tracker ─┐`,
      `│ FPS: ${frame.fps.toString().padStart(3, ' ')}             │`,
      `│ Frame: ${frame.averageFrameTime.toString().padStart(5, ' ')}ms      │`,
      `│ Min: ${frame.minFrameTime.toString().padStart(5, ' ')}ms       │`,
      `│ Max: ${frame.maxFrameTime.toString().padStart(5, ' ')}ms       │`,
      `│ StdDev: ${frame.stdDev.toString().padStart(4, ' ')}ms      │`,
      `│ ─────────────────────│`,
      `│ Heap: ${memory.heapUsedMB.toString().padStart(3, ' ')}MB / ${memory.heapTotalMB.toFixed(0).padStart(3, ' ')}MB │`,
      `│ Arrays: ${memory.arrayBuffersMB.toFixed(1).padStart(4, ' ')}MB    │`,
      `└──────────────────────┘`,
    ]
  }
}

export const globalTracker = new PerformanceTracker()
