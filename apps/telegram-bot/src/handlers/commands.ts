/**
 * Command Handlers with template logging.
 */
import type { Context } from 'telegraf'
import { mainMenuKeyboard, historyPaginationKeyboard, sessionListKeyboard } from '../keyboards.js'
import { memoryStore, sessionService, compactionService } from '@mks2508/bot-manager-agent'
import {
  buildStatusMessage,
  buildWelcomeMessage,
  buildHelpMessage,
  buildMenuMessage,
  buildCancellationMessage,
  buildHistoryPageMessage,
  buildNoHistoryMessage,
  buildHistoryEntry,
  buildSessionListMessage,
  buildContextStatsMessage,
  buildCompactResultMessage
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

/** /restart command - Only for authorized users */
export async function handleRestart(ctx: Context): Promise<void> {
  commandLogger.debug(
    `${badge('CMD', 'rounded')} ${kv({
      cmd: '/restart',
      user: colorText(String(ctx.from?.id), colors.cyan),
    })}`
  )

  const userId = ctx.from?.id.toString() || ''
  const OWNER_ID = '265889349'
  const authorizedUsers = process.env.ALLOWED_TELEGRAM_USERS?.split(',') || []

  // Check authorization - owner is always authorized
  if (userId !== OWNER_ID && !authorizedUsers.includes(userId)) {
    commandLogger.warn(
      `${badge('UNAUTHORIZED', 'rounded')} ${kv({
        user: userId,
        cmd: '/restart'
      })}`
    )
    await ctx.reply('No tienes permisos para reiniciar el bot.')
    return
  }

  // Confirm restart to user
  await ctx.reply(
    '<b>Reiniciando bot...</b>\n\n' +
    'Volvere en unos segundos. Si no respondo en 10 segundos, ' +
    'revisa los logs con <code>pm2 logs waxin-bot</code>',
    { parse_mode: 'HTML' }
  )

  commandLogger.info(
    `${badge('RESTART', 'pill')} ${kv({
      requestedBy: colorText(userId, colors.cyan),
      reason: 'Manual restart via /restart command'
    })}`
  )

  // Give time for message to be sent
  setTimeout(() => {
    process.exit(0) // PM2 will restart automatically
  }, 500)
}

/** /sessions command - List available sessions */
export async function handleSessions(ctx: Context): Promise<void> {
  commandLogger.debug(
    `${badge('CMD', 'rounded')} ${kv({
      cmd: '/sessions',
      user: colorText(String(ctx.from?.id), colors.cyan),
    })}`
  )

  const state = ctx.state as IContextState
  const userId = state?.userId || ctx.from!.id.toString()

  try {
    const sessions = await sessionService.list({ userId, limit: 10, sortBy: 'lastMessageAt' })

    if (sessions.length === 0) {
      await ctx.reply(
        '📂 <b>No hay sesiones guardadas</b>\n\n' +
        'Inicia una conversación para crear una sesión.',
        { parse_mode: 'HTML' }
      )
      return
    }

    await sendMessage(ctx, buildSessionListMessage(sessions), {
      keyboard: sessionListKeyboard(sessions).reply_markup
    })
  } catch (error) {
    commandLogger.error(
      `${badge('ERROR', 'rounded')} ${kv({
        cmd: '/sessions',
        error: error instanceof Error ? error.message : String(error)
      })}`
    )
    await ctx.reply('❌ Error al cargar sesiones.')
  }
}

/** /resume [session_id] command - Resume a session */
export async function handleResume(ctx: Context, sessionId?: string): Promise<void> {
  commandLogger.debug(
    `${badge('CMD', 'rounded')} ${kv({
      cmd: '/resume',
      user: colorText(String(ctx.from?.id), colors.cyan),
      sessionId: sessionId || 'none'
    })}`
  )

  const state = ctx.state as IContextState
  const userId = state?.userId || ctx.from!.id.toString()

  if (!sessionId) {
    // Show session list for selection
    return handleSessions(ctx)
  }

  try {
    const session = await sessionService.get(sessionId)

    if (!session) {
      await ctx.reply('❌ Sesión no encontrada.')
      return
    }

    // Store the session ID for future messages
    await memoryStore.saveUserSession(userId, sessionId)

    await ctx.reply(
      `✅ <b>Sesión restaurada</b>\n\n` +
      `📝 <b>ID:</b> <code>${sessionId}</code>\n` +
      `💬 <b>Mensajes:</b> ${session.metadata.messageCount}\n` +
      (session.metadata.name ? `📛 <b>Nombre:</b> ${session.metadata.name}\n` : '') +
      (session.metadata.gitBranch ? `🌿 <b>Branch:</b> <code>${session.metadata.gitBranch}</code>\n` : '') +
      '\nPuedes continuar la conversación normalmente.',
      { parse_mode: 'HTML' }
    )
  } catch (error) {
    commandLogger.error(
      `${badge('ERROR', 'rounded')} ${kv({
        cmd: '/resume',
        error: error instanceof Error ? error.message : String(error)
      })}`
    )
    await ctx.reply('❌ Error al restaurar la sesión.')
  }
}

/** /context command - Show context usage stats */
export async function handleContext(ctx: Context): Promise<void> {
  commandLogger.debug(
    `${badge('CMD', 'rounded')} ${kv({
      cmd: '/context',
      user: colorText(String(ctx.from?.id), colors.cyan),
    })}`
  )

  const state = ctx.state as IContextState
  const userId = state?.userId || ctx.from!.id.toString()

  try {
    const messages = (await memoryStore.load(userId)) as IStoredMessage[]
    const sessionId = await memoryStore.getUserLastSessionId(userId)

    const stats = compactionService.getTokenStats(messages.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp
    })))

    await sendMessage(ctx, buildContextStatsMessage({
      sessionId: sessionId || 'none',
      messageCount: messages.length,
      estimatedTokens: stats.totalTokens,
      threshold: stats.threshold,
      percentUsed: stats.percentUsed,
      shouldCompact: stats.shouldCompact
    }))
  } catch (error) {
    commandLogger.error(
      `${badge('ERROR', 'rounded')} ${kv({
        cmd: '/context',
        error: error instanceof Error ? error.message : String(error)
      })}`
    )
    await ctx.reply('❌ Error al obtener estadísticas de contexto.')
  }
}

/** /compact command - Compact session context */
export async function handleCompact(ctx: Context): Promise<void> {
  commandLogger.debug(
    `${badge('CMD', 'rounded')} ${kv({
      cmd: '/compact',
      user: colorText(String(ctx.from?.id), colors.cyan),
    })}`
  )

  const state = ctx.state as IContextState
  const userId = state?.userId || ctx.from!.id.toString()
  const sessionId = await memoryStore.getUserLastSessionId(userId)

  if (!sessionId) {
    await ctx.reply('⚠️ No hay sesión activa para compactar.')
    return
  }

  try {
    // Show compacting indicator
    const statusMsg = await ctx.reply('⏳ Compactando sesión...')

    const result = await compactionService.compact(sessionId, 'manual')

    // Delete status message
    try {
      await ctx.telegram.deleteMessage(ctx.chat!.id, statusMsg.message_id)
    } catch {
      // Ignore delete errors
    }

    await sendMessage(ctx, buildCompactResultMessage(result))
  } catch (error) {
    commandLogger.error(
      `${badge('ERROR', 'rounded')} ${kv({
        cmd: '/compact',
        error: error instanceof Error ? error.message : String(error)
      })}`
    )
    await ctx.reply('❌ Error al compactar la sesión.')
  }
}
