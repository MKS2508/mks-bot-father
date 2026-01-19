/**
 * TelegrafSender singleton wrapper.
 * Provides centralized message sending with telegram-message-builder integration.
 */

import type { Telegram } from 'telegraf'
import { TelegrafSender } from '@mks2508/telegram-message-builder-telegraf'

let senderInstance: TelegrafSender | null = null

/**
 * Initialize the TelegrafSender with the bot's Telegram instance.
 * Must be called once during bot startup.
 */
export function initializeSender(telegram: Telegram): TelegrafSender {
  senderInstance = new TelegrafSender(telegram)
  return senderInstance
}

/**
 * Get the initialized TelegrafSender instance.
 * @throws Error if sender has not been initialized
 */
export function getSender(): TelegrafSender {
  if (!senderInstance) {
    throw new Error('TelegrafSender not initialized. Call initializeSender first.')
  }
  return senderInstance
}

/**
 * Check if the sender has been initialized.
 */
export function isSenderInitialized(): boolean {
  return senderInstance !== null
}
