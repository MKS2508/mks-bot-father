/**
 * Configuration types and schemas for mks-bot-father.
 *
 * @module
 */

import { type } from 'arktype'

/**
 * GitHub configuration schema.
 */
export const GitHubConfigSchema = type({
  'token?': 'string',
  'useGhCli?': 'boolean',
  'defaultOrg?': 'string',
  'defaultVisibility?': '"public" | "private"',
})

/**
 * GitHub configuration type.
 */
export type IGitHubConfig = typeof GitHubConfigSchema.infer

/**
 * Coolify configuration schema.
 */
export const CoolifyConfigSchema = type({
  'url?': 'string',
  'token?': 'string',
  'defaultServer?': 'string',
  'defaultDestination?': 'string',
  'defaultProject?': 'string',
  'defaultEnvironment?': 'string',
})

/**
 * Coolify configuration type.
 */
export type ICoolifyConfig = typeof CoolifyConfigSchema.infer

/**
 * Telegram credentials schema.
 */
export const TelegramConfigSchema = type({
  'apiId?': 'number',
  'apiHash?': 'string',
})

/**
 * Telegram configuration type.
 */
export type ITelegramConfig = typeof TelegramConfigSchema.infer

/**
 * Main configuration schema.
 */
export const ConfigSchema = type({
  'github?': GitHubConfigSchema,
  'coolify?': CoolifyConfigSchema,
  'telegram?': TelegramConfigSchema,
})

/**
 * Main configuration type.
 */
export type IConfig = typeof ConfigSchema.infer

/**
 * Environment type for bot configurations.
 */
export type Environment = 'local' | 'staging' | 'production'
