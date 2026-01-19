/**
 * Unified message sending helper using TelegramMessageBuilder.
 * Abstracts TelegrafSender with fallback to ctx.reply.
 */

import type { Context } from 'telegraf'
import type { InlineKeyboardMarkup } from 'telegraf/types'
import type { TelegramMessage, IInlineKeyboardMarkup } from '@mks2508/telegram-message-builder'
import { isOk } from '@mks2508/telegram-message-builder-utils'
import { getSender, isSenderInitialized } from './telegram-sender.js'

interface SendOptions {
  keyboard?: InlineKeyboardMarkup
  threadId?: number
}

/**
 * Send a TelegramMessage using TelegrafSender with fallback to ctx.reply.
 * Always uses HTML parse mode.
 */
export async function sendMessage(
  ctx: Context,
  message: TelegramMessage,
  options?: SendOptions
): Promise<number | undefined> {
  const chatId = ctx.chat?.id
  if (!chatId) return undefined

  if (isSenderInitialized()) {
    try {
      const sender = getSender()
      const result = await sender.send(chatId, message, {
        keyboard: options?.keyboard as IInlineKeyboardMarkup | undefined
      })

      if (isOk(result)) {
        return result.value.messageId
      }
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback to direct reply with HTML
  const reply = await ctx.reply(message.text || '', {
    parse_mode: 'HTML',
    reply_markup: options?.keyboard,
    message_thread_id: options?.threadId
  })

  return reply.message_id
}

/**
 * Edit a message with TelegramMessage content.
 * Always uses HTML parse mode.
 */
export async function editMessage(
  ctx: Context,
  messageId: number,
  message: TelegramMessage,
  options?: SendOptions
): Promise<boolean> {
  const chatId = ctx.chat?.id
  if (!chatId) return false

  try {
    await ctx.telegram.editMessageText(
      chatId,
      messageId,
      undefined,
      message.text || '',
      {
        parse_mode: 'HTML',
        reply_markup: options?.keyboard
      }
    )
    return true
  } catch {
    return false
  }
}

/**
 * Delete a message safely.
 */
export async function deleteMessage(
  ctx: Context,
  messageId: number
): Promise<boolean> {
  const chatId = ctx.chat?.id
  if (!chatId) return false

  try {
    await ctx.telegram.deleteMessage(chatId, messageId)
    return true
  } catch {
    return false
  }
}
