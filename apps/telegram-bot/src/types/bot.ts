/**
 * Bot-related types.
 */

export type BotMode = 'polling' | 'webhook'

export interface BotStatus {
  status: 'running' | 'stopped'
  mode: BotMode
  startTime: number | null
  uptime: number
  memoryUsage: NodeJS.MemoryUsage
}

export interface BotStats {
  messagesProcessed: number
  commandsExecuted: number
  errorsEncountered: 0
  uptimeStart: number
  lastActivity: number
}

export interface BotConfig {
  // Bot configuration
  botToken: string
  mode: BotMode
  webhookUrl?: string
  webhookSecret?: string
  logChatId?: string
  logTopicId?: number
  controlChatId?: string
  controlTopicId?: number
  logLevel: 'debug' | 'info' | 'warn' | 'error'

  // Environment identification
  environment: 'local' | 'staging' | 'production'
  instanceName: string
  instanceId?: string

  // Instance detection
  instanceCheck: boolean

  // Authorization
  authorizedUserIds: Set<number>

  // Agent-specific
  anthropicApiKey?: string
  githubToken?: string
  coolifyUrl?: string
  coolifyToken?: string
}
