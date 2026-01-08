/**
 * Service exports for mks-bot-father.
 *
 * @module
 */

export {
  ConfigService,
  getConfigService,
  CONFIG_DIR,
  CONFIG_FILE,
} from './config.service.js'

export {
  GitHubService,
  getGitHubService,
} from './github.service.js'

export {
  CoolifyService,
  getCoolifyService,
  type ICoolifyServer,
  type ICoolifyDestination,
} from './coolify.service.js'

export {
  BotFatherService,
  getBotFatherService,
  type IBotCreateOptions,
  type IBotCreateResult,
} from './botfather.service.js'
