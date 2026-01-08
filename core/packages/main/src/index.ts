/**
 * @mks2508/mks-bot-father
 *
 * Complete pipeline for Telegram bot automation:
 * BotFather + GitHub + Coolify deployment.
 *
 * @module
 *
 * @example
 * ```typescript
 * import {
 *   getPipeline,
 *   getConfigService,
 *   getGitHubService,
 *   getCoolifyService,
 *   getBotFatherService,
 * } from '@mks2508/mks-bot-father'
 *
 * // Configure
 * const config = getConfigService()
 * config.set('github.token', 'ghp_xxx')
 * config.set('coolify.url', 'https://coolify.example.com')
 * config.set('coolify.token', 'xxx')
 *
 * // Run full pipeline
 * const pipeline = getPipeline()
 * const result = await pipeline.run({
 *   botName: 'my-awesome-bot',
 *   createGitHubRepo: true,
 *   deployToCoolify: true,
 * })
 *
 * if (result.isOk()) {
 *   console.log(result.value.githubRepoUrl)
 *   console.log(result.value.coolifyAppUuid)
 * }
 *
 * // Or use individual services
 * const github = getGitHubService()
 * await github.init()
 * const repoResult = await github.createRepo({ name: 'my-repo' })
 *
 * if (repoResult.isOk()) {
 *   console.log('Created:', repoResult.value.repoUrl)
 * }
 * ```
 */

// Types
export * from './types/index.js'

// Services
export {
  ConfigService,
  getConfigService,
  CONFIG_DIR,
  CONFIG_FILE,
} from './services/config.service.js'

export {
  GitHubService,
  getGitHubService,
} from './services/github.service.js'

export {
  CoolifyService,
  getCoolifyService,
  type ICoolifyServer,
  type ICoolifyDestination,
} from './services/coolify.service.js'

export {
  BotFatherService,
  getBotFatherService,
  type IBotCreateOptions,
  type IBotCreateResult,
} from './services/botfather.service.js'

// Pipeline
export { Pipeline, getPipeline } from './pipeline/index.js'

// Utils
export { createLogger } from './utils/index.js'

// Version
export const version = '0.1.0'
