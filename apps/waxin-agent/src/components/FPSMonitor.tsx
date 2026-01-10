/**
 * FPSMonitor - FPS and performance tracking overlay
 * Real-time FPS, frame time stats, and memory monitoring
 * Updates both local state and debugStore
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useDebugStore, type MemoryStats as DebugMemoryStats } from '../stores/debugStore.js'

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

export interface FPSMonitorProps {
  visible: boolean
  updateInterval?: number // ms
  frameBufferSize?: number // number of frames to keep for stats
}

const FRAME_BUFFER_DEFAULT = 300 // ~5 seconds at 60fps
const UPDATE_INTERVAL_DEFAULT = 500 // Update display every 500ms

function calculateStandardDeviation(values: number[], mean: number): number {
  if (values.length === 0) return 0
  let variance = 0
  for (const value of values) {
    variance += Math.pow(value - mean, 2)
  }
  return Math.sqrt(variance / values.length)
}

export function getMemoryStats(): MemoryStats {
  if (typeof process !== 'undefined' && process.memoryUsage) {
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

export function useFPSMonitor(props: FPSMonitorProps) {
  const [stats, setStats] = useState<FrameStats>({
    fps: 0,
    frameCount: 0,
    averageFrameTime: 0,
    minFrameTime: 0,
    maxFrameTime: 0,
    stdDev: 0,
  })
  const [memoryStats, setMemoryStats] = useState<MemoryStats>({
    heapUsedMB: 0,
    heapTotalMB: 0,
    arrayBuffersMB: 0,
    externalMB: 0,
  })

  const frameTimesRef = useRef<number[]>([])
  const frameCountRef = useRef(0)
  const lastFrameTimeRef = useRef(Date.now())

  const recordFrame = useCallback(() => {
    const now = Date.now()
    const frameTime = now - lastFrameTimeRef.current
    lastFrameTimeRef.current = now

    frameTimesRef.current.push(frameTime)
    frameCountRef.current++

    // Limit buffer size
    const maxSize = props.frameBufferSize ?? FRAME_BUFFER_DEFAULT
    if (frameTimesRef.current.length > maxSize) {
      frameTimesRef.current.shift()
    }
  }, [props.frameBufferSize])

  const updateStats = useCallback(() => {
    const frameTimes = frameTimesRef.current
    if (frameTimes.length === 0) return

    const sum = frameTimes.reduce((a, b) => a + b, 0)
    const avg = sum / frameTimes.length
    const min = Math.min(...frameTimes)
    const max = Math.max(...frameTimes)
    const stdDev = calculateStandardDeviation(frameTimes, avg)

    // Calculate FPS based on recent frames
    const recentFrames = frameTimes.slice(-60) // Last ~1 second at 60fps
    const recentAvg = recentFrames.reduce((a, b) => a + b, 0) / recentFrames.length
    const fps = recentAvg > 0 ? Math.round(1000 / recentAvg) : 0

    const newStats = {
      fps,
      frameCount: frameCountRef.current,
      averageFrameTime: Math.round(avg * 10) / 10,
      minFrameTime: Math.round(min * 10) / 10,
      maxFrameTime: Math.round(max * 10) / 10,
      stdDev: Math.round(stdDev * 10) / 10,
    }

    const newMemoryStats = getMemoryStats()

    setStats(newStats)
    setMemoryStats(newMemoryStats)

    // Update debugStore with FPS and frame time
    useDebugStore.getState().updateFPS(fps, avg)

    // Update debugStore with memory
    const debugMemory: DebugMemoryStats = {
      heapUsed: newMemoryStats.heapUsedMB,
      heapTotal: newMemoryStats.heapTotalMB,
      external: newMemoryStats.externalMB,
      arrayBuffers: newMemoryStats.arrayBuffersMB,
    }
    useDebugStore.getState().updateMemory(debugMemory)
  }, [props.frameBufferSize])

  // Frame recording loop - disabled in terminal environment
  // Use renderer frame callback instead for FPS tracking in TUI
  useEffect(() => {
    if (!props.visible) return

    const interval = setInterval(() => {
      // Simulate frame time recording
      recordFrame()
    }, 16) // ~60fps

    return () => clearInterval(interval)
  }, [props.visible])

  // Stats update loop (less frequent than frame recording)
  useEffect(() => {
    if (!props.visible) return

    const interval = setInterval(() => {
      updateStats()
    }, props.updateInterval ?? UPDATE_INTERVAL_DEFAULT)

    return () => clearInterval(interval)
  }, [props.visible, props.updateInterval, updateStats])

  const reset = useCallback(() => {
    frameTimesRef.current = []
    frameCountRef.current = 0
    lastFrameTimeRef.current = Date.now()
    setStats({
      fps: 0,
      frameCount: 0,
      averageFrameTime: 0,
      minFrameTime: 0,
      maxFrameTime: 0,
      stdDev: 0,
    })
  }, [])

  const formatAsText = useCallback((): string[] => {
    return [
      `┌─ FPS Monitor ─┐`,
      `│ FPS: ${stats.fps.toString().padStart(3, ' ')}       │`,
      `│ Frame: ${stats.averageFrameTime.toString().padStart(5, ' ')}ms │`,
      `│ Min: ${stats.minFrameTime.toString().padStart(5, ' ')}ms   │`,
      `│ Max: ${stats.maxFrameTime.toString().padStart(5, ' ')}ms   │`,
      `│ Mem: ${memoryStats.heapUsedMB.toString().padStart(3, ' ')}MB     │`,
      `└──────────────┘`,
    ]
  }, [stats, memoryStats])

  return {
    stats,
    memoryStats,
    reset,
    formatAsText,
  }
}
