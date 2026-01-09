/**
 * Telegram Bot Integration.
 *
 * Main bot setup with modular handlers.
 */

import 'dotenv/config'
import { Telegraf } from 'telegraf'
import { message, callbackQuery } from 'telegraf/filters'
import { memoryStore } from '../memory/store.js'
import { logger } from '../utils/logger.js'
import { setConfirmationBot } from './confirmations.js'
import type { IContextState } from './types.js'

// Import handlers
import {
  handleStart,
  handleHelp,
  handleMenu,
  handleStatus,
  handleHistory,
  handleCancel,
  handleClear,
  handleCallback,
  handleTextMessage,
  handleBots
} from './handlers/index.js'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const ALLOWED_USERS = process.env.ALLOWED_TELEGRAM_USERS?.split(',').map(Number) || []

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is required')
  process.exit(1)
}

const bot = new Telegraf(BOT_TOKEN)

// Set bot instance for confirmation timeouts
setConfirmationBot(bot)

// Auth middleware
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id

  if (!userId) {
    return
  }

  if (ALLOWED_USERS.length > 0 && !ALLOWED_USERS.includes(userId)) {
    logger.warn(`Unauthorized access attempt from user ${userId}`)
    await ctx.reply('⛔ You are not authorized to use this bot.')
    return
  }

  const state = ctx.state as IContextState
  state.userId = userId.toString()
  state.memory = await memoryStore.load(userId.toString())

  await next()
})

// Commands
bot.command('start', handleStart)
bot.command('help', handleHelp)
bot.command('menu', handleMenu)
bot.command('status', handleStatus)
bot.command('bots', handleBots)
bot.command('history', (ctx) => handleHistory(ctx))
bot.command('cancel', handleCancel)
bot.command('clear', handleClear)

// Callback queries (inline keyboard)
bot.on(callbackQuery('data'), handleCallback)

// Text messages
bot.on(message('text'), handleTextMessage)

// Error handler
bot.catch((err, ctx) => {
  logger.error(`Bot error for ${ctx.updateType}: ${err}`)
})

logger.info('Starting Telegram bot...')

bot.launch()
  .then(() => {
    logger.success('Telegram bot started successfully!')
  })
  .catch((err) => {
    logger.error(`Failed to start bot: ${err}`)
    process.exit(1)
  })

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
