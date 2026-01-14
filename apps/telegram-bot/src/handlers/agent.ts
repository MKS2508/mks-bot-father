/**
 * Agent Handler with Confirmation and Progress.
 * Uses ProgressManager for visual progress tracking.
 */
import type { Context } from 'telegraf'
import { runAgent, type ExecutionContext } from '@mks2508/bot-manager-agent'
import { memoryStore } from '@mks2508/bot-manager-agent/memory/store'
import { agentLogger, badge, kv, colors, colorText } from '../middleware/logging.js'
import {
  requiresConfirmation,
  createConfirmation
} from '../state/confirmations.js'
import {
  createOperation,
  updateStepsFromToolCall,
  completeOperation,
  isOperationCancelled
} from '../state/index.js'
import {
  shouldShowExpandedStats,
  buildAgentResponse,
  buildStatsMessage,
  buildErrorMessage,
  buildBotCreatedMessage,
  buildOperationCancelledMessage
} from '../utils/formatters.js'
import { statsToggleKeyboard, postCreationKeyboard } from '../keyboards.js'
import { sendMessage } from '../lib/message-helper.js'
import {
  createProgressTracker,
  startProgress,
  updateProgress,
  completeProgress,
  failProgress,
  removeProgressTracker
} from '../lib/progress-tracker.js'
import { StreamingHandler } from '../lib/streaming-handler.js'
import type { IContextState } from '../types/agent.js'

/** Map tool names to human-readable step descriptions */
const TOOL_STEP_LABELS: Record<string, string> = {
  'bot-manager': '🤖 Managing bot...',
  'github': '📦 Working with GitHub...',
  'coolify': '🚀 Deploying to Coolify...',
  'code-executor': '⚙️ Executing code...',
  'Read': '📖 Reading files...',
  'Edit': '✏️ Editing files...',
  'Write': '📝 Writing files...',
  'Bash': '💻 Running commands...',
  'Glob': '🔍 Searching files...',
  'Grep': '🔎 Searching content...',
}

