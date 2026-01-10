/**
 * Debug Store - Centralized debug state management
 * Single source of truth for all debug/overlay data
 */

import { create } from 'zustand'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface MemoryStats {
  heapUsed: number      // MB
  heapTotal: number     // MB
  external: number      // MB
  arrayBuffers: number  // MB
}

export interface PerformanceMetrics {
  agentExec: number   // ms
  toolCall: number    // ms
  render: number      // ms
  decode: number      // ms
  resize: number      // ms
  convert: number     // ms
  total: number       // ms (sum of all)
}

export interface KeypressEvent {
  type: 'keypress' | 'keyrelease' | 'paste' | 'raw-input'
  key: string
  timestamp: string
  modifiers?: {
    ctrl?: boolean
    shift?: boolean
    meta?: boolean
    alt?: boolean
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORE STATE
// ═══════════════════════════════════════════════════════════════════════════════

export interface DebugState {
  // Overlay visibility
  activeOverlay: string | null

  // FPS Metrics
  fps: number
  frameTime: number    // ms

  // Memory Stats
  memory: MemoryStats

  // Performance Metrics
  performanceMetrics: PerformanceMetrics

  // Keypress Events (circular buffer, max 50)
  keypressEvents: KeypressEvent[]

  // Actions
  setActiveOverlay: (overlay: string | null) => void
  updateFPS: (fps: number, frameTime: number) => void
  updateMemory: (memory: MemoryStats) => void
  updatePerformanceMetrics: (metrics: PerformanceMetrics) => void
  addKeypressEvent: (event: KeypressEvent) => void
  clearKeypressEvents: () => void
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORE CREATE
// ═══════════════════════════════════════════════════════════════════════════════

export const useDebugStore = create<DebugState>((set) => ({
  // Initial state
  activeOverlay: null,

  fps: 0,
  frameTime: 0,

  memory: {
    heapUsed: 0,
    heapTotal: 0,
    external: 0,
    arrayBuffers: 0,
  },

  performanceMetrics: {
    agentExec: 0,
    toolCall: 0,
    render: 0,
    decode: 0,
    resize: 0,
    convert: 0,
    total: 0,
  },

  keypressEvents: [],

  // Actions
  setActiveOverlay: (overlay) => set({ activeOverlay: overlay }),

  updateFPS: (fps, frameTime) => set({ fps, frameTime }),

  updateMemory: (memory) => set({ memory }),

  updatePerformanceMetrics: (metrics) => set({ performanceMetrics: metrics }),

  addKeypressEvent: (event) => set((state) => {
    // Keep only last 50 events (circular buffer)
    const events = [...state.keypressEvents, event]
    if (events.length > 50) {
      return { keypressEvents: events.slice(-50) }
    }
    return { keypressEvents: events }
  }),

  clearKeypressEvents: () => set({ keypressEvents: [] }),
}))

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get current memory stats from process.memoryUsage()
 */
export function getCurrentMemoryStats(): MemoryStats {
  if (typeof process === 'undefined' || !process.memoryUsage) {
    return {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      arrayBuffers: 0,
    }
  }

  const mem = process.memoryUsage()
  return {
    heapUsed: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
    heapTotal: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
    external: Math.round((mem.external / 1024 / 1024) * 100) / 100,
    arrayBuffers: Math.round((mem.arrayBuffers / 1024 / 1024) * 100) / 100,
  }
}

/**
 * Get memory usage percentage
 */
export function getMemoryUsagePercent(heapUsed: number, heapTotal: number): number {
  if (heapTotal === 0) return 0
  return Math.round((heapUsed / heapTotal) * 100)
}
