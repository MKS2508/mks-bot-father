/**
 * Telegram Channel Logger.
 * Sends logs to a configured Telegram channel using LogViewer.
 */

import type { Telegram } from 'telegraf'
import { LogViewer, RateLimiter } from '@mks2508/telegram-message-builder-telegraf'
import type { ILogEntry, IRateLimiterConfig, IPaginationConfig } from '@mks2508/telegram-message-builder-telegraf'
import { loadEnvConfig } from '../config/env.js'

type LogLevel = 'info' | 'success' | 'error' | 'warn' | 'debug'

let logViewerInstance: LogViewer | null = null
let isEnabled = false
let logChatId: number | null = null
let logTopicId: number | undefined = undefined
let telegramInstance: Telegram | null = null

/**
 * Initialize the Telegram logger with the bot's Telegram instance.
 * Only enables if TG_LOG_CHAT_ID is configured in environment.
 */
export function initializeTelegramLogger(telegram: Telegram): void {
  const config = loadEnvConfig()

  if (!config.logChatId) {
    return
  }

  telegramInstance = telegram
  logChatId = parseInt(config.logChatId, 10)
  logTopicId = config.logTopicId

  const rateLimiterConfig: IRateLimiterConfig = {
    groupLimit: 20,
    groupInterval: 60000,
    globalLimit: 30,
    globalInterval: 1000
  }

  const rateLimiter = new RateLimiter(rateLimiterConfig)

  const paginationConfig: IPaginationConfig = {
    type: 'inline',
    maxLines: 100,
    linesPerPage: 15,
    showLineNumbers: true
  }

  logViewerInstance = new LogViewer(telegram, paginationConfig, rateLimiter)
  isEnabled = true
}

/**
 * Add a log entry to the Telegram logger buffer.
 * Logs are batched and sent periodically or on flush.
 */
export function logToTelegram(
  level: LogLevel,
  message: string,
  metadata?: Record<string, unknown>
): void {
  if (!isEnabled || !logViewerInstance) return

  const entry: ILogEntry = {
    level,
    timestamp: new Date(),
    message,
    metadata
  }

  logViewerInstance.addLog(entry)
}

/**
 * Flush all buffered logs to the Telegram channel.
 * Displays the first page of logs.
 */
export async function flushTelegramLogs(): Promise<void> {
  if (!isEnabled || !logViewerInstance || !logChatId) return

  try {
    await logViewerInstance.display(logChatId, logTopicId, 1)
  } catch (error) {
    console.error('Failed to flush logs to Telegram:', error)
  }
}

/**
 * Send a single formatted log message directly to the Telegram channel.
 * Bypasses the LogViewer buffer for immediate delivery.
 */
export async function sendLogMessage(
  level: LogLevel,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (!isEnabled || !telegramInstance || !logChatId) return

  const icons: Record<LogLevel, string> = {
    info: 'i',
    success: '✓',
    error: '✗',
    warn: '⚠',
    debug: '?'
  }

  const icon = icons[level] || 'i'
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false })
  let text = `<b>[${timestamp}]</b> ${icon} ${escapeHtml(message)}`

  if (metadata && Object.keys(metadata).length > 0) {
    const metaStr = Object.entries(metadata)
      .map(([k, v]) => `<code>${k}</code>: ${escapeHtml(String(v))}`)
      .join('\n')
    text += `\n\n${metaStr}`
  }

  try {
    const params: Record<string, unknown> = {
      parse_mode: 'HTML'
    }
    if (logTopicId) {
      params.message_thread_id = logTopicId
    }
    await telegramInstance.sendMessage(logChatId, text, params)
  } catch (error) {
    console.error('Failed to send log to Telegram:', error)
  }
}

/**
 * Check if Telegram logging is enabled and configured.
 */
export function isTelegramLoggingEnabled(): boolean {
  return isEnabled
}

/**
 * Get the configured log chat ID.
 */
export function getLogChatId(): number | null {
  return logChatId
}

/**
 * Escape HTML special characters.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
