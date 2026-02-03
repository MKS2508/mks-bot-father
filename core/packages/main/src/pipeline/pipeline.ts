/**
 * Pipeline orchestrator for complete bot automation.
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { ok, err, isErr, type Result, type ResultError } from '@mks2508/no-throw'
import { createLogger, log as fileLog } from '../utils/index.js'
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
  TemplateType,
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

    const startTime = Date.now()

    log.info(`Starting pipeline for bot: ${options.botName}`)
    fileLog.pipelineStart({
      botName: options.botName,
      options: {
        skipBotFather: options.skipBotFather,
        createGitHubRepo: options.createGitHubRepo,
        deployToCoolify: options.deployToCoolify
      }
    })

    // Step 1: BotFather automation
    if (!options.skipBotFather) {
      fileLog.pipelineStep('botfather', { botName: options.botName })
      const botResult = await this.runBotFatherStep(options)
      if (isErr(botResult)) {
        result.errors.push(botResult.error.message)
        fileLog.pipelineStepError('botfather', botResult.error.message)
        fileLog.pipelineComplete({
          botName: options.botName,
          success: false,
          durationMs: Date.now() - startTime,
          stepsCompleted: 0,
          errors: result.errors
        })
        return ok(result)
      }
      result.botToken = botResult.value.token
      result.botUsername = botResult.value.username
      fileLog.info('PIPELINE_STEP', 'BotFather step completed', {
        botUsername: result.botUsername
      })
    } else if (options.existingBotToken) {
      result.botToken = options.existingBotToken
      result.botUsername = options.existingBotUsername
      fileLog.info('PIPELINE_STEP', 'Using existing bot credentials', {
        botUsername: result.botUsername
      })
    }

    // Step 2: Scaffold project with bunspace
    fileLog.pipelineStep('scaffold', { botName: options.botName })
    const scaffoldResult = await this.runScaffoldStep(options)
    if (isErr(scaffoldResult)) {
      result.errors.push(scaffoldResult.error.message)
      fileLog.pipelineStepError('scaffold', scaffoldResult.error.message)
      fileLog.pipelineComplete({
        botName: options.botName,
        success: false,
        durationMs: Date.now() - startTime,
        stepsCompleted: 1,
        errors: result.errors
      })
      return ok(result)
    }
    fileLog.info('PIPELINE_STEP', 'Scaffold step completed', {
      projectPath: scaffoldResult.value.projectPath
    })

    // Step 3: Create GitHub repository
    if (options.createGitHubRepo && scaffoldResult.value.projectPath) {
      fileLog.pipelineStep('github', { botName: options.botName, projectPath: scaffoldResult.value.projectPath })
      const githubResult = await this.runGitHubStep(
        options,
        scaffoldResult.value.projectPath
      )
      if (isErr(githubResult)) {
        result.errors.push(githubResult.error.message)
        fileLog.pipelineStepError('github', githubResult.error.message)
      } else {
        result.githubRepoUrl = githubResult.value.repoUrl
        fileLog.info('PIPELINE_STEP', 'GitHub step completed', {
          repoUrl: result.githubRepoUrl
        })
      }
    }

    // Step 4: Deploy to Coolify
    if (options.deployToCoolify && result.githubRepoUrl) {
      fileLog.pipelineStep('coolify', { botName: options.botName, repoUrl: result.githubRepoUrl })
      const coolifyResult = await this.runCoolifyStep(options, result)
      if (isErr(coolifyResult)) {
        result.errors.push(coolifyResult.error.message)
        fileLog.pipelineStepError('coolify', coolifyResult.error.message)
      } else {
        result.coolifyAppUuid = coolifyResult.value.appUuid
        result.deploymentUrl = coolifyResult.value.deploymentUrl
        fileLog.info('PIPELINE_STEP', 'Coolify step completed', {
          appUuid: result.coolifyAppUuid,
          deploymentUrl: result.deploymentUrl
        })
      }
    }

    result.success = result.errors.length === 0
    const durationMs = Date.now() - startTime
    const stepsCompleted = result.errors.length === 0 ? 4 : (result.errors.length > 0 ? 1 + (result.githubRepoUrl ? 1 : 0) : 0)

    if (result.success) {
      log.success('Pipeline completed successfully')
    } else {
      log.warn(`Pipeline completed with ${result.errors.length} error(s)`)
    }

    fileLog.pipelineComplete({
      botName: options.botName,
      success: result.success,
      durationMs,
      stepsCompleted,
      errors: result.errors
    })

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

    // Create progress callback that maps service progress (0-100) to pipeline step range (0-25%)
    const stepProgress = options.onProgress
      ? (pct: number, msg: string, step?: string) => {
          options.onProgress?.(Math.round(pct * 0.25), `[BotFather] ${msg}`, step)
        }
      : undefined

    const createResult = await this.botFatherService.createBot({
      botName: options.botName,
      description: options.botDescription,
    }, stepProgress)

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
    options.onProgress?.(26, '[Scaffold] Initializing project scaffold', 'scaffold_init')

    const basePath = options.targetPath || process.cwd()
    const projectPath = join(basePath, options.botName)
    const template = options.template || TemplateType.TelegramBot

    if (existsSync(projectPath)) {
      return err({
        code: AppErrorCode.SCAFFOLD_ERROR,
        message: `Directory ${projectPath} already exists`,
      })
    }

    try {
      options.onProgress?.(30, `[Scaffold] Running bunspace template: ${template}`, 'scaffold_run')

      const proc = Bun.spawn(
        [
          'bun',
          'create',
          'bunspace',
          options.botName,
          '--template',
          template,
          '--yes',
        ],
        {
          stdout: 'pipe',
          stderr: 'pipe',
          cwd: basePath,
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

      options.onProgress?.(50, '[Scaffold] Project scaffolded successfully', 'scaffold_done')
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
    options.onProgress?.(51, '[GitHub] Initializing GitHub service', 'github_init')

    const initResult = await this.githubService.init()
    if (isErr(initResult)) {
      return err(initResult.error)
    }

    const config = this.configService.get()
    const owner = options.githubOrg || config.github?.defaultOrg

    // Create progress callback that maps service progress (0-100) to pipeline step range (51-65%)
    const createRepoProgress = options.onProgress
      ? (pct: number, msg: string, step?: string) => {
          options.onProgress?.(51 + Math.round(pct * 0.14), `[GitHub] ${msg}`, step)
        }
      : undefined

    const repoResult = await this.githubService.createRepo({
      name: options.botName,
      description: options.botDescription || `Telegram bot: ${options.botName}`,
      private: config.github?.defaultVisibility === 'private',
      owner,
    }, createRepoProgress)

    if (isErr(repoResult)) {
      return err(repoResult.error)
    }

    if (!repoResult.value.cloneUrl) {
      return err({ code: AppErrorCode.GITHUB_ERROR, message: 'No clone URL returned' })
    }

    // Create progress callback for push (65-75%)
    const pushProgress = options.onProgress
      ? (pct: number, msg: string, step?: string) => {
          options.onProgress?.(65 + Math.round(pct * 0.10), `[GitHub] ${msg}`, step)
        }
      : undefined

    const pushResult = await this.githubService.pushToRepo(
      repoResult.value.cloneUrl,
      projectPath,
      'main',
      pushProgress
    )

    if (isErr(pushResult)) {
      return err(pushResult.error)
    }

    options.onProgress?.(75, '[GitHub] Repository created and code pushed', 'github_done')
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
    options.onProgress?.(76, '[Coolify] Initializing Coolify service', 'coolify_init')

    const initResult = await this.coolifyService.init()
    if (isErr(initResult)) {
      return err(initResult.error)
    }

    const config = this.configService.get()
    const serverUuid = options.coolifyServer || config.coolify?.defaultServer
    const destinationUuid = options.coolifyDestination || config.coolify?.defaultDestination
    const projectUuid = config.coolify?.defaultProject
    const environmentUuid = config.coolify?.defaultEnvironment

    if (!serverUuid || !destinationUuid || !projectUuid || !environmentUuid) {
      return err({
        code: AppErrorCode.COOLIFY_ERROR,
        message: 'Coolify server, destination, project and environment not configured',
      })
    }

    if (!pipelineResult.githubRepoUrl) {
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: 'GitHub repo URL not available' })
    }

    // Create progress callback for application creation (76-85%)
    const createAppProgress = options.onProgress
      ? (pct: number, msg: string, step?: string) => {
          options.onProgress?.(76 + Math.round(pct * 0.09), `[Coolify] ${msg}`, step)
        }
      : undefined

    const appResult = await this.coolifyService.createApplication({
      name: options.botName,
      description: options.botDescription,
      serverUuid,
      destinationUuid,
      projectUuid,
      environmentUuid,
      githubRepoUrl: pipelineResult.githubRepoUrl,
    }, createAppProgress)

    if (isErr(appResult)) {
      return err(appResult.error)
    }

    if (!appResult.value.uuid) {
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: 'No application UUID returned' })
    }

    if (pipelineResult.botToken) {
      options.onProgress?.(85, '[Coolify] Setting environment variables', 'coolify_env')
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

    // Create progress callback for deploy (90-100%)
    const deployProgress = options.onProgress
      ? (pct: number, msg: string, step?: string) => {
          options.onProgress?.(90 + Math.round(pct * 0.10), `[Coolify] ${msg}`, step)
        }
      : undefined

    const deployResult = await this.coolifyService.deploy({
      uuid: appResult.value.uuid,
    }, deployProgress)

    if (isErr(deployResult)) {
      return err(deployResult.error)
    }

    options.onProgress?.(100, '[Coolify] Deployment triggered successfully', 'coolify_done')
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
