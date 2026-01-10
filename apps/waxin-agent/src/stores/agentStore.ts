/**
 * Agent Store - Zustand store for agent state management
 * Replaces global module state in useAgent hook with proper state management
 */

import { create } from 'zustand'
import { AgentBridge } from '../lib/agent-bridge.js'
import type { AgentCallbacks, AgentOptions, AgentResult } from '../types.js'

export interface AgentState {
  bridge: AgentBridge | null
  isExecuting: boolean
  sessionId: string | null
  lastError: Error | null
}

export interface AgentActions {
  initialize: () => void
  execute: (prompt: string, options?: AgentOptions, callbacks?: AgentCallbacks) => Promise<AgentResult>
  clear: () => void
  getStats: () => ReturnType<AgentBridge['getStats']> | null
  getSessionId: () => string
  setError: (error: Error | null) => void
}

export type AgentStore = AgentState & AgentActions

export const useAgentStore = create<AgentStore>((set, get) => ({
  // State
  bridge: null,
  isExecuting: false,
  sessionId: null,
  lastError: null,

  // Actions
  initialize: () => {
    const { bridge } = get()
    if (!bridge) {
      set({ bridge: new AgentBridge() })
    }
  },

  execute: async (prompt: string, options: AgentOptions = {}, callbacks: AgentCallbacks = {}) => {
    const { isExecuting, bridge } = get()

    if (isExecuting) {
      throw new Error('Agent already executing')
    }

    if (!bridge) {
      throw new Error('Agent bridge not initialized. Call initialize() first.')
    }

    set({ isExecuting: true, lastError: null })

    try {
      const result = await bridge.execute(prompt, options, callbacks)
      set({
        sessionId: result.sessionId,
        isExecuting: false,
      })
      return result
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      set({ lastError: err, isExecuting: false })
      throw error
    }
  },

  clear: () => {
    const { bridge } = get()
    if (bridge) {
      bridge.clear()
    }
    set({
      sessionId: null,
      lastError: null,
    })
  },

  getStats: () => {
    const { bridge } = get()
    return bridge ? bridge.getStats() : null
  },

  getSessionId: () => {
    return get().sessionId || ''
  },

  setError: (error: Error | null) => {
    set({ lastError: error })
  },
}))

// Selector hooks for optimized re-renders
export const useAgentBridge = () => useAgentStore((state) => state.bridge)
export const useAgentIsExecuting = () => useAgentStore((state) => state.isExecuting)
export const useAgentSessionId = () => useAgentStore((state) => state.sessionId)
export const useAgentLastError = () => useAgentStore((state) => state.lastError)
