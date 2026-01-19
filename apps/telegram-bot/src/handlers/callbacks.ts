/**
 * Callback Query Handlers with template logging.
 */
import type { Context } from 'telegraf'
import { processConfirmation } from '../state/confirmations.js'
import { getOperation, cancelOperation as cancelOp } from '../state/index.js'
import { handleHistory, handleStatus } from './commands.js'
import { callbackLogger, badge, kv, colors, colorText } from '../middleware/logging.js'
import { executePrompt } from './agent.js'
import { buildOperationCancelledMessage } from '../utils/formatters.js'
import { telegramMessengerService } from '@mks2508/bot-manager-agent'

/** Parse callback data */
export function parseCallbackData(data: string): { action: string; params: string[] } {
  const [action, ...params] = data.split(':')
  return { action, params }
}

/** Main callback router */
export async function handleCallback(ctx: Context): Promise<void> {
  const callbackQuery = ctx.callbackQuery
  if (!callbackQuery || !('data' in callbackQuery)) {
    return
  }

  const data = callbackQuery.data
  const { action, params } = parseCallbackData(data)

  callbackLogger.debug(
    `${badge('CBQ', 'rounded')} ${kv({
      action: colorText(action, colors.cyan),
      params: params.join(','),
      user: ctx.from?.id,
    })}`
  )

  try {
    // Check for ask_user_question callbacks first (format: ask_xxx:value)
    callbackLogger.debug(
      `${badge('ASK_CHECK', 'rounded')} ${kv({
        data,
        isAskFormat: data.startsWith('ask_') ? 'yes' : 'no',
        pendingCount: telegramMessengerService.getPendingCallbacksCount(),
        pendingIds: telegramMessengerService.getPendingCallbackIds().join(',') || 'none'
      })}`
    )

    if (telegramMessengerService.hasPendingCallback(data)) {
      callbackLogger.info(
        `${badge('ASK_FOUND', 'rounded')} ${kv({
          data,
          processing: 'yes'
        })}`
      )

      // CRITICAL: Answer Telegram FIRST (within 5s) to remove loading spinner
      await ctx.answerCbQuery('✓')

      // THEN process the callback (can take longer)
      const processed = telegramMessengerService.processPendingCallback(data)
      if (processed) {
        callbackLogger.success(`AskUserQuestion callback processed: ${data}`)
        // Delete the question message
        try {
          await ctx.deleteMessage()
        } catch {
          // Ignore delete errors
        }
        return
      } else {
        callbackLogger.warn(`AskUserQuestion callback NOT processed: ${data}`)
      }
    } else {
      callbackLogger.debug(`Not an AskUserQuestion callback or not pending: ${data}`)
    }

    switch (action) {
      case 'confirm':
        await handleConfirmCallback(ctx, params[0])
        break
      case 'cancel':
        await handleCancelCallback(ctx, params[0])
        break
      case 'cancel_op':
        await handleCancelOperationCallback(ctx, params[0])
        break
      case 'stats':
        await handleStatsCallback(ctx, params[0], params[1])
        break
      case 'menu':
        await handleMenuActionCallback(ctx, params[0])
        break
      case 'history':
        await handleHistoryCallback(ctx, parseInt(params[0], 10))
        break
      case 'configure':
        await handleConfigureCallback(ctx, params[0])
        break
      case 'create_repo':
        await handleCreateRepoCallback(ctx, params[0])
        break
      case 'deploy':
        await handleDeployCallback(ctx, params[0])
        break
      case 'noop':
        await ctx.answerCbQuery()
        break
      default:
        await ctx.answerCbQuery('Unknown action')
    }
  } catch (error) {
    callbackLogger.error(`Callback error: ${error}`)
    await ctx.answerCbQuery('An error occurred')
  }
}

/** Handle confirmation callback */
async function handleConfirmCallback(ctx: Context, confirmationId: string): Promise<void> {
  const result = await processConfirmation(ctx, confirmationId, true)

  if (result.confirmed && result.prompt) {
    await executePrompt(ctx, result.prompt, true)
  }
}

/** Handle cancel callback */
async function handleCancelCallback(ctx: Context, confirmationId: string): Promise<void> {
  await processConfirmation(ctx, confirmationId, false)
}

/** Handle cancel operation callback */
async function handleCancelOperationCallback(ctx: Context, operationId: string): Promise<void> {
  const success = cancelOp(operationId)

  if (success) {
    await ctx.answerCbQuery('🛑 Operation cancelled')
    const message = buildOperationCancelledMessage(true)
    await ctx.editMessageText(message.text || '', { parse_mode: 'HTML' })
  } else {
    await ctx.answerCbQuery('Operation not found or already completed')
  }
}

/** Handle stats toggle callback */
async function handleStatsCallback(
  ctx: Context,
  operationId: string,
  action: string
): Promise<void> {
  const operation = getOperation(operationId)

  if (!operation) {
    await ctx.answerCbQuery('Stats not available')
    return
  }

  await ctx.answerCbQuery(action === 'show' ? 'Showing details' : 'Hiding details')
}

/** Handle menu action callback */
async function handleMenuActionCallback(ctx: Context, action: string): Promise<void> {
  await ctx.answerCbQuery()

  const prompts: Record<string, string> = {
    create_bot: 'Create a new Telegram bot',
    list_bots: 'List all my bots',
    deploy: 'Deploy my latest bot to Coolify'
  }

  if (action === 'status') {
    await handleStatus(ctx)
    return
  }

  if (action === 'history') {
    await handleHistory(ctx)
    return
  }

  if (action === 'settings') {
    await ctx.reply('⚙️ Settings coming soon...')
    return
  }

  if (action === 'back') {
    const { handleMenu } = await import('./commands.js')
    await handleMenu(ctx)
    return
  }

  const prompt = prompts[action]
  if (prompt) {
    await executePrompt(ctx, prompt)
  }
}

/** Handle history pagination callback */
async function handleHistoryCallback(ctx: Context, page: number): Promise<void> {
  await ctx.answerCbQuery()

  // Delete the current message and send new one
  try {
    await ctx.deleteMessage()
  } catch {
    // Ignore delete errors
  }

  await handleHistory(ctx, page)
}

/** Handle configure bot callback */
async function handleConfigureCallback(ctx: Context, botUsername: string): Promise<void> {
  await ctx.answerCbQuery()
  await executePrompt(ctx, `Configure bot @${botUsername}`)
}

/** Handle create repo callback */
async function handleCreateRepoCallback(ctx: Context, botUsername: string): Promise<void> {
  await ctx.answerCbQuery()
  await executePrompt(ctx, `Create a GitHub repository for ${botUsername}`)
}

/** Handle deploy callback */
async function handleDeployCallback(ctx: Context, botUsername: string): Promise<void> {
  await ctx.answerCbQuery()
  await executePrompt(ctx, `Deploy ${botUsername} to Coolify`)
}
