/**
 * Coolify service for mks-bot-father.
 *
 * This service wraps @mks2508/coolify-mks-cli-mcp to provide:
 * - Progress callbacks with detailed steps
 * - File logging via shared-logger
 * - Custom error types (AppErrorCode)
 * - ConfigService integration
 *
 * @module
 */

import { ok, err, isErr, type Result, type ResultError } from '@mks2508/no-throw'
import { createLogger, log as fileLog } from '../utils/index.js'
import { getConfigService } from './config.service.js'
import { getCoolifyService as getCoolifyMcpService } from '@mks2508/coolify-mks-cli-mcp'
import type {
  ICoolifyAppOptions,
  ICoolifyAppResult,
  ICoolifyApplication,
  ICoolifyDeleteResult,
  ICoolifyDeployment,
  ICoolifyDeployOptions,
  ICoolifyDeployResult,
  ICoolifyDestination,
  ICoolifyLogs,
  ICoolifyLogsOptions,
  ICoolifyProject,
  ICoolifyServer,
  ICoolifyTeam,
  ICoolifyUpdateOptions,
} from '@mks2508/coolify-mks-cli-mcp'
import { type IProgressCallback } from '../types/index.js'
import { AppErrorCode } from '../types/errors.js'

const log = createLogger('CoolifyService')

/**
 * Coolify service for deployment operations.
 *
 * Wraps @mks2508/coolify-mks-cli-mcp with mks-bot-father specific features.
 *
 * @example
 * ```typescript
 * const coolify = getCoolifyService()
 * const initResult = await coolify.init()
 * if (isErr(initResult)) {
 *   console.error(initResult.error.message)
 *   return
 * }
 *
 * const deployResult = await coolify.deploy({ uuid: 'app-uuid' })
 * if (isOk(deployResult)) {
 *   console.log('Deployment UUID:', deployResult.value.deploymentUuid)
 * }
 * ```
 */
export class CoolifyService {
  private mcpService = getCoolifyMcpService()
  private config = getConfigService()

