/**
 * useAgent hook - Agent lifecycle management.
 *
 * Provides agent execution with state tracking and callbacks.
 */

import { AgentBridge, type AgentCallbacks, type AgentResult, type AgentOptions } from '../lib/agent-bridge.js'
import { agentLogger } from '../lib/logger.js'
import type { AgentStats } from '../types.js'

/**
 * Agent hook state and methods.
 */
export interface UseAgentState {
  execute: (prompt: string, options?: AgentOptions, callbacks?: AgentCallbacks) => Promise<AgentResult>
  getStats: () => AgentStats | null
  getSessionId: () => string
  clear: () => void
  isExecuting: () => boolean
}

/**
 * Current execution state.
 */
let isExecuting = false
let currentBridge: AgentBridge | null = null

/**
 * Hook for agent lifecycle management.
 *
 * @returns Agent state and methods
 */
export function useAgent(): UseAgentState {
  if (!currentBridge) {
    currentBridge = new AgentBridge()
  }

  const execute = async (
    prompt: string,
    options: AgentOptions = {},
    callbacks: AgentCallbacks = {}
  ): Promise<AgentResult> => {
    if (isExecuting) {
      agentLogger.warn('Agent already executing, ignoring request')
      throw new Error('Agent already executing')
    }

    isExecuting = true
    agentLogger.info(`User prompt: "${prompt.slice(0, 100)}..."`)

    try {
      const result = await currentBridge!.execute(prompt, options, callbacks)
      return result
    } finally {
      isExecuting = false
    }
  }

  const getStats = (): AgentStats | null => {
    return currentBridge!.getStats()
  }

  const getSessionId = (): string => {
    return currentBridge!.getSessionId()
  }

  const clear = (): void => {
    currentBridge!.clear()
  }

  const isCurrentlyExecuting = (): boolean => {
    return isExecuting
  }

  return {
    execute,
    getStats,
    getSessionId,
    clear,
    isExecuting: isCurrentlyExecuting
  }
}

/**
 * Reset the agent bridge (useful for testing).
 */
export function resetAgentBridge(): void {
  currentBridge = null
  isExecuting = false
}
