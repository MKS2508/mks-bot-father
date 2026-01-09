/**
 * Callback Query Handlers.
 */
import type { Context } from 'telegraf'
import { processConfirmation } from '../confirmations.js'
import { getOperation, cancelOperation as cancelOp } from '../state/operations.js'
import { handleHistory, handleStatus } from './commands.js'
import { logger } from '../../utils/logger.js'

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

  logger.debug(`Callback: ${action} with params: ${params.join(', ')}`)

  try {
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
    logger.error(`Callback error: ${error}`)
    await ctx.answerCbQuery('An error occurred')
  }
}

/** Handle confirmation callback */
async function handleConfirmCallback(ctx: Context, confirmationId: string): Promise<void> {
  const result = await processConfirmation(ctx, confirmationId, true)

  if (result.confirmed && result.prompt) {
    // Import dynamically to avoid circular dependency
    const { executePrompt } = await import('./messages.js')
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
    await ctx.editMessageText(
      '🛑 *Operation Cancelled*\n\nThe operation was cancelled by user.',
      { parse_mode: 'Markdown' }
    )
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
    const { executePrompt } = await import('./messages.js')
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
  const { executePrompt } = await import('./messages.js')
  await executePrompt(ctx, `Configure bot @${botUsername}`)
}

/** Handle create repo callback */
async function handleCreateRepoCallback(ctx: Context, botUsername: string): Promise<void> {
  await ctx.answerCbQuery()
  const { executePrompt } = await import('./messages.js')
  await executePrompt(ctx, `Create a GitHub repository for ${botUsername}`)
}

/** Handle deploy callback */
async function handleDeployCallback(ctx: Context, botUsername: string): Promise<void> {
  await ctx.answerCbQuery()
  const { executePrompt } = await import('./messages.js')
  await executePrompt(ctx, `Deploy ${botUsername} to Coolify`)
}
