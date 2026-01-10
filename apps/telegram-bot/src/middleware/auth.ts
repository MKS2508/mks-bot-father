/**
 * Authentication middleware.
 */

import type { Context, Middleware } from 'telegraf'
import { botLogger, badge, kv, colors, colorText } from './logging.js'
import { botManager } from '../utils/bot-manager.js'

export function auth(): Middleware<Context> {
  return async (ctx, next) => {
    if (!ctx.from?.id) {
      botLogger.warn(
        `${badge('AUTH', 'rounded')} ${kv({
          status: colorText('FAILED', colors.warning),
          reason: 'no user ID',
        })}`
      )
      return
    }

    const authResult = botManager.authorize(ctx.from.id)

    if (!authResult.ok) {
      botLogger.warn(
        `${badge('AUTH', 'rounded')} ${kv({
          status: colorText('DENIED', colors.error),
          user: ctx.from.id,
          username: ctx.from.username ?? 'no-username',
          reason: authResult.error.message,
        })}`
      )
      await ctx.reply(`⛔ ${authResult.error.message}`)
      return
    }

    botLogger.debug(
      `${badge('AUTH', 'rounded')} ${kv({
        status: colorText('GRANTED', colors.success),
        user: ctx.from.id,
      })}`
    )

    return next()
  }
}
