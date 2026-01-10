/**
 * Bot lifecycle and statistics management.
 */

import type { Telegraf } from 'telegraf'
import type { BotStatus, BotStats } from '../types/bot.js'
import { ok, type Result, err } from '../types/result.js'
import { botLogger, badge, kv, colors, colorText } from '../middleware/logging.js'
import { getConfig } from '../config/index.js'

interface BotError {
  code: string
  message: string
}

function botError(code: string, message: string): BotError {
  return { code, message }
}

class BotManager {
  private bot: Telegraf | null = null
  private startTime: number | null = null
  private stats: BotStats = {
    messagesProcessed: 0,
    commandsExecuted: 0,
    errorsEncountered: 0,
    uptimeStart: 0,
    lastActivity: 0,
  }

  constructor() {
    this.stats.uptimeStart = Date.now()
  }

  setBot(bot: Telegraf): void {
    this.bot = bot
    this.startTime = Date.now()

    botLogger.info(
      `${badge('BOT', 'pill')} ${kv({
        status: colorText('set', colors.success),
      })}`
    )
  }

  getStatus(): Result<BotStatus, BotError> {
    const config = getConfig()
    const uptime = this.startTime ? Date.now() - this.startTime : 0

    return ok({
      status: this.bot ? 'running' : 'stopped',
      mode: config.mode,
      startTime: this.startTime,
      uptime,
      memoryUsage: process.memoryUsage(),
    })
  }

  getStats(): Result<BotStats, BotError> {
    return ok({ ...this.stats })
  }

  incrementMessages(): void {
    this.stats.messagesProcessed++
    this.stats.lastActivity = Date.now()

    botLogger.debug(
      `${badge('STATS', 'rounded')} ${kv({
        messages: this.stats.messagesProcessed,
      })}`
    )
  }

  incrementCommands(): void {
    this.stats.commandsExecuted++
    this.stats.lastActivity = Date.now()

    botLogger.debug(
      `${badge('STATS', 'rounded')} ${kv({
        commands: this.stats.commandsExecuted,
      })}`
    )
  }

  incrementErrors(): void {
    this.stats.errorsEncountered++
    this.stats.lastActivity = Date.now()

    botLogger.debug(
      `${badge('STATS', 'rounded')} ${kv({
        errors: this.stats.errorsEncountered,
      })}`
    )
  }

  resetStats(): Result<void, BotError> {
    const oldStats = { ...this.stats }

    this.stats = {
      messagesProcessed: 0,
      commandsExecuted: 0,
      errorsEncountered: 0,
      uptimeStart: Date.now(),
      lastActivity: 0,
    }
    this.startTime = Date.now()

    botLogger.info(
      `${badge('STATS', 'rounded')} ${kv({
        action: colorText('reset', colors.warning),
        previous: kv({
          messages: oldStats.messagesProcessed,
          commands: oldStats.commandsExecuted,
          errors: oldStats.errorsEncountered,
        }),
      })}`
    )

    return ok(undefined)
  }

  authorize(userId: number): Result<void, BotError> {
    const config = getConfig()

    if (!config.authorizedUserIds.has(userId)) {
      return err(botError('UNAUTHORIZED', `User ${userId} is not authorized`))
    }

    return ok(undefined)
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

export const botManager = new BotManager()