/** Execute a prompt (internal) */
export async function executePrompt(
  ctx: Context,
  prompt: string,
  skipConfirmation = false
): Promise<void> {
  const state = ctx.state as IContextState
  const userId = state?.userId || ctx.from!.id.toString()
  const chatId = ctx.chat!.id

  agentLogger.info(
    `${badge('AGENT', 'rounded')} ${kv({
      prompt: prompt.slice(0, 50),
      user: colorText(userId, colors.cyan),
    })}`
  )

  // Check if confirmation required
  if (!skipConfirmation) {
    const dangerousOp = requiresConfirmation(prompt)
    if (dangerousOp) {
      agentLogger.debug(
        `${badge('CONFIRM', 'rounded')} ${kv({
          operation: dangerousOp,
        })}`
      )
      await createConfirmation(ctx, dangerousOp, prompt)
      return
    }
  }

  // Create operation for tracking
  const operation = createOperation(chatId, 0, userId, prompt)

  // Get thread ID if in a topic
  const threadId = ctx.message && 'message_thread_id' in ctx.message
    ? ctx.message.message_thread_id
    : undefined

  // Create streaming handler for real-time feedback
  const streamingHandler = new StreamingHandler(ctx.telegram, chatId, threadId)
  await streamingHandler.start('Procesando tu solicitud...')

  // Legacy progress tracker removed - StreamingHandler handles all feedback

  // Save user message
  await memoryStore.append(userId, {
    role: 'user',
    content: prompt,
    timestamp: new Date().toISOString()
  })

  // Load conversation context and previous session
  const recentContext = await memoryStore.getRecentContext(userId, 50)
  const lastSessionId = await memoryStore.getUserLastSessionId(userId)

  // Build enriched prompt with conversation history
  const enrichedPrompt = recentContext
    ? `## Conversación previa:\n${recentContext}\n\n## Nueva solicitud:\n${prompt}`
    : prompt

  let stepCount = 0

  const executionContext: ExecutionContext = {
    environment: 'telegram',
    telegram: {
      chatId,
      threadId,
      userId,
      username: ctx.from?.username
    }
  }

  // Track tool IDs for matching tool_use with tool_result
  const toolIdMap = new Map<string, string>()

  try {
    const result = await runAgent(enrichedPrompt, {
      maxTurns: 30,
      resumeSession: lastSessionId || undefined,
      executionContext,
      includePartial: true,
      onMessage: async (msg) => {
        interface IContentBlock {
          type: string
          text?: string
          name?: string
          input?: unknown
          id?: string
          content?: string | unknown
          is_error?: boolean
        }

        interface IStreamEvent {
          type: string
          delta?: {
            type: string
            text?: string
            thinking?: string
          }
        }

        const message = msg as {
          type: string
          subtype?: string
          session_id?: string
          content?: IContentBlock[]
          message?: { content?: IContentBlock[] }
          thinking?: string
          tool_name?: string
          event?: IStreamEvent
        }

        // Check if cancelled
        if (isOperationCancelled(operation.id)) {
          throw new Error('Operation cancelled by user')
        }

        // Log session init
        if (message.type === 'system' && message.subtype === 'init') {
          agentLogger.debug(`${badge('SESSION', 'rounded')} ${kv({ id: message.session_id?.slice(0, 8) })}`)
        }

        // Handle thinking text
        if (message.thinking) {
          await streamingHandler.onThinking(message.thinking)
        }

        // Get content blocks (either direct or nested)
        const contentBlocks = Array.isArray(message.content)
          ? message.content
          : (message.message && Array.isArray(message.message.content) ? message.message.content : null)

        // Process assistant content blocks
        if (message.type === 'assistant' && contentBlocks) {
          for (const block of contentBlocks) {
            if (block.type === 'text' && block.text) {
              // Stream text to handler (saved for final message)
              await streamingHandler.onAssistantText(block.text)
            } else if (block.type === 'tool_use' && block.name && block.id) {
              // Tool starting
              stepCount++
              toolIdMap.set(block.id, block.name)

              // Update streaming handler
              await streamingHandler.onToolStart(block.name, block.id, block.input)

              // Small delay to allow Telegram message update
              await new Promise(resolve => setTimeout(resolve, 100))

              agentLogger.debug(
                `${badge('TOOL', 'rounded')} ${kv({
                  name: colorText(block.name.split('__').pop() || block.name, colors.cyan),
                  step: stepCount
                })}`
              )
            } else if (block.type === 'tool_result' && block.id) {
              // Tool completed - find the tool name
              const toolName = toolIdMap.get(block.id) || 'unknown'
              const isError = block.is_error === true
              const resultContent = block.content || block.text || ''

              await streamingHandler.onToolComplete(block.id, resultContent, isError)

              // Small delay to allow Telegram message update
              await new Promise(resolve => setTimeout(resolve, 100))

              if (isError) {
                agentLogger.debug(
                  `${badge('TOOL_ERR', 'rounded')} ${kv({
                    tool: toolName.split('__').pop(),
                    error: String(resultContent).slice(0, 50)
                  })}`
                )
              }
            }
          }
        }

        // Process stream_event messages (partial text/thinking)
        if (message.type === 'stream_event' && message.event?.delta) {
          const delta = message.event.delta

          if (delta.type === 'text_delta' && delta.text) {
            await streamingHandler.onStreamText(delta.text)
          }

          if (delta.type === 'thinking_delta' && delta.thinking) {
            await streamingHandler.onStreamThinking(delta.thinking)
          }
        }
      }
    })

    // Clean up streaming handler
    await streamingHandler.finish()

    // Mark operation complete
    completeOperation(operation.id, result.success)

    // Log execution summary
    const toolsExecuted = streamingHandler.getCompletedToolCount()
    const totalToolTime = streamingHandler.getTotalDuration()
    agentLogger.info(
      `${badge('DONE', 'rounded')} ${kv({
        success: result.success ? 'yes' : 'no',
        tools: toolsExecuted,
        toolTime: `${totalToolTime}ms`,
        totalTime: `${result.durationMs}ms`
      })}`
    )

    if (result.success && result.result) {
      // Format and send response using unified helper
      const messages = buildAgentResponse(result.result)
      for (const message of messages) {
        await sendMessage(ctx, message)
      }

      // Save assistant response
      await memoryStore.append(userId, {
        role: 'assistant',
        content: result.result,
        timestamp: new Date().toISOString()
      })

      // Save session for continuity
      if (result.sessionId) {
        await memoryStore.saveUserSession(userId, result.sessionId)
      }

      // Check if bot was created - show quick actions
      const promptLower = prompt.toLowerCase()
      if (
        promptLower.includes('create') &&
        promptLower.includes('bot') &&
        result.result.includes('@')
      ) {
        // Extract bot username from result
        const match = result.result.match(/@(\w+_bot)/i)
        if (match) {
          await sendMessage(ctx, buildBotCreatedMessage(), {
            keyboard: postCreationKeyboard(match[1]).reply_markup
          })
        }
      }

      // Stats removed - StreamingHandler shows execution summary
    } else {
      // Error handling with formatted message
      const errorMsg = result.errors[0] || 'Task could not be completed'
      await sendMessage(ctx, buildErrorMessage(errorMsg))
    }
  } catch (error) {
    // Clean up streaming handler
    await streamingHandler.finish()

    completeOperation(operation.id, false)

    const errorMsg = error instanceof Error ? error.message : String(error)

    if (errorMsg === 'Operation cancelled by user') {
      await sendMessage(ctx, buildOperationCancelledMessage())
    } else {
      agentLogger.error(`Error processing message: ${errorMsg}`)
      await sendMessage(ctx, buildErrorMessage(errorMsg))
    }
  }
}

/** Handle incoming text message */
export async function handleTextMessage(ctx: Context): Promise<void> {
  const message = ctx.message
  if (!message || !('text' in message)) return

  const text = message.text

  // Skip commands
  if (text.startsWith('/')) {
    return
  }

  agentLogger.debug(
    `${badge('MSG', 'rounded')} ${kv({
      from: ctx.from!.id,
      text: text.slice(0, 50),
    })}`
  )

  await executePrompt(ctx, text)
}
