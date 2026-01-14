/**
 * Telegram Bot Integration.
 *
 * Main bot setup with template infrastructure and modular handlers.
 */

import 'dotenv/config'
import { Telegraf } from 'telegraf'
import { message, callbackQuery } from 'telegraf/filters'
import { botLogger, badge, kv, colors, colorText } from './middleware/logging.js'
import { errorHandler } from './middleware/error-handler.js'
import { getInstanceManager } from './utils/instance-manager.js'
import { botManager } from './utils/bot-manager.js'
import { initializeFileLogging } from './config/logging.js'
import { getConfig } from './config/index.js'
import { setConfirmationBot } from './state/confirmations.js'
import { agentStateMiddleware } from './middleware/agent-state.js'
import { initializeSender } from './lib/telegram-sender.js'
import { initializeTelegramLogger, isTelegramLoggingEnabled } from './lib/telegram-logger.js'
import { isErr } from './types/result.js'
import { telegramMessengerService } from '@mks2508/bot-manager-agent'

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

async function main(): Promise<void> {
  const config = getConfig()
  const instanceManager = getInstanceManager(config)

  // Initialize file logging
  initializeFileLogging()

  botLogger.info(
    `${badge('START', 'pill')} ${kv({
      environment: colorText(config.environment, colors.info),
      mode: colorText(config.mode, colors.info),
      instance: colorText(config.instanceName, colors.cyan),
    })}`
  )

  // Instance locking
  const lockResult = await instanceManager.acquireLock()
  if (isErr(lockResult)) {
    botLogger.error('Instance conflict:', lockResult.error?.message ?? 'Unknown error')
    process.exit(1)
  }

  const bot = new Telegraf(config.botToken)
  botManager.setBot(bot)
  setConfirmationBot(bot)

  // Initialize telegram-message-builder integrations
  initializeSender(bot.telegram)
  initializeTelegramLogger(bot.telegram)
  telegramMessengerService.initialize(bot.telegram)

  if (isTelegramLoggingEnabled()) {
    botLogger.info(
      `${badge('LOGGER', 'pill')} ${kv({
        status: colorText('enabled', colors.success),
        target: 'Telegram channel',
      })}`
    )
  }

  // Template middleware stack
  bot.use(errorHandler())
  bot.use(agentStateMiddleware())

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

  // Shutdown handling
  process.once('SIGINT', async () => {
    botLogger.info(`${badge('SHUTDOWN', 'pill')} ${kv({ signal: 'SIGINT' })}`)
    await instanceManager.releaseLock()
    bot.stop('SIGINT')
  })

  process.once('SIGTERM', async () => {
    botLogger.info(`${badge('SHUTDOWN', 'pill')} ${kv({ signal: 'SIGTERM' })}`)
    await instanceManager.releaseLock()
    bot.stop('SIGTERM')
  })

  botLogger.info('Starting Telegram bot...')

  // launch() returns a Promise that resolves when bot STOPS, not when it starts
  // So we log success immediately after calling launch() and handle errors in catch
  bot.launch().catch((err) => {
    botLogger.error(`Failed to start bot:`, err)
    process.exit(1)
  })

  botLogger.success('Telegram bot started successfully!')
}

main().catch((error) => {
  botLogger.critical('Fatal error:', error)
  process.exit(1)
})
