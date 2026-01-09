/**
 * /bots Command Handler.
 */
import type { Context } from 'telegraf'
import { executePrompt } from './messages.js'

/** /bots command - list all bots via agent */
export async function handleBots(ctx: Context): Promise<void> {
  await executePrompt(ctx, 'List all my bots with their tokens', true)
}
