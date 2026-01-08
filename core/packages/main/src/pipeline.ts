/**
 * Pipeline orchestrator for complete bot automation.
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { component } from '@mks2508/better-logger'
import {
  BootstrapClient,
  BotFatherManager,
  EnvManager,
} from '@mks2508/telegram-bot-manager'
import { getConfigManager } from './config/index.js'
import { getCoolifyManager } from './coolify/index.js'
import { getGitHubManager } from './github/index.js'
import type { IPipelineOptions, IPipelineResult } from './types.js'

const log = component('Pipeline')

/**
 * Pipeline orchestrator that runs the complete bot automation flow.
 *
 * @example
 * ```typescript
 * const pipeline = new Pipeline()
 * const result = await pipeline.run({
 *   botName: 'my-bot',
 *   createGitHubRepo: true,
 *   deployToCoolify: true,
 * })
 *
 * if (result.success) {
 *   console.log('Bot created:', result.botUsername)
 *   console.log('GitHub:', result.githubRepoUrl)
 * }
 * ```
 */
export class Pipeline {
  private githubManager = getGitHubManager()
  private coolifyManager = getCoolifyManager()
  private configManager = getConfigManager()
  private client: BootstrapClient | null = null

  /**
   * Runs the complete pipeline.
   *
   * @param options - Pipeline options
   * @returns Pipeline execution result
   */
  async run(options: IPipelineOptions): Promise<IPipelineResult> {
    const result: IPipelineResult = {
      success: false,
      errors: [],
    }

    log.info(`Starting pipeline for bot: ${options.botName}`)

    // Step 1: BotFather automation
    if (!options.skipBotFather) {
      const botResult = await this.runBotFatherStep(options)
      if (!botResult.success) {
        result.errors.push(botResult.error || 'BotFather step failed')
        return result
      }
      result.botToken = botResult.token
      result.botUsername = botResult.username
    }

    // Step 2: Scaffold project with bunspace
    const scaffoldResult = await this.runScaffoldStep(options)
    if (!scaffoldResult.success) {
      result.errors.push(scaffoldResult.error || 'Scaffold step failed')
      return result
    }

    // Step 3: Create GitHub repository
    if (options.createGitHubRepo) {
      const githubResult = await this.runGitHubStep(options, scaffoldResult.projectPath!)
      if (!githubResult.success) {
        result.errors.push(githubResult.error || 'GitHub step failed')
      } else {
        result.githubRepoUrl = githubResult.repoUrl
      }
    }

    // Step 4: Deploy to Coolify
    if (options.deployToCoolify && result.githubRepoUrl) {
      const coolifyResult = await this.runCoolifyStep(options, result)
      if (!coolifyResult.success) {
        result.errors.push(coolifyResult.error || 'Coolify step failed')
      } else {
        result.coolifyAppUuid = coolifyResult.appUuid
        result.deploymentUrl = coolifyResult.deploymentUrl
      }
    }

    result.success = result.errors.length === 0
    return result
  }

