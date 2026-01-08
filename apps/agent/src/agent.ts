/**
 * Bot Manager Agent.
 *
 * Main agent implementation using Claude Agent SDK.
 */

import { query } from '@anthropic-ai/claude-agent-sdk'
import { mcpServers, allAllowedTools } from './tools/index.js'
import { subagents } from './subagents/index.js'
import { SYSTEM_PROMPT } from './prompts/system.js'
import { logger } from './utils/logger.js'
import type { AgentOptions, AgentResult, ToolCallLog } from './types.js'

interface ContentBlock {
  type: string
  text?: string
  name?: string
  input?: unknown
  id?: string
}

export async function runAgent(
  userPrompt: string,
  options: AgentOptions = {}
): Promise<AgentResult> {
  const {
    workingDirectory = process.cwd(),
    maxTurns = 50,
    model = 'claude-sonnet-4-5',
    permissionMode = 'acceptEdits',
    includePartial = false,
    onMessage,
    resumeSession
  } = options

  let sessionId = ''
  const toolCalls: ToolCallLog[] = []
  const errors: string[] = []
  let finalResult: string | null = null
  let usage = { inputTokens: 0, outputTokens: 0, totalCostUsd: 0 }
  const startTime = Date.now()

  try {
    logger.info(`Starting agent with prompt: "${userPrompt.slice(0, 100)}..."`)

    const queryOptions = {
      systemPrompt: SYSTEM_PROMPT,
      model,
      cwd: workingDirectory,
      maxTurns,
      permissionMode,
      includePartialMessages: includePartial,
      mcpServers,
      agents: subagents,
      allowedTools: allAllowedTools,
      ...(resumeSession && { resume: resumeSession })
    }

    for await (const message of query({
      prompt: userPrompt,
      options: queryOptions
    })) {
      if (onMessage) {
        onMessage(message)
      }

      const msg = message as {
        type: string
        subtype?: string
        session_id?: string
        content?: ContentBlock[]
        result?: string
        errors?: string[]
        usage?: { input_tokens?: number; output_tokens?: number }
        total_cost_usd?: number
      }

      switch (msg.type) {
        case 'system':
          if (msg.subtype === 'init' && msg.session_id) {
            sessionId = msg.session_id
            logger.info(`Session started: ${sessionId}`)
          }
          break

        case 'assistant':
          if (Array.isArray(msg.content)) {
            for (const block of msg.content) {
              if (block.type === 'text' && block.text) {
                logger.assistant(block.text)
              } else if (block.type === 'tool_use' && block.name) {
                logger.tool(`Tool request: ${block.name}`)
                toolCalls.push({
                  tool: block.name,
                  input: block.input,
                  result: ''
                })
              }
            }
          }
          break

        case 'result':
          if (msg.session_id) {
            sessionId = msg.session_id
          }
          usage = {
            inputTokens: msg.usage?.input_tokens || 0,
            outputTokens: msg.usage?.output_tokens || 0,
            totalCostUsd: msg.total_cost_usd || 0
          }

          if (msg.subtype === 'success') {
            finalResult = msg.result || null
            logger.success('Agent completed successfully')
          } else {
            const resultErrors = msg.errors || []
            errors.push(...resultErrors)
            logger.error(`Agent failed: ${msg.subtype}`)
          }
          break

        default:
          logger.debug(`Message type: ${msg.type}`)
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    errors.push(errorMsg)
    logger.error(`Fatal error: ${errorMsg}`)

    if (errorMsg.includes('AUTHENTICATION_FAILED')) {
      logger.error('Check your ANTHROPIC_API_KEY')
    } else if (errorMsg.includes('RATE_LIMIT_EXCEEDED')) {
      logger.error('Rate limit exceeded, retry after delay')
    } else if (errorMsg.includes('CONTEXT_LENGTH_EXCEEDED')) {
      logger.error('Context too large, consider session compaction')
    }
  }

  const durationMs = Date.now() - startTime

  return {
    success: errors.length === 0 && finalResult !== null,
    result: finalResult,
    sessionId,
    toolCalls,
    errors,
    usage,
    durationMs
  }
}

export async function runInteractiveAgent(
  options: Omit<AgentOptions, 'onMessage'> & {
    onAssistantMessage?: (text: string) => void
    onToolCall?: (tool: string) => void
  } = {}
): Promise<{
  sendMessage: (message: string) => Promise<AgentResult>
  getSessionId: () => string
}> {
  let currentSessionId = ''

  const sendMessage = async (message: string): Promise<AgentResult> => {
    const result = await runAgent(message, {
      ...options,
      resumeSession: currentSessionId || undefined,
      onMessage: (msg) => {
        const typedMsg = msg as { type: string; content?: ContentBlock[]; tool_name?: string }
        if (typedMsg.type === 'assistant' && Array.isArray(typedMsg.content)) {
          for (const block of typedMsg.content) {
            if (block.type === 'text' && block.text) {
              options.onAssistantMessage?.(block.text)
            } else if (block.type === 'tool_use' && block.name) {
              options.onToolCall?.(block.name)
            }
          }
        }
      }
    })

    currentSessionId = result.sessionId
    return result
  }

  return {
    sendMessage,
    getSessionId: () => currentSessionId
  }
}
