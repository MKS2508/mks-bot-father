/**
 * @mks2508/mks-bot-father
 *
 * Complete pipeline for Telegram bot automation:
 * BotFather + GitHub + Coolify deployment
 *
 * @module
 * @example
 * ```typescript
 * import { Pipeline, ConfigManager, GitHubManager, CoolifyManager } from '@mks2508/mks-bot-father'
 *
 * // Configure
 * const config = new ConfigManager()
 * config.set('github.token', 'ghp_xxx')
 * config.set('coolify.url', 'https://coolify.example.com')
 * config.set('coolify.token', 'xxx')
 *
 * // Run pipeline
 * const pipeline = new Pipeline()
 * const result = await pipeline.run({
 *   botName: 'my-awesome-bot',
 *   createGitHubRepo: true,
 *   deployToCoolify: true,
 * })
 *
 * console.log(result.githubRepoUrl)
 * console.log(result.coolifyAppUuid)
 * ```
 */

// Config
export { ConfigManager, getConfigManager, CONFIG_DIR, CONFIG_FILE } from './config/index.js'

// GitHub
export { GitHubManager, getGitHubManager } from './github/index.js'

// Coolify
export { CoolifyManager, getCoolifyManager } from './coolify/index.js'

// Pipeline
export { Pipeline, getPipeline } from './pipeline.js'

// Types
export type {
  Config,
  IGitHubRepoOptions,
  IGitHubRepoResult,
  ICoolifyDeployOptions,
  ICoolifyDeployResult,
  ICoolifyAppOptions,
  ICoolifyAppResult,
  IPipelineOptions,
  IPipelineResult,
  Environment,
} from './types.js'

export { ConfigSchema } from './types.js'

// Version
export const version = '0.1.0'