  /**
   * Runs the BotFather automation step using telegram-bot-manager library.
   *
   * @param options - Pipeline options
   * @returns Result with bot token and username
   */
  private async runBotFatherStep(
    options: IPipelineOptions
  ): Promise<{ success: boolean; token?: string; username?: string; error?: string }> {
    log.info('Step 1: Creating bot via BotFather')

    try {
      const telegramCreds = this.configManager.getTelegramCredentials()

      if (!telegramCreds.apiId || !telegramCreds.apiHash) {
        return {
          success: false,
          error: 'Telegram API credentials not configured. Use: mbf config set telegram.apiId <id> && mbf config set telegram.apiHash <hash>',
        }
      }

      // Create and connect the client
      this.client = new BootstrapClient({
        apiId: telegramCreds.apiId,
        apiHash: telegramCreds.apiHash,
      })

      log.info('Connecting to Telegram...')
      await this.client.ensureAuthorized()

      // Create BotFather manager
      const botFather = new BotFatherManager(this.client)

      // Generate username from bot name
      const botUsername = this.generateBotUsername(options.botName)

      log.info(`Creating bot: ${options.botName} (@${botUsername})`)

      // Create the bot
      const createResult = await botFather.createBot({
        botName: options.botName,
        botUsername,
      })

      if (!createResult.success) {
        await this.client.disconnect()
        return {
          success: false,
          error: createResult.error || 'Failed to create bot',
        }
      }

      log.success(`Bot created: @${createResult.botUsername}`)

      // Optionally set description
      if (options.botDescription && createResult.botUsername) {
        await botFather.setDescription(createResult.botUsername, options.botDescription)
      }

      // Save to env manager
      if (createResult.botUsername && createResult.botToken) {
        const envManager = new EnvManager()
        await envManager.createEnv(createResult.botUsername, 'local', {
          botToken: createResult.botToken,
          mode: 'polling',
        })
      }

      await this.client.disconnect()

      return {
        success: true,
        token: createResult.botToken,
        username: createResult.botUsername,
      }
    } catch (error) {
      if (this.client) {
        try {
          await this.client.disconnect()
        } catch {
          // Ignore disconnect errors
        }
      }
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  /**
   * Generates a valid bot username from the bot name.
   *
   * @param name - The bot name
   * @returns A valid bot username ending with 'bot'
   */
  private generateBotUsername(name: string): string {
    const sanitized = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')

    if (sanitized.endsWith('bot')) {
      return sanitized
    }

    return `${sanitized}_bot`
  }

  /**
   * Runs the project scaffolding step.
   *
   * @param options - Pipeline options
   * @returns Result with project path
   */
  private async runScaffoldStep(
    options: IPipelineOptions
  ): Promise<{ success: boolean; projectPath?: string; error?: string }> {
    log.info('Step 2: Scaffolding project with bunspace')

    const projectPath = join(process.cwd(), options.botName)

    if (existsSync(projectPath)) {
      return { success: false, error: `Directory ${projectPath} already exists` }
    }

    try {
      const proc = Bun.spawn(
        [
          'bun',
          'create',
          'bunspace',
          options.botName,
          '--template',
          'telegram-bot',
          '--yes',
        ],
        {
          stdout: 'pipe',
          stderr: 'pipe',
          cwd: process.cwd(),
        }
      )

      const exitCode = await proc.exited

      if (exitCode !== 0) {
        const stderr = await new Response(proc.stderr).text()
        return { success: false, error: stderr || 'Scaffold failed' }
      }

      log.success(`Project scaffolded at ${projectPath}`)
      return { success: true, projectPath }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  /**
   * Runs the GitHub repository creation step.
   *
   * @param options - Pipeline options
   * @param projectPath - Path to the scaffolded project
   * @returns Result with repository URL
   */
  private async runGitHubStep(
    options: IPipelineOptions,
    projectPath: string
  ): Promise<{ success: boolean; repoUrl?: string; error?: string }> {
    log.info('Step 3: Creating GitHub repository')

    const initialized = await this.githubManager.init()
    if (!initialized) {
      return { success: false, error: 'GitHub not configured' }
    }

    const config = this.configManager.get()
    const owner = options.githubOrg || config.github?.defaultOrg

    const repoResult = await this.githubManager.createRepo({
      name: options.botName,
      description: options.botDescription || `Telegram bot: ${options.botName}`,
      private: config.github?.defaultVisibility === 'private',
      owner,
    })

    if (!repoResult.success || !repoResult.cloneUrl) {
      return { success: false, error: repoResult.error }
    }

    const pushResult = await this.githubManager.pushToRepo(
      repoResult.cloneUrl,
      projectPath
    )

    if (!pushResult.success) {
      return { success: false, error: pushResult.error }
    }

    return { success: true, repoUrl: repoResult.repoUrl }
  }

  /**
   * Runs the Coolify deployment step.
   *
   * @param options - Pipeline options
   * @param pipelineResult - Current pipeline result
   * @returns Result with deployment info
   */
  private async runCoolifyStep(
    options: IPipelineOptions,
    pipelineResult: IPipelineResult
  ): Promise<{
    success: boolean
    appUuid?: string
    deploymentUrl?: string
    error?: string
  }> {
    log.info('Step 4: Deploying to Coolify')

    const initialized = await this.coolifyManager.init()
    if (!initialized) {
      return { success: false, error: 'Coolify not configured' }
    }

    const config = this.configManager.get()
    const serverUuid = options.coolifyServer || config.coolify?.defaultServer
    const destinationUuid =
      options.coolifyDestination || config.coolify?.defaultDestination

    if (!serverUuid || !destinationUuid) {
      return {
        success: false,
        error: 'Coolify server and destination not configured',
      }
    }

    if (!pipelineResult.githubRepoUrl) {
      return { success: false, error: 'GitHub repo URL not available' }
    }

    const appResult = await this.coolifyManager.createApplication({
      name: options.botName,
      description: options.botDescription,
      serverUuid,
      destinationUuid,
      githubRepoUrl: pipelineResult.githubRepoUrl,
    })

    if (!appResult.success || !appResult.uuid) {
      return { success: false, error: appResult.error }
    }

    if (pipelineResult.botToken) {
      await this.coolifyManager.setEnvironmentVariables(appResult.uuid, {
        TG_BOT_TOKEN: pipelineResult.botToken,
        TG_MODE: 'webhook',
        TG_ENV: 'production',
      })
    }

    const deployResult = await this.coolifyManager.deploy({
      uuid: appResult.uuid,
    })

    if (!deployResult.success) {
      return { success: false, error: deployResult.error }
    }

    return {
      success: true,
      appUuid: appResult.uuid,
      deploymentUrl: `${config.coolify?.url}/project/${serverUuid}/application/${appResult.uuid}`,
    }
  }
}

let instance: Pipeline | null = null

/**
 * Gets the singleton Pipeline instance.
 *
 * @returns The Pipeline instance
 */
export function getPipeline(): Pipeline {
  if (!instance) {
    instance = new Pipeline()
  }
  return instance
}
