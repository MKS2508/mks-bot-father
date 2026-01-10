/**
 * useAgent hook - Agent lifecycle management.
 *
 * Now uses Zustand store for proper state management instead of module globals.
 * This is a thin wrapper that initializes the store on first use.
 */

import { useEffect } from 'react'
import { useAgentStore } from '../stores/agentStore.js'
import type { AgentCallbacks, AgentOptions, AgentResult } from '../types.js'
import { agentLogger } from '../lib/logger.js'
import { log } from '../lib/json-logger.js'
import type { AgentStats } from '../types.js'

/**
 * Agent hook state and methods.
 * Matches the original interface for backward compatibility.
 */
export interface UseAgentState {
  execute: (prompt: string, options?: AgentOptions, callbacks?: AgentCallbacks) => Promise<AgentResult>
  getStats: () => AgentStats | null
  getSessionId: () => string
  clear: () => void
  isExecuting: () => boolean
}

/**
 * Hook for agent lifecycle management.
 *
 * Uses Zustand store instead of module-level state.
 * Initializes the store on first mount.
 *
 * @returns Agent state and methods
 */
export function useAgent(): UseAgentState {
  // Initialize store on mount
  useEffect(() => {
    useAgentStore.getState().initialize()
  }, [])

  const execute = async (
    prompt: string,
    options: AgentOptions = {},
    callbacks: AgentCallbacks = {}
  ): Promise<AgentResult> => {
    if (useAgentStore.getState().isExecuting) {
      agentLogger.warn('Agent already executing, ignoring request')
      log.warn('AGENT', 'Execution blocked - already executing', {
        promptLength: prompt.length,
        promptPreview: prompt.slice(0, 100)
      })
      throw new Error('Agent already executing')
    }

    agentLogger.info(`User prompt: "${prompt.slice(0, 100)}..."`)
    log.info('AGENT', 'useAgent.execute() called', {
      promptLength: prompt.length,
      promptPreview: prompt.slice(0, 100),
      hasOptions: Object.keys(options).length > 0,
      hasCallbacks: Object.keys(callbacks).length > 0
    })

    const startTime = Date.now()

    try {
      const result = await useAgentStore.getState().execute(prompt, options, callbacks)
      log.info('AGENT', 'useAgent.execute() completed', {
        durationMs: Date.now() - startTime,
        sessionId: result.sessionId,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        toolCallsCount: result.toolCalls.length,
        errorsCount: result.errors.length
      })
      return result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined
      log.error('AGENT', 'useAgent.execute() threw exception', {
        error: errorMsg,
        stack: errorStack?.slice(0, 500),
        durationMs: Date.now() - startTime
      })
      throw error
    }
  }

  const getStats = (): AgentStats | null => {
    return useAgentStore.getState().getStats()
  }

  const getSessionId = (): string => {
    return useAgentStore.getState().getSessionId()
  }

  const clear = (): void => {
    log.info('AGENT', 'useAgent.clear() called')
    useAgentStore.getState().clear()
  }

  const isCurrentlyExecuting = (): boolean => {
    return useAgentStore.getState().isExecuting
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
 * Now resets the Zustand store state.
 */
export function resetAgentBridge(): void {
  useAgentStore.getState().clear()
}
