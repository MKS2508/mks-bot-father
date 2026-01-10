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
import type { AgentCallbacks, ToolExecution } from '../types.js'

export type { AgentResult, AgentOptions, ToolCallLog, AgentCallbacks, ToolExecution }

interface ContentBlock {
  type: string
  text?: string
  name?: string
  input?: unknown
  id?: string
  result?: unknown
  isError?: boolean
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const MAX_CONVERSATION_HISTORY = 20

export class AgentBridge {
  private currentResult: AgentResult | null = null
  private sessionId = ''
  private toolCalls: ToolCallLog[] = []
  private toolExecutions: Map<string, ToolExecution> = new Map()
  private conversationHistory: ConversationMessage[] = []

  // Pending tool response for AskUserQuestion flow
  // NOTE: The SDK doesn't support pausing mid-execution, so this requires
  // a custom tui_ask_user MCP tool that handles UI interaction synchronously
  private pendingToolResponse: {
    toolId: string
    resolve: (response: unknown) => void
  } | null = null

  async execute(
    prompt: string,
    options: AgentOptions = {},
    callbacks: AgentCallbacks = {}
  ): Promise<AgentResult> {
    const startTime = Date.now()

    log.info('AGENT', 'AgentBridge.execute() called', {
      promptLength: prompt.length,
      promptPreview: prompt.slice(0, 80),
      hasOptions: Object.keys(options).length > 0,
      hasSessionId: !!this.sessionId,
      historyLength: this.conversationHistory.length
    })

    agentLogger.info(`Starting agent execution`)
    agentLogger.info(`Prompt: "${prompt.slice(0, 50)}..."`)

    // Build enriched prompt with conversation context
    const enrichedPrompt = this.buildContextPrompt(prompt)

    try {
      log.debug('AGENT', 'Calling runAgent() from bot-manager-agent', {
        prompt: prompt.slice(0, 50),
        resumeSession: this.sessionId || 'none'
      })

      const result = await runAgent(enrichedPrompt, {
        ...options,
        resumeSession: this.sessionId || undefined,
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

      // Save to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: prompt,
        timestamp: new Date().toISOString()
      })

      if (result.result) {
        this.conversationHistory.push({
          role: 'assistant',
          content: result.result,
          timestamp: new Date().toISOString()
        })
      }

      // Trim history to max size
      if (this.conversationHistory.length > MAX_CONVERSATION_HISTORY) {
        this.conversationHistory = this.conversationHistory.slice(-MAX_CONVERSATION_HISTORY)
      }

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
        durationMs: Date.now() - startTime,
        permissionDenials: []
      }

      this.currentResult = fallbackResult
      return fallbackResult
    }
  }

  private buildContextPrompt(prompt: string): string {
    if (this.conversationHistory.length === 0) {
      return prompt
    }

    const recent = this.conversationHistory.slice(-10)
    const contextStr = recent.map(m => {
      const role = m.role === 'user' ? 'Human' : 'Assistant'
      return `${role}: ${m.content}`
    }).join('\n\n')

    return `## Conversación previa:\n${contextStr}\n\n## Nueva solicitud:\n${prompt}`
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

          // Track tool execution start
          const toolId = block.id || `${block.name}_${Date.now()}`
          const execution: ToolExecution = {
            tool: block.name,
            input: block.input,
            startTime: Date.now()
          }
          this.toolExecutions.set(toolId, execution)
          log.debug('TOOL', `Tool execution started: ${block.name}`, { toolId })
        } else if (block.type === 'tool_result' && block.id) {
          // Track tool execution completion
          const execution = this.toolExecutions.get(block.id)
          if (execution) {
            const endTime = Date.now()
            const duration = endTime - execution.startTime

            const completedExecution: ToolExecution = {
              ...execution,
              endTime,
              duration,
              success: !block.isError,
              result: block.result,
              error: block.isError ? (typeof block.content === 'string' ? block.content : 'Tool execution failed') : undefined
            }

            this.toolExecutions.set(block.id, completedExecution)
            log.debug('TOOL', `Tool execution completed: ${completedExecution.tool}`, {
              toolId: block.id,
              duration,
              success: completedExecution.success
            })

            callbacks.onToolComplete?.(completedExecution)
          }
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

  getToolExecutions(): ToolExecution[] {
    return Array.from(this.toolExecutions.values())
  }

  clear(): void {
    this.currentResult = null
    this.sessionId = ''
    this.toolCalls = []
    this.toolExecutions.clear()
    this.pendingToolResponse = null
    this.conversationHistory = []
    log.info('AGENT', 'Session cleared', { clearedHistory: true })
  }

  getConversationHistory(): ConversationMessage[] {
    return [...this.conversationHistory]
  }

  /**
   * Submit a tool response for a pending AskUserQuestion.
   * This is called when the user answers a question in the TUI.
   *
   * NOTE: The SDK doesn't support pausing/resuming execution mid-stream.
   * To properly use this, you need to create a custom `tui_ask_user` MCP tool
   * that handles the UI interaction synchronously within the tool handler.
   *
   * @param toolId - The tool ID to respond to
   * @param response - The user's response
   */
  submitToolResponse(toolId: string, response: unknown): void {
    if (this.pendingToolResponse?.toolId === toolId) {
      this.pendingToolResponse.resolve(response)
      this.pendingToolResponse = null
    } else {
      log.warn('TUI', 'No pending tool response found', { toolId })
    }
  }
}

let globalBridge: AgentBridge | null = null

export function getGlobalBridge(): AgentBridge {
  if (!globalBridge) {
    globalBridge = new AgentBridge()
  }
  return globalBridge
}