  /**
   * Initializes the Coolify service by loading configuration.
   *
   * @returns Result indicating success or error
   */
  async init(): Promise<Result<void, ResultError<typeof AppErrorCode.COOLIFY_ERROR>>> {
    const startTime = Date.now()

    // Set environment variables for the MCP service
    const baseUrl = this.config.getCoolifyUrl()
    const token = this.config.getCoolifyToken()

    if (baseUrl) process.env.COOLIFY_URL = baseUrl
    if (token) process.env.COOLIFY_TOKEN = token

    if (!baseUrl) {
      log.error('No Coolify URL configured')
      log.info('Configure with: mbf config set coolify.url <url>')
      fileLog.error('COOLIFY', 'No Coolify URL configured', { reason: 'not_configured', duration_ms: Date.now() - startTime })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: 'No Coolify URL configured' })
    }

    if (!token) {
      log.error('No Coolify token configured')
      log.info('Configure with: mbf config set coolify.token <token>')
      fileLog.error('COOLIFY', 'No Coolify token configured', { reason: 'not_configured', duration_ms: Date.now() - startTime })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: 'No Coolify token configured' })
    }

    // Initialize the MCP service
    const initResult = await this.mcpService.init()
    if (isErr(initResult)) {
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: initResult.error.message })
    }

    log.debug('Coolify connection configured')
    fileLog.info('COOLIFY', 'Coolify service initialized', { baseUrl, duration_ms: Date.now() - startTime })
    return ok(undefined)
  }

  /**
   * Checks if Coolify is configured.
   *
   * @returns True if URL and token are configured
   */
  isConfigured(): boolean {
    return this.mcpService.isConfigured()
  }

  /**
   * Deploys an application.
   *
   * @param options - Deployment options
   * @param onProgress - Optional progress callback (0-100, message, step)
   * @returns Result with deployment info or error
   */
  async deploy(
    options: ICoolifyDeployOptions,
    onProgress?: IProgressCallback
  ): Promise<Result<ICoolifyDeployResult, ResultError<typeof AppErrorCode.COOLIFY_ERROR>>> {
    const startTime = Date.now()

    if (!options.uuid && !options.tag) {
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: 'Either uuid or tag is required' })
    }

    const appId = options.uuid?.slice(0, 8) || options.tag || 'unknown'
    onProgress?.(5, `Preparing deployment for ${appId}...`, 'prepare')

    log.info(`Deploying application ${options.uuid || options.tag}`)
    fileLog.info('COOLIFY', 'Deploying application', {
      uuid: options.uuid,
      tag: options.tag,
      force: options.force
    })

    onProgress?.(15, 'Validating deployment configuration', 'validate')
    onProgress?.(25, options.force ? 'Force deploy enabled' : 'Standard deployment mode', 'mode')
    onProgress?.(40, 'Connecting to Coolify API...', 'connect')
    onProgress?.(55, 'Triggering build pipeline...', 'trigger_build')

    const result = await this.mcpService.deploy(options, (pct: number, msg: string) => {
      onProgress?.(Math.round(55 + pct * 0.35), msg)
    })

    if (isErr(result)) {
      const error = result.error
      log.error(`Deployment failed: ${error.message}`)
      fileLog.error('COOLIFY', 'Deployment failed', {
        uuid: options.uuid,
        tag: options.tag,
        error: error.message
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: error.message })
    }

    const deployId = result.value.deploymentUuid?.slice(0, 8) || 'unknown'
    onProgress?.(90, 'Build started on Coolify server', 'building')
    onProgress?.(100, `✓ Deployment ${deployId} triggered`, 'done')

    log.success(`Deployment started: ${result.value.deploymentUuid}`)
    fileLog.info('COOLIFY', 'Deployment started', {
      deploymentUuid: result.value.deploymentUuid,
      resourceUuid: result.value.resourceUuid,
      duration_ms: Date.now() - startTime
    })
    return ok(result.value)
  }

  /**
   * Creates a new application in Coolify.
   *
   * @param options - Application options
   * @param onProgress - Optional progress callback (0-100, message, step)
   * @returns Result with application UUID or error
   */
  async createApplication(
    options: ICoolifyAppOptions,
    onProgress?: IProgressCallback
  ): Promise<Result<ICoolifyAppResult, ResultError<typeof AppErrorCode.COOLIFY_ERROR>>> {
    const startTime = Date.now()

    onProgress?.(5, `Preparing app "${options.name}"`, 'prepare')

    log.info(`Creating application ${options.name}`)
    fileLog.info('COOLIFY', 'Creating application', {
      name: options.name,
      serverUuid: options.serverUuid,
      destinationUuid: options.destinationUuid,
      repoUrl: options.githubRepoUrl
    })

    onProgress?.(15, `Validating server ${options.serverUuid.slice(0, 8)}...`, 'validate_server')
    onProgress?.(25, `Configuring destination ${options.destinationUuid?.slice(0, 8) ?? 'default'}...`, 'configure_dest')
    onProgress?.(35, `Setting up Git: ${options.githubRepoUrl}`, 'setup_git')
    onProgress?.(50, `Build pack: ${options.buildPack || 'nixpacks'}`, 'build_pack')
    onProgress?.(65, 'Sending creation request to Coolify API...', 'api_request')

    const result = await this.mcpService.createApplication(options, (pct: number, msg: string) => {
      onProgress?.(Math.round(65 + pct * 0.2), msg)
    })

    if (isErr(result)) {
      const error = result.error
      log.error(`Failed to create application: ${error.message}`)
      fileLog.error('COOLIFY', 'Failed to create application', {
        name: options.name,
        error: error.message
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: error.message })
    }

    onProgress?.(85, `App UUID: ${result.value.uuid?.slice(0, 8)}...`, 'uuid_received')
    onProgress?.(100, `✓ Application "${options.name}" created`, 'done')

    log.success(`Application created: ${result.value.uuid}`)
    fileLog.info('COOLIFY', 'Application created', {
      name: options.name,
      uuid: result.value.uuid,
      duration_ms: Date.now() - startTime
    })
    return ok(result.value)
  }

  /**
   * Sets environment variables for an application.
   *
   * @param appUuid - Application UUID
   * @param envVars - Environment variables to set
   * @returns Result indicating success or error
   */
  async setEnvironmentVariables(
    appUuid: string,
    envVars: Record<string, string>
  ): Promise<Result<void, ResultError<typeof AppErrorCode.COOLIFY_ERROR>>> {
    const startTime = Date.now()
    log.info(`Setting environment variables for ${appUuid}`)
    fileLog.info('COOLIFY', 'Setting environment variables', {
      appUuid,
      varCount: Object.keys(envVars).length
    })

    const result = await this.mcpService.setEnvironmentVariables(appUuid, envVars)

    if (isErr(result)) {
      const error = result.error
      log.error(`Failed to set env vars: ${error.message}`)
      fileLog.error('COOLIFY', 'Failed to set environment variables', {
        appUuid,
        error: error.message
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: error.message })
    }

    log.success('Environment variables set')
    fileLog.info('COOLIFY', 'Environment variables set', { appUuid, duration_ms: Date.now() - startTime })
    return ok(undefined)
  }

  /**
   * Gets the status of an application.
   *
   * @param appUuid - Application UUID
   * @returns Result with status or error
   */
  async getApplicationStatus(
    appUuid: string
  ): Promise<Result<string, ResultError<typeof AppErrorCode.COOLIFY_ERROR>>> {
    const startTime = Date.now()
    fileLog.info('COOLIFY', 'Get application status', { appUuid })

    const result = await this.mcpService.getApplicationStatus(appUuid)

    if (isErr(result)) {
      const error = result.error
      fileLog.error('COOLIFY', 'Get application status failed', {
        appUuid,
        error: error.message
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: error.message })
    }

    fileLog.info('COOLIFY', 'Application status retrieved', {
      appUuid,
      status: result.value,
      duration_ms: Date.now() - startTime
    })
    return ok(result.value)
  }

  /**
   * Lists available servers in Coolify.
   *
   * @returns Result with servers or error
   */
  async listServers(): Promise<Result<ICoolifyServer[], ResultError<typeof AppErrorCode.COOLIFY_ERROR>>> {
    const startTime = Date.now()
    fileLog.info('COOLIFY', 'List servers')

    const result = await this.mcpService.listServers()

    if (isErr(result)) {
      const error = result.error
      fileLog.error('COOLIFY', 'List servers failed', { error: error.message })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: error.message })
    }

    fileLog.info('COOLIFY', 'Servers listed', {
      count: result.value.length,
      duration_ms: Date.now() - startTime
    })
    return ok(result.value)
  }

  /**
   * Gets details of a specific server.
   *
   * @param serverUuid - Server UUID
   * @returns Result with server details or error
   */
  async getServer(
    serverUuid: string
  ): Promise<Result<ICoolifyServer, ResultError<typeof AppErrorCode.COOLIFY_ERROR>>> {
    const startTime = Date.now()
    log.info(`Getting server details for ${serverUuid}`)
    fileLog.info('COOLIFY', 'Get server', { serverUuid })

    const result = await this.mcpService.getServer(serverUuid)

    if (isErr(result)) {
      const error = result.error
      log.error(`Failed to get server: ${error.message}`)
      fileLog.error('COOLIFY', 'Get server failed', {
        serverUuid,
        error: error.message
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: error.message })
    }

    log.success(`Server details retrieved: ${serverUuid}`)
    fileLog.info('COOLIFY', 'Server retrieved', {
      serverUuid,
      name: result.value.name,
      duration_ms: Date.now() - startTime
    })
    return ok(result.value)
  }

  /**
   * Lists all projects.
   *
   * @returns Result with projects list or error
   */
  async listProjects(): Promise<Result<ICoolifyProject[], ResultError<typeof AppErrorCode.COOLIFY_ERROR>>> {
    const startTime = Date.now()
    log.info('Listing projects')
    fileLog.info('COOLIFY', 'List projects')

    const result = await this.mcpService.listProjects()

    if (isErr(result)) {
      const error = result.error
      log.error(`Failed to list projects: ${error.message}`)
      fileLog.error('COOLIFY', 'List projects failed', { error: error.message })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: error.message })
    }

    log.success(`Listed ${result.value.length} projects`)
    fileLog.info('COOLIFY', 'Projects listed', {
      count: result.value.length,
      duration_ms: Date.now() - startTime
    })
    return ok(result.value)
  }

  /**
   * Lists all teams.
   *
   * @returns Result with teams list or error
   */
  async listTeams(): Promise<Result<ICoolifyTeam[], ResultError<typeof AppErrorCode.COOLIFY_ERROR>>> {
    const startTime = Date.now()
    log.info('Listing teams')
    fileLog.info('COOLIFY', 'List teams')

    const result = await this.mcpService.listTeams()

    if (isErr(result)) {
      const error = result.error
      log.error(`Failed to list teams: ${error.message}`)
      fileLog.error('COOLIFY', 'List teams failed', { error: error.message })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: error.message })
    }

    log.success(`Listed ${result.value.length} teams`)
    fileLog.info('COOLIFY', 'Teams listed', {
      count: result.value.length,
      duration_ms: Date.now() - startTime
    })
    return ok(result.value)
  }

  /**
   * Gets available destinations for a server.
   *
   * @param serverUuid - Server UUID
   * @returns Result with destinations or error
   */
  async getServerDestinations(
    serverUuid: string
  ): Promise<Result<ICoolifyDestination[], ResultError<typeof AppErrorCode.COOLIFY_ERROR>>> {
    const startTime = Date.now()
    fileLog.info('COOLIFY', 'Get server destinations', { serverUuid })

    const result = await this.mcpService.getServerDestinations(serverUuid)

    if (isErr(result)) {
      const error = result.error
      fileLog.error('COOLIFY', 'Get server destinations failed', {
        serverUuid,
        error: error.message
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: error.message })
    }

    fileLog.info('COOLIFY', 'Server destinations retrieved', {
      serverUuid,
      count: result.value.length,
      duration_ms: Date.now() - startTime
    })
    return ok(result.value)
  }

  /**
   * Lists all applications.
   *
   * @param teamId - Optional team ID to filter by
   * @param projectId - Optional project ID to filter by
   * @returns Result with applications list or error
   */
  async listApplications(
    teamId?: string,
    projectId?: string
  ): Promise<Result<ICoolifyApplication[], ResultError<typeof AppErrorCode.COOLIFY_ERROR>>> {
    const startTime = Date.now()
    log.info('Listing applications')
    fileLog.info('COOLIFY', 'List applications', { teamId, projectId })

    const result = await this.mcpService.listApplications(teamId, projectId)

    if (isErr(result)) {
      const error = result.error
      log.error(`Failed to list applications: ${error.message}`)
      fileLog.error('COOLIFY', 'List applications failed', { error: error.message })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: error.message })
    }

    log.success(`Listed ${result.value.length} applications`)
    fileLog.info('COOLIFY', 'Applications listed', {
      count: result.value.length,
      duration_ms: Date.now() - startTime
    })
    return ok(result.value)
  }

  /**
   * Deletes an application.
   *
   * @param appUuid - Application UUID
   * @returns Result indicating success or error
   */
  async deleteApplication(
    appUuid: string
  ): Promise<Result<ICoolifyDeleteResult, ResultError<typeof AppErrorCode.COOLIFY_ERROR>>> {
    const startTime = Date.now()
    log.info(`Deleting application ${appUuid}`)
    fileLog.info('COOLIFY', 'Delete application', { appUuid })

    const result = await this.mcpService.deleteApplication(appUuid)

    if (isErr(result)) {
      const error = result.error
      log.error(`Failed to delete application: ${error.message}`)
      fileLog.error('COOLIFY', 'Delete application failed', {
        appUuid,
        error: error.message
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: error.message })
    }

    log.success(`Application deleted: ${appUuid}`)
    fileLog.info('COOLIFY', 'Application deleted', {
      appUuid,
      duration_ms: Date.now() - startTime
    })
    return ok(result.value)
  }

  /**
   * Updates an application configuration.
   *
   * @param appUuid - Application UUID
   * @param options - Update options
   * @returns Result with updated application or error
   */
  async updateApplication(
    appUuid: string,
    options: ICoolifyUpdateOptions
  ): Promise<Result<ICoolifyApplication, ResultError<typeof AppErrorCode.COOLIFY_ERROR>>> {
    const startTime = Date.now()
    log.info(`Updating application ${appUuid}`)
    fileLog.info('COOLIFY', 'Update application', { appUuid, options })

    const result = await this.mcpService.updateApplication(appUuid, options)

    if (isErr(result)) {
      const error = result.error
      log.error(`Failed to update application: ${error.message}`)
      fileLog.error('COOLIFY', 'Update application failed', {
        appUuid,
        error: error.message
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: error.message })
    }

    log.success(`Application updated: ${appUuid}`)
    fileLog.info('COOLIFY', 'Application updated', {
      appUuid,
      duration_ms: Date.now() - startTime
    })
    return ok(result.value)
  }

  /**
   * Gets application logs.
   *
   * @param appUuid - Application UUID
   * @param options - Log retrieval options
   * @returns Result with logs or error
   */
  async getApplicationLogs(
    appUuid: string,
    options: ICoolifyLogsOptions = {}
  ): Promise<Result<ICoolifyLogs, ResultError<typeof AppErrorCode.COOLIFY_ERROR>>> {
    const startTime = Date.now()
    log.info(`Getting logs for application ${appUuid}`)
    fileLog.info('COOLIFY', 'Get application logs', { appUuid, options })

    const result = await this.mcpService.getApplicationLogs(appUuid, options)

    if (isErr(result)) {
      const error = result.error
      log.error(`Failed to get logs: ${error.message}`)
      fileLog.error('COOLIFY', 'Get logs failed', {
        appUuid,
        error: error.message
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: error.message })
    }

    log.success(`Logs retrieved for application: ${appUuid}`)
    fileLog.info('COOLIFY', 'Logs retrieved', {
      appUuid,
      logCount: result.value.logs.length,
      duration_ms: Date.now() - startTime
    })
    return ok(result.value)
  }

  /**
   * Gets deployment history for an application.
   *
   * @param appUuid - Application UUID
   * @returns Result with deployment history or error
   */
  async getApplicationDeploymentHistory(
    appUuid: string
  ): Promise<Result<ICoolifyDeployment[], ResultError<typeof AppErrorCode.COOLIFY_ERROR>>> {
    const startTime = Date.now()
    log.info(`Getting deployment history for ${appUuid}`)
    fileLog.info('COOLIFY', 'Get deployment history', { appUuid })

    const result = await this.mcpService.getApplicationDeploymentHistory(appUuid)

    if (isErr(result)) {
      const error = result.error
      log.error(`Failed to get deployment history: ${error.message}`)
      fileLog.error('COOLIFY', 'Get deployment history failed', {
        appUuid,
        error: error.message
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: error.message })
    }

    log.success(`Deployment history retrieved for ${appUuid}`)
    fileLog.info('COOLIFY', 'Deployment history retrieved', {
      appUuid,
      count: result.value.length,
      duration_ms: Date.now() - startTime
    })
    return ok(result.value)
  }

  /**
   * Starts a stopped application.
   *
   * @param appUuid - Application UUID
   * @returns Result with application status or error
   */
  async startApplication(
    appUuid: string
  ): Promise<Result<ICoolifyApplication, ResultError<typeof AppErrorCode.COOLIFY_ERROR>>> {
    const startTime = Date.now()
    log.info(`Starting application ${appUuid}`)
    fileLog.info('COOLIFY', 'Start application', { appUuid })

    const result = await this.mcpService.startApplication(appUuid)

    if (isErr(result)) {
      const error = result.error
      log.error(`Failed to start application: ${error.message}`)
      fileLog.error('COOLIFY', 'Start application failed', {
        appUuid,
        error: error.message
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: error.message })
    }

    log.success(`Application started: ${appUuid}`)
    fileLog.info('COOLIFY', 'Application started', {
      appUuid,
      duration_ms: Date.now() - startTime
    })
    return ok(result.value)
  }

  /**
   * Stops a running application.
   *
   * @param appUuid - Application UUID
   * @returns Result with application status or error
   */
  async stopApplication(
    appUuid: string
  ): Promise<Result<ICoolifyApplication, ResultError<typeof AppErrorCode.COOLIFY_ERROR>>> {
    const startTime = Date.now()
    log.info(`Stopping application ${appUuid}`)
    fileLog.info('COOLIFY', 'Stop application', { appUuid })

    const result = await this.mcpService.stopApplication(appUuid)

    if (isErr(result)) {
      const error = result.error
      log.error(`Failed to stop application: ${error.message}`)
      fileLog.error('COOLIFY', 'Stop application failed', {
        appUuid,
        error: error.message
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: error.message })
    }

    log.success(`Application stopped: ${appUuid}`)
    fileLog.info('COOLIFY', 'Application stopped', {
      appUuid,
      duration_ms: Date.now() - startTime
    })
    return ok(result.value)
  }

  /**
   * Restarts an application.
   *
   * @param appUuid - Application UUID
   * @returns Result with application status or error
   */
  async restartApplication(
    appUuid: string
  ): Promise<Result<ICoolifyApplication, ResultError<typeof AppErrorCode.COOLIFY_ERROR>>> {
    const startTime = Date.now()
    log.info(`Restarting application ${appUuid}`)
    fileLog.info('COOLIFY', 'Restart application', { appUuid })

    const result = await this.mcpService.restartApplication(appUuid)

    if (isErr(result)) {
      const error = result.error
      log.error(`Failed to restart application: ${error.message}`)
      fileLog.error('COOLIFY', 'Restart application failed', {
        appUuid,
        error: error.message
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: error.message })
    }

    log.success(`Application restarted: ${appUuid}`)
    fileLog.info('COOLIFY', 'Application restarted', {
      appUuid,
      duration_ms: Date.now() - startTime
    })
    return ok(result.value)
  }
}

let instance: CoolifyService | null = null

/**
 * Gets the singleton CoolifyService instance.
 *
 * @returns The CoolifyService instance
 */
export function getCoolifyService(): CoolifyService {
  if (!instance) {
    instance = new CoolifyService()
  }
  return instance
}

export type { ICoolifyServer, ICoolifyDestination }
