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

  // Create progress tracker with visual progress bar
  const threadId = ctx.message && 'message_thread_id' in ctx.message
    ? ctx.message.message_thread_id
    : undefined

  createProgressTracker(operation.id, ctx.telegram, chatId, threadId, 10)
  await startProgress(operation.id, '🤔 Processing your request...', 10)

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

  try {
    const result = await runAgent(enrichedPrompt, {
      maxTurns: 30,
      resumeSession: lastSessionId || undefined,
      executionContext,
      onMessage: async (msg) => {
        const typedMsg = msg as { type: string; tool_name?: string }

        // Check if cancelled
        if (isOperationCancelled(operation.id)) {
          throw new Error('Operation cancelled by user')
        }

        if (typedMsg.type === 'tool_call' && typedMsg.tool_name) {
          // Update steps based on tool call
          updateStepsFromToolCall(operation.id, typedMsg.tool_name)
          stepCount++

          // Update visual progress
          const toolLabel = TOOL_STEP_LABELS[typedMsg.tool_name] || `🔧 ${typedMsg.tool_name}...`
          try {
            await updateProgress(operation.id, Math.min(stepCount, 9), toolLabel)
          } catch {
            // Ignore progress update errors
          }
        }
      }
    })

    // Mark operation complete
    completeOperation(operation.id, result.success)

    if (result.success && result.result) {
      // Complete progress with success
      await completeProgress(operation.id, '✅ Task completed!')
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

      // Smart stats display
      if (shouldShowExpandedStats(result)) {
        await sendMessage(ctx, buildStatsMessage(result, true), {
          keyboard: statsToggleKeyboard(operation.id, true).reply_markup
        })
      } else if (result.durationMs > 2000) {
        // Show compact stats for operations > 2s
        await sendMessage(ctx, buildStatsMessage(result, false))
      }
      // Skip stats entirely for quick operations (<2s)
    } else {
      // Error handling with formatted message
      const errorMsg = result.errors[0] || 'Task could not be completed'
      await failProgress(operation.id, `❌ ${errorMsg}`)
      await sendMessage(ctx, buildErrorMessage(errorMsg))
    }
  } catch (error) {
    completeOperation(operation.id, false)

    const errorMsg = error instanceof Error ? error.message : String(error)

    if (errorMsg === 'Operation cancelled by user') {
      removeProgressTracker(operation.id)
      await sendMessage(ctx, buildOperationCancelledMessage())
    } else {
      await failProgress(operation.id, `❌ Error: ${errorMsg.slice(0, 50)}`)
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
