/**
 * Confirmation Dialog Management.
 */
import type { Context, Telegraf } from 'telegraf'
import type { IPendingConfirmation, DangerousOperation } from '../types/agent.js'
import { confirmationKeyboard } from '../keyboards.js'
import { botLogger } from '../middleware/logging.js'
import {
  buildConfirmationMessage,
  buildConfirmationResultMessage,
  buildExpirationMessage
} from '../utils/formatters.js'
import { sendMessage } from '../lib/message-helper.js'

/** Confirmation timeout in milliseconds (60 seconds) */
const CONFIRMATION_TIMEOUT = 60_000

/** In-memory store for pending confirmations */
const pendingConfirmations = new Map<string, IPendingConfirmation>()

/** Store bot instance for timeout handling */
let botInstance: Telegraf | null = null

/** Set bot instance for timeout callbacks */
export function setConfirmationBot(bot: Telegraf): void {
  botInstance = bot
}

/** Generate unique confirmation ID */
function generateConfirmationId(): string {
  return `conf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Patterns to detect dangerous operations */
const DANGEROUS_PATTERNS: Array<{ pattern: RegExp; operation: DangerousOperation }> = [
  { pattern: /\bcreate\s+(a\s+)?bot\b/i, operation: 'create_bot' },
  { pattern: /\bcreate\s+(a\s+)?(github\s+)?repo(sitory)?\b/i, operation: 'create_repo' },
  { pattern: /\bdeploy\b/i, operation: 'deploy' },
  { pattern: /\bpush\b/i, operation: 'commit_push' },
  { pattern: /\bcommit\b/i, operation: 'commit_push' },
  { pattern: /\bdelete\s+(a\s+)?bot\b/i, operation: 'delete_bot' }
]

/** Check if prompt requires confirmation */
export function requiresConfirmation(prompt: string): DangerousOperation | null {
  for (const { pattern, operation } of DANGEROUS_PATTERNS) {
    if (pattern.test(prompt)) {
      return operation
    }
  }
  return null
}


/** Create confirmation dialog */
export async function createConfirmation(
  ctx: Context,
  operation: DangerousOperation,
  prompt: string,
  operationData: Record<string, unknown> = {}
): Promise<string> {
  const id = generateConfirmationId()
  const userId = ctx.from!.id.toString()
  const chatId = ctx.chat!.id

  const warningMessage = buildConfirmationMessage(operation, prompt)
  const messageId = await sendMessage(ctx, warningMessage, {
    keyboard: confirmationKeyboard(id).reply_markup
  })

  const expiresAt = new Date(Date.now() + CONFIRMATION_TIMEOUT)

  const timeoutId = setTimeout(async () => {
    await expireConfirmation(chatId, id)
  }, CONFIRMATION_TIMEOUT)

  const confirmation: IPendingConfirmation = {
    id,
    chatId,
    messageId: messageId ?? 0,
    userId,
    operation,
    operationData,
    prompt,
    createdAt: new Date(),
    expiresAt,
    timeoutId
  }

  pendingConfirmations.set(id, confirmation)
  botLogger.info(`Created confirmation ${id} for ${operation}`)

  return id
}

/** Process confirmation callback */
export async function processConfirmation(
  ctx: Context,
  confirmationId: string,
  confirmed: boolean
): Promise<{ confirmed: boolean; prompt?: string; operation?: DangerousOperation }> {
  const confirmation = pendingConfirmations.get(confirmationId)

  if (!confirmation) {
    await ctx.answerCbQuery('⚠️ Confirmation expired or not found')
    return { confirmed: false }
  }

  // Verify user
  if (ctx.from!.id.toString() !== confirmation.userId) {
    await ctx.answerCbQuery('⚠️ This confirmation is not for you')
    return { confirmed: false }
  }

  // Clear timeout
  clearTimeout(confirmation.timeoutId)
  pendingConfirmations.delete(confirmationId)

  if (confirmed) {
    await ctx.answerCbQuery('✅ Confirmed!')
    const msg = buildConfirmationResultMessage(true, confirmation.prompt)
    await ctx.editMessageText(msg.text || '', { parse_mode: 'HTML' })
    return {
      confirmed: true,
      prompt: confirmation.prompt,
      operation: confirmation.operation
    }
  } else {
    await ctx.answerCbQuery('❌ Cancelled')
    const msg = buildConfirmationResultMessage(false, confirmation.prompt)
    await ctx.editMessageText(msg.text || '', { parse_mode: 'HTML' })
    return { confirmed: false }
  }
}

/** Expire confirmation after timeout */
async function expireConfirmation(chatId: number, confirmationId: string): Promise<void> {
  const confirmation = pendingConfirmations.get(confirmationId)

  if (!confirmation) return

  pendingConfirmations.delete(confirmationId)

  if (!botInstance) {
    botLogger.warn('Bot instance not set for confirmation timeout')
    return
  }

  try {
    const msg = buildExpirationMessage(confirmation.prompt)
    await botInstance.telegram.editMessageText(
      chatId,
      confirmation.messageId,
      undefined,
      msg.text || '',
      { parse_mode: 'HTML' }
    )
  } catch (error) {
    botLogger.debug(`Failed to update expired confirmation: ${error}`)
  }
}

/** Get pending confirmation by ID */
export function getConfirmation(id: string): IPendingConfirmation | undefined {
  return pendingConfirmations.get(id)
}

/** Clear all confirmations for user */
export function clearUserConfirmations(userId: string): void {
  for (const [id, confirmation] of pendingConfirmations) {
    if (confirmation.userId === userId) {
      clearTimeout(confirmation.timeoutId)
      pendingConfirmations.delete(id)
    }
  }
}

/** Get pending confirmations count for user */
export function getUserConfirmationsCount(userId: string): number {
  let count = 0
  for (const confirmation of pendingConfirmations.values()) {
    if (confirmation.userId === userId) {
      count++
    }
  }
  return count
}

/** Check if user has pending confirmations */
export function hasPendingConfirmation(userId: string): boolean {
  for (const confirmation of pendingConfirmations.values()) {
    if (confirmation.userId === userId) {
      return true
    }
  }
  return false
}
