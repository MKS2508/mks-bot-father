/**
 * Agent Bridge - Connects TUI to Bot Manager Agent.
 *
 * Thin wrapper around the real agent from @mks2508/bot-manager-agent.
 */

import {
  runAgent,
  type AgentResult,
  type AgentOptions,
  type ToolCallLog
} from '@mks2508/bot-manager-agent'
import { agentLogger } from './logger.js'
import { categorizeError } from './error-categorizer.js'
import { log } from './json-logger.js'
import type { AgentCallbacks } from '../types.js'

export type { AgentResult, AgentOptions, ToolCallLog, AgentCallbacks }

interface ContentBlock {
  type: string
  text?: string
  name?: string
  input?: unknown
}

export class AgentBridge {
  private currentResult: AgentResult | null = null
  private sessionId = ''
  private toolCalls: ToolCallLog[] = []

  async execute(
    prompt: string,
    options: AgentOptions = {},
    callbacks: AgentCallbacks = {}
  ): Promise<AgentResult> {
    const startTime = Date.now()

    log.info('AGENT', 'AgentBridge.execute() called', {
      promptLength: prompt.length,
      promptPreview: prompt.slice(0, 80),
      hasOptions: Object.keys(options).length > 0
    })

    agentLogger.info(`Starting agent execution`)
    agentLogger.info(`Prompt: "${prompt.slice(0, 50)}..."`)

    try {
      log.debug('AGENT', 'Calling runAgent() from bot-manager-agent', {
        prompt: prompt.slice(0, 50)
      })

      const result = await runAgent(prompt, {
        ...options,
        onMessage: (message) => {
          log.debug('AGENT', 'onMessage callback triggered', {
            messageType: typeof message === 'object' ? (message as {type?: string}).type : 'unknown'
          })
          callbacks.onMessage?.(message)
          this.handleMessage(message, callbacks)
        }
      })

      this.currentResult = result
      this.sessionId = result.sessionId
      this.toolCalls = result.toolCalls

      log.info('AGENT', 'runAgent() completed successfully', {
        sessionId: result.sessionId,
        success: result.success,
        toolCallsCount: result.toolCalls.length,
        errorsCount: result.errors.length,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        durationMs: result.durationMs
      })

      if (result.errors.length > 0) {
        log.warn('AGENT', 'Agent returned with errors', {
          errors: result.errors.slice(0, 3)
        })
        categorizeError(result.errors[0])
      }

      agentLogger.success(`Completed in ${Date.now() - startTime}ms`)
      return result

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined

      log.error('AGENT', 'runAgent() threw exception', {
        error: errorMsg,
        stack: errorStack?.slice(0, 500),
        durationMs: Date.now() - startTime
      })

      agentLogger.error(`Fatal error: ${errorMsg}`)
      categorizeError(error)

      const fallbackResult: AgentResult = {
        success: false,
        result: null,
        sessionId: this.sessionId,
        toolCalls: [],
        errors: [errorMsg],
        usage: { inputTokens: 0, outputTokens: 0, totalCostUsd: 0 },
        durationMs: Date.now() - startTime
      }

      this.currentResult = fallbackResult
      return fallbackResult
    }
  }

  private handleMessage(message: unknown, callbacks: AgentCallbacks): void {
    const msg = message as {
      type: string
      subtype?: string
      session_id?: string
      content?: ContentBlock[]
      message?: { content?: ContentBlock[] }
      result?: string
      errors?: string[]
      thinking?: string
    }

    log.debug('AGENT', 'handleMessage() processing', {
      type: msg.type,
      subtype: msg.subtype,
      hasContent: Array.isArray(msg.content),
      hasNestedMessage: msg.message && typeof msg.message === 'object',
      hasNestedContent: msg.message && Array.isArray(msg.message.content),
      contentLength: Array.isArray(msg.content) ? msg.content.length :
                      (msg.message && Array.isArray(msg.message.content) ? msg.message.content.length : 0),
      allKeys: Object.keys(msg),
      hasResult: msg.result !== undefined,
      resultLength: msg.result?.length || 0
    })

    // Session initialization
    if (msg.type === 'system' && msg.subtype === 'init' && msg.session_id) {
      this.sessionId = msg.session_id
      log.info('AGENT', 'Session initialized', { sessionId: msg.session_id })
      agentLogger.info(`Session started: ${msg.session_id}`)
    }

    // Handle thinking/reasoning text
    if (msg.thinking) {
      log.debug('AGENT', 'Thinking text received', {
        length: msg.thinking.length,
        preview: msg.thinking.slice(0, 100)
      })
      callbacks.onThinking?.(msg.thinking)
    }

    // Get content from either direct property or nested message object
    const contentBlocks = Array.isArray(msg.content) ? msg.content :
                          (msg.message && Array.isArray(msg.message.content) ? msg.message.content : null)

    // Process content blocks from assistant messages
    if (msg.type === 'assistant' && contentBlocks) {
      log.debug('AGENT', `Processing ${contentBlocks.length} content blocks`)

      for (const block of contentBlocks) {
        if (block.type === 'text' && block.text) {
          log.debug('AGENT', 'Text block received', {
            length: block.text.length,
            preview: block.text.slice(0, 100)
          })
          callbacks.onAssistantMessage?.(block.text)
        } else if (block.type === 'tool_use' && block.name) {
          log.info('TOOL', `Tool use detected: ${block.name}`, {
            tool: block.name,
            inputType: typeof block.input,
            inputKeys: block.input && typeof block.input === 'object'
              ? Object.keys(block.input as object)
              : []
          })
          callbacks.onToolCall?.(block.name, block.input)
        }
      }
    }

    // Handle final result from result messages
    if (msg.type === 'result' && msg.result) {
      log.info('AGENT', 'Final result received', {
        length: msg.result.length,
        preview: msg.result.slice(0, 100)
      })
      callbacks.onAssistantMessage?.(msg.result)
    }
  }

  getResult(): AgentResult | null {
    return this.currentResult
  }

  getStats() {
    if (!this.currentResult) return null
    return {
      sessionId: this.currentResult.sessionId,
      inputTokens: this.currentResult.usage.inputTokens,
      outputTokens: this.currentResult.usage.outputTokens,
      totalTokens: this.currentResult.usage.inputTokens + this.currentResult.usage.outputTokens,
      totalCostUsd: this.currentResult.usage.totalCostUsd,
      durationMs: this.currentResult.durationMs,
      toolCallsCount: this.currentResult.toolCalls.length,
      errorsCount: this.currentResult.errors.length
    }
  }

  getSessionId(): string {
    return this.sessionId
  }

  getToolCalls(): ToolCallLog[] {
    return this.toolCalls
  }

  clear(): void {
    this.currentResult = null
    this.sessionId = ''
    this.toolCalls = []
  }
}

let globalBridge: AgentBridge | null = null

export function getGlobalBridge(): AgentBridge {
  if (!globalBridge) {
    globalBridge = new AgentBridge()
  }
  return globalBridge
}
