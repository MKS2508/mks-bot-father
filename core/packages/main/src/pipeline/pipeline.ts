/**
 * Pipeline orchestrator for complete bot automation.
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { ok, err, isErr, type Result, type ResultError } from '@mks2508/no-throw'
import { createLogger } from '../utils/index.js'
import { getConfigService } from '../services/config.service.js'
import { getGitHubService } from '../services/github.service.js'
import { getCoolifyService } from '../services/coolify.service.js'
import { getBotFatherService } from '../services/botfather.service.js'
import {
  type IPipelineOptions,
  type IPipelineResult,
  type IBotFatherStepResult,
  type IScaffoldStepResult,
  type IGitHubStepResult,
  type ICoolifyStepResult,
} from '../types/index.js'
import { AppErrorCode } from '../types/errors.js'

const log = createLogger('Pipeline')

/**
 * Pipeline orchestrator that runs the complete bot automation flow.
 *
 * @example
 * ```typescript
 * const pipeline = getPipeline()
 * const result = await pipeline.run({
 *   botName: 'my-bot',
 *   createGitHubRepo: true,
 *   deployToCoolify: true,
 * })
 *
 * if (isOk(result)) {
 *   console.log('Bot created:', result.value.botUsername)
 *   console.log('GitHub:', result.value.githubRepoUrl)
 * } else {
 *   console.error('Error:', result.error.message)
 * }
 * ```
 */
export class Pipeline {
  private githubService = getGitHubService()
  private coolifyService = getCoolifyService()
  private configService = getConfigService()
  private botFatherService = getBotFatherService()

  /**
   * Runs the complete pipeline.
   *
   * @param options - Pipeline options
   * @returns Result with pipeline execution result or error
   */
  async run(options: IPipelineOptions): Promise<Result<IPipelineResult, ResultError<typeof AppErrorCode.UNKNOWN_ERROR>>> {
    const result: IPipelineResult = {
      success: false,
      errors: [],
    }

    log.info(`Starting pipeline for bot: ${options.botName}`)

    // Step 1: BotFather automation
    if (!options.skipBotFather) {
      const botResult = await this.runBotFatherStep(options)
      if (isErr(botResult)) {
        result.errors.push(botResult.error.message)
        return ok(result)
      }
      result.botToken = botResult.value.token
      result.botUsername = botResult.value.username
    }

    // Step 2: Scaffold project with bunspace
    const scaffoldResult = await this.runScaffoldStep(options)
    if (isErr(scaffoldResult)) {
      result.errors.push(scaffoldResult.error.message)
      return ok(result)
    }

    // Step 3: Create GitHub repository
    if (options.createGitHubRepo && scaffoldResult.value.projectPath) {
      const githubResult = await this.runGitHubStep(
        options,
        scaffoldResult.value.projectPath
      )
      if (isErr(githubResult)) {
        result.errors.push(githubResult.error.message)
      } else {
        result.githubRepoUrl = githubResult.value.repoUrl
      }
    }

    // Step 4: Deploy to Coolify
    if (options.deployToCoolify && result.githubRepoUrl) {
      const coolifyResult = await this.runCoolifyStep(options, result)
      if (isErr(coolifyResult)) {
        result.errors.push(coolifyResult.error.message)
      } else {
        result.coolifyAppUuid = coolifyResult.value.appUuid
        result.deploymentUrl = coolifyResult.value.deploymentUrl
      }
    }

    result.success = result.errors.length === 0

    if (result.success) {
      log.success('Pipeline completed successfully')
    } else {
      log.warn(`Pipeline completed with ${result.errors.length} error(s)`)
    }

    return ok(result)
  }

  /**
   * Runs the BotFather automation step.
   *
   * @param options - Pipeline options
   * @returns Result with bot token and username or error
   */
  private async runBotFatherStep(
    options: IPipelineOptions
  ): Promise<Result<IBotFatherStepResult, ResultError<typeof AppErrorCode.BOTFATHER_ERROR>>> {
    log.info('Step 1: Creating bot via BotFather')

    const initResult = await this.botFatherService.init()
    if (isErr(initResult)) {
      return err(initResult.error)
    }

    const createResult = await this.botFatherService.createBot({
      botName: options.botName,
      description: options.botDescription,
    })

    const disconnectResult = await this.botFatherService.disconnect()
    if (isErr(disconnectResult)) {
      log.warn('Failed to disconnect from Telegram:', disconnectResult.error.message)
    }

    if (isErr(createResult)) {
      return err(createResult.error)
    }

    return ok({
      success: true,
      token: createResult.value.botToken,
      username: createResult.value.botUsername,
    })
  }

