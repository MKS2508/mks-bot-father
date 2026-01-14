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
import type { AgentOptions, AgentResult, ToolCallLog, PermissionDenial, ExecutionContext } from './types.js'

interface ContentBlock {
  type: string
  text?: string
  name?: string
  input?: unknown
  id?: string
  content?: string | unknown
}

function buildExecutionContextPrompt(context?: ExecutionContext): string {
  if (!context) {
    return ''
  }

  const sections: string[] = ['# Execution Context']

  switch (context.environment) {
    case 'telegram':
      sections.push(`
## Environment: Telegram Bot
You are being executed from a Telegram bot interface.

### Communication Guidelines:
- Use the \`mcp__telegram-messenger__*\` tools to send formatted messages to the user
- Use \`send_message\` for regular responses with proper HTML formatting
- Use \`ask_user_question\` when you need user input (creates inline keyboard buttons)
- Use \`update_progress\` for long-running operations to show visual progress
- Keep messages concise - Telegram has message length limits
- Use sections, code blocks, and formatting for clarity

### Available Telegram Tools:
- \`build_message\` - Build formatted messages with sections, lines, code blocks
- \`build_keyboard\` - Build inline keyboards with callback/url buttons
- \`send_message\` - Send message to the user
- \`send_media\` - Send photos, videos, documents
- \`edit_message\` - Edit an existing message
- \`delete_message\` - Delete a message
- \`ask_user_question\` - Ask user a question with button options (waits for response)
- \`update_progress\` - Show/update progress indicator
- \`format_tool_result\` - Format tool results for display`)

      if (context.telegram) {
        sections.push(`
### Current Chat Context:
- Chat ID: ${context.telegram.chatId}
- User ID: ${context.telegram.userId}${context.telegram.threadId ? `\n- Thread ID: ${context.telegram.threadId}` : ''}${context.telegram.username ? `\n- Username: @${context.telegram.username}` : ''}`)
      }
      break

    case 'tui':
      sections.push(`
## Environment: Terminal UI (TUI)
You are being executed from a terminal-based user interface.

### Communication Guidelines:
- Do NOT use telegram-messenger tools - they won't work in TUI
- Return your responses as plain text - the TUI will display them
- Use markdown formatting in your text responses
- The TUI handles progress display via callbacks, no need for special tools
- Keep responses readable in a terminal context`)
      break

    case 'cli':
      sections.push(`
## Environment: Command Line Interface (CLI)
You are being executed from a CLI/script context.

### Communication Guidelines:
- Do NOT use telegram-messenger tools - they won't work in CLI
- Return your responses as plain text
- Be concise and structured for CLI output
- Progress is handled by the calling process`)
      break
  }

  return sections.join('\n')
}

export async function runAgent(
  userPrompt: string,
  options: AgentOptions = {}
): Promise<AgentResult> {
  const {
    workingDirectory = process.cwd(),
    maxTurns = 50,
    model = 'claude-sonnet-4-5',
    maxBudgetUsd = 10.0,
    permissionMode = 'acceptEdits',
    includePartial = false,
    onMessage,
    onProgress,
    resumeSession,
    additionalDirectories,
    executionContext
  } = options

  const contextPrompt = buildExecutionContextPrompt(executionContext)
  const fullSystemPrompt = contextPrompt
    ? `${SYSTEM_PROMPT}\n\n---\n\n${contextPrompt}`
    : SYSTEM_PROMPT

  let sessionId = ''
  const toolCalls: ToolCallLog[] = []
  const errors: string[] = []
  const permissionDenials: PermissionDenial[] = []
  let finalResult: string | null = null
  let usage = { inputTokens: 0, outputTokens: 0, totalCostUsd: 0 }
  const startTime = Date.now()

  try {
    logger.info(`Starting agent with prompt: "${userPrompt.slice(0, 100)}..."`)

    const queryOptions = {
      systemPrompt: fullSystemPrompt,
      model,
      cwd: workingDirectory,
      maxTurns,
      maxBudgetUsd,
      permissionMode,
      includePartialMessages: includePartial,
      mcpServers,
      agents: subagents,
      allowedTools: allAllowedTools,
      ...(resumeSession && { resume: resumeSession }),
      ...(additionalDirectories && { additionalDirectories })
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
        permission_denials?: Array<{ tool: string; reason: string }>
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
              } else if (block.type === 'tool_result' && block.content) {
                // Extract progress events from tool results
                try {
                  const content = typeof block.content === 'string'
                    ? block.content
                    : JSON.stringify(block.content)

                  const parsed = JSON.parse(content) as {
                    progress?: Array<{ pct: number; msg: string; step?: string }>
                    [key: string]: unknown
                  }

                  if (parsed.progress && Array.isArray(parsed.progress) && onProgress) {
                    for (const event of parsed.progress) {
                      onProgress(event)
                    }
                  }
                } catch {
                  // Not valid JSON or doesn't contain progress, skip
                }
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

          // Check permission denials
          if (msg.permission_denials && msg.permission_denials.length > 0) {
            for (const denial of msg.permission_denials) {
              permissionDenials.push({ tool: denial.tool, reason: denial.reason })
              logger.warn(`Permission denied for ${denial.tool}: ${denial.reason}`)
            }
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
    permissionDenials,
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
