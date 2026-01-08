/**
 * useAgent hook - Agent lifecycle management.
 *
 * Provides agent execution with state tracking and callbacks.
 */

import { AgentBridge, type AgentCallbacks, type AgentResult, type AgentOptions } from '../lib/agent-bridge.js'
import { agentLogger } from '../lib/logger.js'
import { log } from '../lib/json-logger.js'
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
      log.warn('AGENT', 'Execution blocked - already executing', {
        promptLength: prompt.length,
        promptPreview: prompt.slice(0, 100)
      })
      throw new Error('Agent already executing')
    }

    isExecuting = true
    agentLogger.info(`User prompt: "${prompt.slice(0, 100)}..."`)
    log.info('AGENT', 'useAgent.execute() called', {
      promptLength: prompt.length,
      promptPreview: prompt.slice(0, 100),
      hasOptions: Object.keys(options).length > 0,
      hasCallbacks: Object.keys(callbacks).length > 0
    })

    const startTime = Date.now()

    try {
      const result = await currentBridge!.execute(prompt, options, callbacks)
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
    log.info('AGENT', 'useAgent.clear() called')
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
