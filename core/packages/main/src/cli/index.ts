#!/usr/bin/env node
import { Command } from 'commander'
import logger from '@mks2508/better-logger'
import { handleCreate } from './commands/create.js'
import { handleDeploy } from './commands/deploy.js'
import { handleConfig } from './commands/config.js'

logger.preset('cyberpunk')

const program = new Command()

program
  .name('mks-bot-father')
  .description('Complete pipeline for Telegram bot automation: BotFather + GitHub + Coolify')
  .version('0.1.0')

program
  .command('create')
  .description('Create a new Telegram bot with full pipeline')
  .argument('<name>', 'Bot name')
  .option('-d, --description <text>', 'Bot description')
  .option('--github', 'Create GitHub repository', false)
  .option('--github-org <org>', 'GitHub organization (default: authenticated user)')
  .option('--deploy', 'Deploy to Coolify', false)
  .option('--coolify-server <uuid>', 'Coolify server UUID')
  .option('--coolify-dest <uuid>', 'Coolify destination UUID')
  .option('--skip-botfather', 'Skip BotFather automation', false)
  .option('--full', 'Full pipeline: BotFather + GitHub + Coolify', false)
  .action(handleCreate)

program
  .command('deploy')
  .description('Deploy an existing bot to Coolify')
  .argument('<name>', 'Bot/application name or UUID')
  .option('-f, --force', 'Force rebuild without cache', false)
  .option('-t, --tag <tag>', 'Deploy by tag instead of UUID')
  .action(handleDeploy)

program
  .command('config')
  .description('Manage configuration')
  .argument('<action>', 'Action: get, set, list, path')
  .argument('[key]', 'Configuration key (e.g., github.token, coolify.url)')
  .argument('[value]', 'Value to set')
  .action(handleConfig)

program
  .command('status')
  .description('Show configuration status')
  .action(async () => {
    const { getConfigManager } = await import('../config/index.js')
    const { getCoolifyManager } = await import('../coolify/index.js')
    const { getGitHubManager } = await import('../github/index.js')

    const config = getConfigManager()
    const github = getGitHubManager()
    const coolify = getCoolifyManager()

    console.log('\n📋 Configuration Status\n')

    // GitHub
    const githubToken = await config.resolveGitHubToken()
    if (githubToken) {
      await github.init()
      const user = await github.getAuthenticatedUser()
      console.log(`✅ GitHub: Authenticated as ${user || 'unknown'}`)
    } else {
      console.log('❌ GitHub: Not configured')
    }

    // Coolify
    if (coolify.isConfigured()) {
      console.log(`✅ Coolify: ${config.getCoolifyUrl()}`)
    } else {
      console.log('❌ Coolify: Not configured')
    }

    // Telegram
    const telegram = config.getTelegramCredentials()
    if (telegram.apiId && telegram.apiHash) {
      console.log('✅ Telegram: API credentials configured')
    } else {
      console.log('❌ Telegram: API credentials not configured')
    }

    const { ConfigManager } = await import('../config/index.js')
    console.log(`\n📁 Config file: ${ConfigManager.getConfigPath()}`)
    console.log()
  })

program.parse()
