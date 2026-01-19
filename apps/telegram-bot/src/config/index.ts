/**
 * Configuration management.
 */

import { loadEnvConfig } from './env.js'
import type { BotConfig } from '../types/bot.js'
import { EnvKeys } from '../types/constants.js'

let cachedConfig: BotConfig | null = null

export function getConfig(): BotConfig {
  if (cachedConfig) {
    return cachedConfig
  }

  const envConfig = loadEnvConfig()

  const authorizedUserIds = new Set<number>()
  const userIds = process.env[EnvKeys.TG_AUTHORIZED_USER_IDS]
  if (userIds) {
    userIds.split(',').forEach((id) => {
      const num = parseInt(id.trim(), 10)
      if (!isNaN(num)) {
        authorizedUserIds.add(num)
      }
    })
  }

  cachedConfig = {
    ...envConfig,
    authorizedUserIds,
  }

  return cachedConfig
}

export function updateConfig(updates: Partial<BotConfig>): BotConfig {
  cachedConfig = {
    ...getConfig(),
    ...updates,
  }

  return cachedConfig
}

export function getLogTopicIds(): { chatId: string; topicId?: number } | null {
  const config = getConfig()
  if (!config.logChatId) {
    return null
  }
  return {
    chatId: config.logChatId,
    topicId: config.logTopicId,
  }
}

export function getControlTopicIds(): { chatId: string; topicId?: number } | null {
  const config = getConfig()
  if (!config.controlChatId) {
    return null
  }
  return {
    chatId: config.controlChatId,
    topicId: config.controlTopicId,
  }
}

export function isAuthorized(userId: number): boolean {
  const config = getConfig()
  return config.authorizedUserIds.has(userId)
}

export function hasLoggingConfigured(): boolean {
  return getLogTopicIds() !== null
}

export function hasControlConfigured(): boolean {
  return getControlTopicIds() !== null
}
