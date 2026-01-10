/**
 * Message Handler with Confirmation and Progress.
 */
import type { Context } from 'telegraf'
import { runAgent } from '../../agent.js'
import { memoryStore } from '../../memory/store.js'
import { logger } from '../../utils/logger.js'
import { requiresConfirmation, createConfirmation } from '../confirmations.js'
import {
  createOperation,
  updateStepsFromToolCall,
  completeOperation,
  getOperation,
  isOperationCancelled
} from '../state/operations.js'
import { formatProgressMessage } from '../progress.js'
import {
  formatLongResponse,
  formatStatsCompact,
  formatStatsExpanded,
  shouldShowExpandedStats
} from '../formatters.js'
import { cancelOperationKeyboard, statsToggleKeyboard, postCreationKeyboard } from '../keyboards.js'
import type { IContextState } from '../types.js'

/** Throttle time for progress updates (ms) */
const UPDATE_THROTTLE = 1500

/** Execute a prompt (internal) */
export async function executePrompt(
  ctx: Context,
  prompt: string,
  skipConfirmation = false
): Promise<void> {
  const state = ctx.state as IContextState
  const userId = state?.userId || ctx.from!.id.toString()

  // Check if confirmation required
  if (!skipConfirmation) {
    const dangerousOp = requiresConfirmation(prompt)
    if (dangerousOp) {
      await createConfirmation(ctx, dangerousOp, prompt)
      return
    }
  }

  // Create processing message with cancel button
  const processingMsg = await ctx.reply(
    '🤔 Processing your request...',
    cancelOperationKeyboard('pending')
  )

  // Create operation for tracking
  const operation = createOperation(ctx.chat!.id, processingMsg.message_id, userId, prompt)

  // Update message with operation ID and initial progress
  try {
    await ctx.telegram.editMessageText(
      ctx.chat!.id,
      processingMsg.message_id,
      undefined,
      formatProgressMessage(operation),
      {
        parse_mode: 'Markdown',
        ...cancelOperationKeyboard(operation.id)
      }
    )
  } catch {
    // Ignore edit errors
  }

  // Save user message
  await memoryStore.append(userId, {
    role: 'user',
    content: prompt,
    timestamp: new Date().toISOString()
  })

  // Load conversation context and previous session
  const recentContext = await memoryStore.getRecentContext(userId, 10)
  const lastSessionId = await memoryStore.getUserLastSessionId(userId)

  // Build enriched prompt with conversation history
  const enrichedPrompt = recentContext
    ? `## Conversación previa:\n${recentContext}\n\n## Nueva solicitud:\n${prompt}`
    : prompt

  let lastUpdateTime = Date.now()

  try {
    const result = await runAgent(enrichedPrompt, {
      maxTurns: 30,
      resumeSession: lastSessionId || undefined,
      onMessage: async (msg) => {
        const typedMsg = msg as { type: string; tool_name?: string }

        // Check if cancelled
        if (isOperationCancelled(operation.id)) {
          throw new Error('Operation cancelled by user')
        }

        if (typedMsg.type === 'tool_call' && typedMsg.tool_name) {
          // Update steps based on tool call
          updateStepsFromToolCall(operation.id, typedMsg.tool_name)

          // Throttle updates to avoid Telegram rate limits
          const now = Date.now()
          if (now - lastUpdateTime >= UPDATE_THROTTLE) {
            lastUpdateTime = now

            try {
              const currentOp = getOperation(operation.id)
              if (currentOp) {
                await ctx.telegram.editMessageText(
                  ctx.chat!.id,
                  processingMsg.message_id,
                  undefined,
                  formatProgressMessage(currentOp),
                  {
                    parse_mode: 'Markdown',
                    ...cancelOperationKeyboard(operation.id)
                  }
                )
              }
            } catch {
              // Ignore throttle/edit errors
            }
          }
        }
      }
    })

    // Mark operation complete
    completeOperation(operation.id, result.success)

    // Delete processing message
    try {
      await ctx.telegram.deleteMessage(ctx.chat!.id, processingMsg.message_id)
    } catch {
      // Ignore delete errors
    }

    if (result.success && result.result) {
      // Format and send response
      const chunks = formatLongResponse(result.result)

      for (const chunk of chunks) {
        await ctx.reply(chunk)
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
          await ctx.reply('🎉 *Bot Created Successfully!*\n\nWhat would you like to do next?', {
            parse_mode: 'Markdown',
            ...postCreationKeyboard(match[1])
          })
        }
      }

      // Smart stats display
      if (shouldShowExpandedStats(result)) {
        await ctx.reply(formatStatsExpanded(result), {
          parse_mode: 'Markdown',
          ...statsToggleKeyboard(operation.id, true)
        })
      } else if (result.durationMs > 2000) {
        // Show compact stats for operations > 2s
        await ctx.reply(formatStatsCompact(result), { parse_mode: 'Markdown' })
      }
      // Skip stats entirely for quick operations (<2s)
    } else {
      const errorMsg = result.errors[0] || 'Task could not be completed'
      await ctx.reply(`❌ ${errorMsg}`)
    }
  } catch (error) {
    completeOperation(operation.id, false)

    try {
      await ctx.telegram.deleteMessage(ctx.chat!.id, processingMsg.message_id)
    } catch {
      // Ignore delete errors
    }

    const errorMsg = error instanceof Error ? error.message : String(error)

    if (errorMsg === 'Operation cancelled by user') {
      await ctx.reply('🛑 Operation cancelled.')
    } else {
      logger.error(`Error processing message: ${errorMsg}`)
      await ctx.reply(`❌ Error: ${errorMsg}`)
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

  logger.info(`Message from ${ctx.from!.id}: ${text.slice(0, 100)}...`)

  await executePrompt(ctx, text)
}
