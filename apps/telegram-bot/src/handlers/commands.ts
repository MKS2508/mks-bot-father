/**
 * Command Handlers with template logging.
 */
import type { Context } from 'telegraf'
import { mainMenuKeyboard, historyPaginationKeyboard } from '../keyboards.js'
import { memoryStore } from '@mks2508/bot-manager-agent/memory/store'
import { formatHistoryEntry } from '../utils/formatters.js'
import { clearUserConfirmations } from '../state/confirmations.js'
import { clearUserOperations, getUserOperations, cancelOperation } from '../state/index.js'
import type { IContextState, IStoredMessage } from '../types/agent.js'
import { commandLogger, badge, kv, colors, colorText } from '../middleware/logging.js'

/** /start command */
export async function handleStart(ctx: Context): Promise<void> {
  commandLogger.debug(
    `${badge('CMD', 'rounded')} ${kv({
      cmd: '/start',
      user: colorText(String(ctx.from?.id), colors.cyan),
    })}`
  )

  await ctx.reply(
    `🤖 *Bot Manager Agent*\n\n` +
      `I can help you manage Telegram bots, GitHub repos, and Coolify deployments.\n\n` +
      `*Commands:*\n` +
      `/menu - Interactive menu\n` +
      `/help - Show all commands\n` +
      `/status - Check service status\n` +
      `/bots - List your bots\n` +
      `/history - Recent actions\n` +
      `/cancel - Cancel running operation\n` +
      `/clear - Clear conversation\n\n` +
      `Just send me a message describing what you want to do!`,
    { parse_mode: 'Markdown' }
  )
}

/** /help command */
export async function handleHelp(ctx: Context): Promise<void> {
  commandLogger.debug(
    `${badge('CMD', 'rounded')} ${kv({
      cmd: '/help',
      user: colorText(String(ctx.from?.id), colors.cyan),
    })}`
  )

  await ctx.reply(
    `*Available Commands:*\n\n` +
      `/start - Welcome message\n` +
      `/menu - Interactive menu with buttons\n` +
      `/help - This help message\n` +
      `/status - Check configured services\n` +
      `/bots - List all your bots\n` +
      `/history - View recent actions\n` +
      `/cancel - Cancel current operation\n` +
      `/clear - Clear conversation history\n\n` +
      `*Example requests:*\n` +
      `• "Create a bot called my-bot"\n` +
      `• "Deploy my-bot to Coolify"\n` +
      `• "List my bots"\n` +
      `• "Clone repo and run tests"\n\n` +
      `💡 _Tip: Dangerous operations will ask for confirmation_`,
    { parse_mode: 'Markdown' }
  )
}

/** /menu command */
export async function handleMenu(ctx: Context): Promise<void> {
  commandLogger.debug(
    `${badge('CMD', 'rounded')} ${kv({
      cmd: '/menu',
      user: colorText(String(ctx.from?.id), colors.cyan),
    })}`
  )

  await ctx.reply('🎛️ *Main Menu*\n\nSelect an action:', {
    parse_mode: 'Markdown',
    ...mainMenuKeyboard()
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
    telegram: '✅ Connected',
    github: process.env.GITHUB_TOKEN ? '✅ Configured' : '⚠️ Not configured',
    coolify: process.env.COOLIFY_URL ? '✅ Configured' : '⚠️ Not configured',
    anthropic: process.env.ANTHROPIC_API_KEY ? '✅ Configured' : '❌ Not configured'
  }

  await ctx.reply(
    `*Service Status:*\n\n` +
      `Telegram: ${status.telegram}\n` +
      `GitHub: ${status.github}\n` +
      `Coolify: ${status.coolify}\n` +
      `Claude API: ${status.anthropic}`,
    { parse_mode: 'Markdown' }
  )
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
    await ctx.reply('📜 No history yet. Start by sending a message!')
    return
  }

  const ITEMS_PER_PAGE = 5
  const userMessages = messages.filter((m) => m.role === 'user')

  if (userMessages.length === 0) {
    await ctx.reply('📜 No history yet. Start by sending a message!')
    return
  }

  const totalPages = Math.ceil(userMessages.length / ITEMS_PER_PAGE)
  const startIndex = page * ITEMS_PER_PAGE
  const pageMessages = userMessages.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const entries = pageMessages.map((msg, i) => {
    const response = messages.find(
      (m) => m.role === 'assistant' && new Date(m.timestamp) > new Date(msg.timestamp)
    )
    return formatHistoryEntry(msg.content, response?.content || null, msg.timestamp, startIndex + i)
  })

  await ctx.reply(
    `📜 *Recent Actions* (${startIndex + 1}-${startIndex + pageMessages.length} of ${userMessages.length})\n\n` +
      entries.join('\n\n'),
    {
      parse_mode: 'Markdown',
      ...historyPaginationKeyboard(page, totalPages)
    }
  )
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
    await ctx.reply('ℹ️ No running operations to cancel.')
    return
  }

  for (const op of operations) {
    cancelOperation(op.id)
  }

  await ctx.reply(`🛑 Cancelled ${operations.length} operation(s).`, { parse_mode: 'Markdown' })
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

  await memoryStore.clear(userId)
  clearUserConfirmations(userId)
  clearUserOperations(userId)

  await ctx.reply('🗑️ Conversation history and pending operations cleared.')
}
