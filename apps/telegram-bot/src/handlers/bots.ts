/**
 * /bots Command Handler with template logging.
 */
import type { Context } from 'telegraf'
import { commandLogger, badge, kv, colors, colorText } from '../middleware/logging.js'
import { executePrompt } from './agent.js'

/** /bots command - list all bots via agent */
export async function handleBots(ctx: Context): Promise<void> {
  commandLogger.debug(
    `${badge('CMD', 'rounded')} ${kv({
      cmd: '/bots',
      user: colorText(String(ctx.from?.id), colors.cyan),
    })}`
  )

  await executePrompt(ctx, 'List all my bots with their tokens', true)
}
