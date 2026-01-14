/**
 * Command Handlers with template logging.
 */
import type { Context } from 'telegraf'
import { mainMenuKeyboard, historyPaginationKeyboard } from '../keyboards.js'
import { memoryStore } from '@mks2508/bot-manager-agent/memory/store'
import {
  buildStatusMessage,
  buildWelcomeMessage,
  buildHelpMessage,
  buildMenuMessage,
  buildCancellationMessage,
  buildHistoryPageMessage,
  buildNoHistoryMessage,
  buildHistoryEntry
} from '../utils/formatters.js'
import { clearUserConfirmations } from '../state/confirmations.js'
import { clearUserOperations, getUserOperations, cancelOperation } from '../state/index.js'
import type { IContextState, IStoredMessage } from '../types/agent.js'
import { commandLogger, badge, kv, colors, colorText } from '../middleware/logging.js'
import { sendMessage } from '../lib/message-helper.js'

/** /start command */
export async function handleStart(ctx: Context): Promise<void> {
  commandLogger.debug(
    `${badge('CMD', 'rounded')} ${kv({
      cmd: '/start',
      user: colorText(String(ctx.from?.id), colors.cyan),
    })}`
  )

  await sendMessage(ctx, buildWelcomeMessage())
}

/** /help command */
export async function handleHelp(ctx: Context): Promise<void> {
  commandLogger.debug(
    `${badge('CMD', 'rounded')} ${kv({
      cmd: '/help',
      user: colorText(String(ctx.from?.id), colors.cyan),
    })}`
  )

  await sendMessage(ctx, buildHelpMessage())
}

/** /menu command */
export async function handleMenu(ctx: Context): Promise<void> {
  commandLogger.debug(
    `${badge('CMD', 'rounded')} ${kv({
      cmd: '/menu',
      user: colorText(String(ctx.from?.id), colors.cyan),
    })}`
  )

  await sendMessage(ctx, buildMenuMessage(), {
    keyboard: mainMenuKeyboard().reply_markup
  })
}

/** /status command */
export async function handleStatus(ctx: Context): Promise<void> {
  commandLogger.debug(
    `${badge('CMD', 'rounded')} ${kv({
      cmd: '/status',
      user: colorText(String(ctx.from?.id), colors.cyan),
    })}`
  )

  const status = {
    Telegram: '✅ Connected',
    GitHub: process.env.GITHUB_TOKEN ? '✅ Configured' : '⚠️ Not configured',
    Coolify: process.env.COOLIFY_URL ? '✅ Configured' : '⚠️ Not configured',
    'Claude API': process.env.ANTHROPIC_API_KEY ? '✅ Configured' : '❌ Not configured'
  }

  await sendMessage(ctx, buildStatusMessage(status))
}

/** /history command */
export async function handleHistory(ctx: Context, page = 0): Promise<void> {
  commandLogger.debug(
    `${badge('CMD', 'rounded')} ${kv({
      cmd: '/history',
      user: colorText(String(ctx.from?.id), colors.cyan),
      page,
    })}`
  )

  const state = ctx.state as IContextState
  const userId = state?.userId || ctx.from!.id.toString()
  const messages = (await memoryStore.load(userId)) as IStoredMessage[]

  if (messages.length === 0) {
    await sendMessage(ctx, buildNoHistoryMessage())
    return
  }

  const ITEMS_PER_PAGE = 5
  const userMessages = messages.filter((m) => m.role === 'user')

  if (userMessages.length === 0) {
    await sendMessage(ctx, buildNoHistoryMessage())
    return
  }

  const totalPages = Math.ceil(userMessages.length / ITEMS_PER_PAGE)
  const startIndex = page * ITEMS_PER_PAGE
  const pageMessages = userMessages.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  // Build header
  const headerMsg = buildHistoryPageMessage(
    userMessages.length,
    startIndex,
    startIndex + pageMessages.length
  )

  // Build entries as text (buildHistoryEntry returns TelegramMessage, we need text)
  const entriesText = pageMessages.map((msg, i) => {
    const response = messages.find(
      (m) => m.role === 'assistant' && new Date(m.timestamp) > new Date(msg.timestamp)
    )
    const entry = buildHistoryEntry(msg.content, response?.content || null, msg.timestamp, startIndex + i)
    return entry.text || ''
  }).join('\n\n')

  // Combine header and entries
  const fullText = `${headerMsg.text}\n\n${entriesText}`

  await ctx.reply(fullText, {
    parse_mode: 'HTML',
    ...historyPaginationKeyboard(page, totalPages)
  })
}

/** /cancel command */
export async function handleCancel(ctx: Context): Promise<void> {
  commandLogger.debug(
    `${badge('CMD', 'rounded')} ${kv({
      cmd: '/cancel',
      user: colorText(String(ctx.from?.id), colors.cyan),
    })}`
  )

  const state = ctx.state as IContextState
  const userId = state?.userId || ctx.from!.id.toString()

  // Clear confirmations
  clearUserConfirmations(userId)

  // Cancel running operations
  const operations = getUserOperations(userId)

  if (operations.length === 0) {
    await sendMessage(ctx, buildCancellationMessage(0))
    return
  }

  for (const op of operations) {
    cancelOperation(op.id)
  }

  await sendMessage(ctx, buildCancellationMessage(operations.length))
}

/** /clear command */
export async function handleClear(ctx: Context): Promise<void> {
  commandLogger.debug(
    `${badge('CMD', 'rounded')} ${kv({
      cmd: '/clear',
      user: colorText(String(ctx.from?.id), colors.cyan),
    })}`
  )

  const state = ctx.state as IContextState
  const userId = state?.userId || ctx.from!.id.toString()

  await memoryStore.clearAll(userId)
  clearUserConfirmations(userId)
  clearUserOperations(userId)

  await ctx.reply('🧹 Memoria, sesiones y confirmaciones eliminadas.')
}
