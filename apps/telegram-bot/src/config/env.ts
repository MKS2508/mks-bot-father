/**
 * Environment configuration.
 */

import { z } from 'zod'
import { BotTimeouts, BotLimits } from '../types/constants.js'

export enum Environment {
  LOCAL = 'local',
  STAGING = 'staging',
  PRODUCTION = 'production',
}

export interface EnvConfig {
  botToken: string
  mode: 'polling' | 'webhook'
  webhookUrl?: string
  webhookSecret?: string
  logChatId?: string
  logTopicId?: number
  controlChatId?: string
  controlTopicId?: number
  logLevel: 'debug' | 'info' | 'warn' | 'error'

  // Environment identification
  environment: Environment
  instanceName: string
  instanceId?: string

  // Instance detection
  instanceCheck: boolean

  // Agent-specific
  anthropicApiKey?: string
  githubToken?: string
  coolifyUrl?: string
  coolifyToken?: string
}

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TG_MODE: z.enum(['polling', 'webhook']).default('polling'),
  TG_WEBHOOK_URL: z.string().url().optional(),
  TG_WEBHOOK_SECRET: z.string().min(16).optional(),
  TG_LOG_CHAT_ID: z.string().optional(),
  TG_LOG_TOPIC_ID: z.coerce.number().min(1).optional(),
  TG_CONTROL_CHAT_ID: z.string().optional(),
  TG_CONTROL_TOPIC_ID: z.coerce.number().min(1).optional(),
  ALLOWED_TELEGRAM_USERS: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Environment identification
  TG_ENV: z.enum(['local', 'staging', 'production']).default('local'),
  TG_INSTANCE_NAME: z.string().default('telegram-bot'),
  TG_INSTANCE_ID: z.string().optional(),

  // Instance detection
  TG_INSTANCE_CHECK: z.coerce.boolean().default(true),

  // Agent-specific
  ANTHROPIC_API_KEY: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
  COOLIFY_URL: z.string().optional(),
  COOLIFY_TOKEN: z.string().optional(),
}).refine((data) => {
  // Webhook URL validation when mode is webhook
  if (data.TG_MODE === 'webhook' && !data.TG_WEBHOOK_URL) {
    return false
  }
  return true
}, {
  message: 'TG_WEBHOOK_URL is required when TG_MODE=webhook',
})

/**
 * Loads and validates environment variables.
 */
export function loadEnvConfig(): EnvConfig {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const errors = result.error.errors.map((e) => `  ${e.path.join('.')}: ${e.message}`).join('\n')
    throw new Error(`Invalid environment variables:\n${errors}`)
  }

  const env = result.data

  return {
    botToken: env.TELEGRAM_BOT_TOKEN,
    mode: env.TG_MODE,
    webhookUrl: env.TG_WEBHOOK_URL,
    webhookSecret: env.TG_WEBHOOK_SECRET,
    logChatId: env.TG_LOG_CHAT_ID,
    logTopicId: env.TG_LOG_TOPIC_ID,
    controlChatId: env.TG_CONTROL_CHAT_ID,
    controlTopicId: env.TG_CONTROL_TOPIC_ID,
    logLevel: env.LOG_LEVEL,

    // Environment identification
    environment: env.TG_ENV as Environment,
    instanceName: env.TG_INSTANCE_NAME,
    instanceId: env.TG_INSTANCE_ID,

    // Instance detection
    instanceCheck: env.TG_INSTANCE_CHECK,

    // Agent-specific
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    githubToken: env.GITHUB_TOKEN,
    coolifyUrl: env.COOLIFY_URL,
    coolifyToken: env.COOLIFY_TOKEN,
  }
}
