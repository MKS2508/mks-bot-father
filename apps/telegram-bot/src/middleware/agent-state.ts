/**
 * Agent-specific state middleware.
 */

import type { Context, Middleware } from 'telegraf'
import { memoryStore } from '@mks2508/bot-manager-agent/memory/store'
import type { IContextState } from '../types/agent.js'
import { agentLogger, badge, kv, colors, colorText } from './logging.js'

export function agentStateMiddleware(): Middleware<Context> {
  return async (ctx, next) => {
    if (!ctx.from?.id) {
      return
    }

    const userId = ctx.from.id.toString()
    const state = ctx.state as IContextState

    state.userId = userId
    state.memory = await memoryStore.load(userId)

    agentLogger.debug(
      `${badge('STATE', 'rounded')} ${kv({
        user: colorText(userId, colors.cyan),
        memories: String(state.memory?.length || 0),
      })}`
    )

    return next()
  }
}
