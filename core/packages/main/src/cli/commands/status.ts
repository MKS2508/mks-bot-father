/**
 * Status command for mks-bot-father CLI.
 *
 * @module
 */

import chalk from 'chalk'
import { isOk } from '@mks2508/no-throw'
import { getConfigService, ConfigService } from '../../services/config.service.js'
import { getGitHubService } from '../../services/github.service.js'
import { getCoolifyService } from '../../services/coolify.service.js'

export async function handleStatus(): Promise<void> {
  const config = getConfigService()
  const github = getGitHubService()
  const coolify = getCoolifyService()

  console.log()
  console.log(chalk.cyan.bold('📋 Configuration Status'))
  console.log()

  // GitHub
  const tokenResult = await config.resolveGitHubToken()
  if (isOk(tokenResult) && tokenResult.value) {
    const initResult = await github.init()
    if (isOk(initResult)) {
      const userResult = await github.getAuthenticatedUser()
      if (isOk(userResult)) {
        console.log(`${chalk.green('✅')} GitHub: Authenticated as ${chalk.cyan(userResult.value || 'unknown')}`)
      } else {
        console.log(`${chalk.yellow('⚠️')} GitHub: Token configured but auth failed`)
      }
    } else {
      console.log(`${chalk.yellow('⚠️')} GitHub: Token found but init failed`)
    }
  } else {
    console.log(`${chalk.red('❌')} GitHub: Not configured`)
  }

  // Coolify
  if (coolify.isConfigured()) {
    const initResult = await coolify.init()
    if (isOk(initResult)) {
      console.log(`${chalk.green('✅')} Coolify: ${chalk.cyan(config.getCoolifyUrl())}`)
    } else {
      console.log(`${chalk.yellow('⚠️')} Coolify: Configured but init failed`)
    }
  } else {
    console.log(`${chalk.red('❌')} Coolify: Not configured`)
  }

  // Telegram
  const telegram = config.getTelegramCredentials()
  if (telegram.apiId && telegram.apiHash) {
    console.log(`${chalk.green('✅')} Telegram: API credentials configured`)
  } else {
    console.log(`${chalk.red('❌')} Telegram: API credentials not configured`)
  }

  console.log()
  console.log(`${chalk.gray('📁')} Config file: ${chalk.cyan(ConfigService.getConfigPath())}`)
  console.log()
}
