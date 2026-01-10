/**
 * Error handling middleware.
 */

import type { Context, Middleware } from 'telegraf'
import { botManager } from '../utils/bot-manager.js'
import { botLogger, badge, kv, colors, colorText } from './logging.js'

export function errorHandler<T extends Context>(): Middleware<T> {
  return async (ctx, next) => {
    try {
      return await next()
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      const errorMsg = err.message || 'Unknown error occurred'

      botLogger.error(
        `${badge('ERROR', 'rounded')} ${kv({
          error: colorText(errorMsg, colors.error),
          type: err.name,
          user: ctx.from?.id ?? 'unknown',
          chat: ctx.chat?.id ?? 'unknown',
        })}`,
        err
      )

      const message = `❌ *Error:*\n${errorMsg}`

      try {
        await ctx.reply(message, { parse_mode: 'Markdown' })
      } catch (replyError) {
        botLogger.critical(
          `${badge('CRITICAL', 'rounded')} ${kv({
            error: 'Failed to send error message to user',
            originalError: errorMsg,
            replyError: replyError instanceof Error ? replyError.message : String(replyError),
          })}`
        )
      }

      botManager.incrementErrors()
    }
  }
}