  /**
   * Runs the project scaffolding step.
   *
   * @param options - Pipeline options
   * @returns Result with project path or error
   */
  private async runScaffoldStep(
    options: IPipelineOptions
  ): Promise<Result<IScaffoldStepResult, ResultError<typeof AppErrorCode.SCAFFOLD_ERROR>>> {
    log.info('Step 2: Scaffolding project with bunspace')

    const projectPath = join(process.cwd(), options.botName)

    if (existsSync(projectPath)) {
      return err({
        code: AppErrorCode.SCAFFOLD_ERROR,
        message: `Directory ${projectPath} already exists`,
      })
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
        return err({
          code: AppErrorCode.SCAFFOLD_ERROR,
          message: stderr || 'Scaffold failed',
        })
      }

      log.success(`Project scaffolded at ${projectPath}`)
      return ok({ success: true, projectPath })
    } catch (error) {
      return err({
        code: AppErrorCode.SCAFFOLD_ERROR,
        message: error instanceof Error ? error.message : 'Unknown scaffold error',
      })
    }
  }

  /**
   * Runs the GitHub repository creation step.
   *
   * @param options - Pipeline options
   * @param projectPath - Path to the scaffolded project
   * @returns Result with repository URL or error
   */
  private async runGitHubStep(
    options: IPipelineOptions,
    projectPath: string
  ): Promise<Result<IGitHubStepResult, ResultError<typeof AppErrorCode.GITHUB_ERROR>>> {
    log.info('Step 3: Creating GitHub repository')

    const initResult = await this.githubService.init()
    if (isErr(initResult)) {
      return err(initResult.error)
    }

    const config = this.configService.get()
    const owner = options.githubOrg || config.github?.defaultOrg

    const repoResult = await this.githubService.createRepo({
      name: options.botName,
      description: options.botDescription || `Telegram bot: ${options.botName}`,
      private: config.github?.defaultVisibility === 'private',
      owner,
    })

    if (isErr(repoResult)) {
      return err(repoResult.error)
    }

    if (!repoResult.value.cloneUrl) {
      return err({ code: AppErrorCode.GITHUB_ERROR, message: 'No clone URL returned' })
    }

    const pushResult = await this.githubService.pushToRepo(
      repoResult.value.cloneUrl,
      projectPath
    )

    if (isErr(pushResult)) {
      return err(pushResult.error)
    }

    return ok({ success: true, repoUrl: repoResult.value.repoUrl })
  }

  /**
   * Runs the Coolify deployment step.
   *
   * @param options - Pipeline options
   * @param pipelineResult - Current pipeline result
   * @returns Result with deployment info or error
   */
  private async runCoolifyStep(
    options: IPipelineOptions,
    pipelineResult: IPipelineResult
  ): Promise<Result<ICoolifyStepResult, ResultError<typeof AppErrorCode.COOLIFY_ERROR>>> {
    log.info('Step 4: Deploying to Coolify')

    const initResult = await this.coolifyService.init()
    if (isErr(initResult)) {
      return err(initResult.error)
    }

    const config = this.configService.get()
    const serverUuid = options.coolifyServer || config.coolify?.defaultServer
    const destinationUuid =
      options.coolifyDestination || config.coolify?.defaultDestination

    if (!serverUuid || !destinationUuid) {
      return err({
        code: AppErrorCode.COOLIFY_ERROR,
        message: 'Coolify server and destination not configured',
      })
    }

    if (!pipelineResult.githubRepoUrl) {
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: 'GitHub repo URL not available' })
    }

    const appResult = await this.coolifyService.createApplication({
      name: options.botName,
      description: options.botDescription,
      serverUuid,
      destinationUuid,
      githubRepoUrl: pipelineResult.githubRepoUrl,
    })

    if (isErr(appResult)) {
      return err(appResult.error)
    }

    if (!appResult.value.uuid) {
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: 'No application UUID returned' })
    }

    if (pipelineResult.botToken) {
      const envResult = await this.coolifyService.setEnvironmentVariables(
        appResult.value.uuid,
        {
          TG_BOT_TOKEN: pipelineResult.botToken,
          TG_MODE: 'webhook',
          TG_ENV: 'production',
        }
      )

      if (isErr(envResult)) {
        log.warn('Failed to set environment variables:', envResult.error.message)
      }
    }

    const deployResult = await this.coolifyService.deploy({
      uuid: appResult.value.uuid,
    })

    if (isErr(deployResult)) {
      return err(deployResult.error)
    }

    return ok({
      success: true,
      appUuid: appResult.value.uuid,
      deploymentUrl: `${config.coolify?.url}/project/${serverUuid}/application/${appResult.value.uuid}`,
    })
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
