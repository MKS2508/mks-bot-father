/**
 * Telegram Bot Integration.
 *
 * Provides a Telegram interface to the Bot Manager Agent.
 */

import 'dotenv/config'
import { Telegraf } from 'telegraf'
import { message } from 'telegraf/filters'
import { runAgent } from '../agent.js'
import { memoryStore } from '../memory/store.js'
import { logger } from '../utils/logger.js'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const ALLOWED_USERS = process.env.ALLOWED_TELEGRAM_USERS?.split(',').map(Number) || []

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is required')
  process.exit(1)
}

const bot = new Telegraf(BOT_TOKEN)

interface ContextState {
  userId: string
  memory: unknown[]
}

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

  const state = ctx.state as ContextState
  state.userId = userId.toString()
  state.memory = await memoryStore.load(userId.toString())

  await next()
})

bot.command('start', async (ctx) => {
  await ctx.reply(
    `🤖 *Bot Manager Agent*\n\n` +
    `I can help you manage Telegram bots, GitHub repos, and Coolify deployments.\n\n` +
    `*Commands:*\n` +
    `/help - Show available commands\n` +
    `/status - Check service status\n` +
    `/bots - List your bots\n` +
    `/clear - Clear conversation history\n\n` +
    `Just send me a message describing what you want to do!`,
    { parse_mode: 'Markdown' }
  )
})

bot.command('help', async (ctx) => {
  await ctx.reply(
    `*Available Commands:*\n\n` +
    `/start - Welcome message\n` +
    `/help - This help message\n` +
    `/status - Check configured services\n` +
    `/bots - List all your bots\n` +
    `/clear - Clear conversation history\n\n` +
    `*Example requests:*\n` +
    `• "Create a bot called my-bot"\n` +
    `• "Deploy my-bot to Coolify"\n` +
    `• "List my bots"\n` +
    `• "Clone repo and run tests"`,
    { parse_mode: 'Markdown' }
  )
})

bot.command('status', async (ctx) => {
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
})

bot.command('bots', async (ctx) => {
  const processingMsg = await ctx.reply('🔍 Fetching bots...')

  try {
    const result = await runAgent('List all my bots', {
      maxTurns: 10
    })

    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id)

    if (result.success && result.result) {
      await ctx.reply(result.result)
    } else {
      await ctx.reply('❌ Failed to list bots: ' + (result.errors[0] || 'Unknown error'))
    }
  } catch (error) {
    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id)
    await ctx.reply('❌ Error: ' + (error instanceof Error ? error.message : String(error)))
  }
})

bot.command('clear', async (ctx) => {
  const state = ctx.state as ContextState
  const userId = state.userId
  await memoryStore.clear(userId)
  await ctx.reply('🗑️ Conversation history cleared.')
})

bot.on(message('text'), async (ctx) => {
  const userMessage = ctx.message.text
  const state = ctx.state as ContextState
  const userId = state.userId

  if (userMessage.startsWith('/')) {
    return
  }

  logger.info(`Message from ${userId}: ${userMessage.slice(0, 100)}...`)

  const processingMsg = await ctx.reply('🤔 Processing your request...')

  try {
    await memoryStore.append(userId, {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    })

    const result = await runAgent(userMessage, {
      maxTurns: 30,
      onMessage: async (msg) => {
        const typedMsg = msg as { type: string; tool_name?: string }
        if (typedMsg.type === 'tool_call' && typedMsg.tool_name) {
          try {
            await ctx.telegram.editMessageText(
              ctx.chat.id,
              processingMsg.message_id,
              undefined,
              `🔧 ${typedMsg.tool_name}...`
            )
          } catch {
            // Ignore edit errors
          }
        }
      }
    })

    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id)

    if (result.success && result.result) {
      const maxLength = 4000
      const response = result.result

      if (response.length > maxLength) {
        const parts = response.match(new RegExp(`.{1,${maxLength}}`, 'gs')) || []
        for (const part of parts) {
          await ctx.reply(part)
        }
      } else {
        await ctx.reply(response)
      }

      await memoryStore.append(userId, {
        role: 'assistant',
        content: result.result,
        timestamp: new Date().toISOString()
      })
    } else {
      const errorMsg = result.errors[0] || 'Task could not be completed'
      await ctx.reply(`❌ ${errorMsg}`)
    }

    await ctx.reply(
      `📊 _Tokens: ${result.usage.inputTokens}/${result.usage.outputTokens} | ` +
      `Cost: $${result.usage.totalCostUsd.toFixed(4)} | ` +
      `Time: ${(result.durationMs / 1000).toFixed(1)}s_`,
      { parse_mode: 'Markdown' }
    )

  } catch (error) {
    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id)

    const errorMsg = error instanceof Error ? error.message : String(error)
    logger.error(`Error processing message: ${errorMsg}`)

    await ctx.reply(`❌ Error: ${errorMsg}`)
  }
})

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
