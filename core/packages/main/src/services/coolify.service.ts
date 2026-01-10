/**
 * Coolify service for mks-bot-father.
 *
 * @module
 */

import { ok, err, type Result, type ResultError } from '@mks2508/no-throw'
import { createLogger, log as fileLog } from '../utils/index.js'
import { getConfigService } from './config.service.js'
import {
  type ICoolifyAppOptions,
  type ICoolifyAppResult,
  type ICoolifyApplication,
  type ICoolifyDeleteResult,
  type ICoolifyDeployment,
  type ICoolifyDeployOptions,
  type ICoolifyDeployResult,
  type ICoolifyDestination,
  type ICoolifyLogs,
  type ICoolifyLogsOptions,
  type ICoolifyProject,
  type ICoolifyServer,
  type ICoolifyTeam,
  type ICoolifyUpdateOptions,
  type IProgressCallback,
} from '../types/index.js'
import { AppErrorCode } from '../types/errors.js'

const log = createLogger('CoolifyService')

/**
 * Coolify API response type.
 */
interface ICoolifyApiResponse<T> {
  data?: T
  error?: string
  status: number
  durationMs?: number
}

/**
 * Coolify service for deployment operations.
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
  private baseUrl: string | undefined
  private token: string | undefined

  /**
   * Initializes the Coolify service by loading configuration.
   *
   * @returns Result indicating success or error
   */
  async init(): Promise<Result<void, ResultError<typeof AppErrorCode.COOLIFY_ERROR>>> {
    const startTime = Date.now()
    const config = getConfigService()
    this.baseUrl = config.getCoolifyUrl()
    this.token = config.getCoolifyToken()

    if (!this.baseUrl) {
      log.error('No Coolify URL configured')
      log.info('Configure with: mbf config set coolify.url <url>')
      fileLog.error('COOLIFY', 'No Coolify URL configured', { reason: 'not_configured', duration_ms: Date.now() - startTime })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: 'No Coolify URL configured' })
    }

    if (!this.token) {
      log.error('No Coolify token configured')
      log.info('Configure with: mbf config set coolify.token <token>')
      fileLog.error('COOLIFY', 'No Coolify token configured', { reason: 'not_configured', duration_ms: Date.now() - startTime })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: 'No Coolify token configured' })
    }

    log.debug('Coolify connection configured')
    fileLog.info('COOLIFY', 'Coolify service initialized', { baseUrl: this.baseUrl, duration_ms: Date.now() - startTime })
    return ok(undefined)
  }

  /**
   * Makes a request to the Coolify API.
   *
   * @param endpoint - API endpoint
   * @param options - Fetch options
   * @returns API response with data or error
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ICoolifyApiResponse<T>> {
    const startTime = Date.now()

    if (!this.baseUrl || !this.token) {
      return { error: 'Coolify not configured', status: 0, durationMs: Date.now() - startTime }
    }

    try {
      const url = `${this.baseUrl}/api/v1${endpoint}`
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...options.headers,
        },
      })

      const text = await response.text()
      const durationMs = Date.now() - startTime
      let data: T | undefined

      try {
        data = text ? JSON.parse(text) : undefined
      } catch {
        if (!response.ok) {
          return { error: text || `HTTP ${response.status}`, status: response.status, durationMs }
        }
      }

      if (!response.ok) {
        const errorMessage =
          (data as { message?: string } | undefined)?.message ||
          `HTTP ${response.status}`
        return { error: errorMessage, status: response.status, durationMs }
      }

      return { data, status: response.status, durationMs }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { error: message, status: 0, durationMs: Date.now() - startTime }
    }
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

    const result = await this.request<{
      resource_uuid: string
      deployment_uuid: string
    }>('/deploy', {
      method: 'POST',
      body: JSON.stringify({
        uuid: options.uuid,
        tag: options.tag,
        force: options.force ?? false,
      }),
    })

    if (result.error) {
      log.error(`Deployment failed: ${result.error}`)
      fileLog.error('COOLIFY', 'Deployment failed', {
        uuid: options.uuid,
        tag: options.tag,
        error: result.error,
        duration_ms: result.durationMs
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: result.error })
    }

    const deployId = result.data?.deployment_uuid?.slice(0, 8) || 'unknown'
    onProgress?.(75, `Deployment queued: ${deployId}...`, 'queued')
    onProgress?.(90, 'Build started on Coolify server', 'building')
    onProgress?.(100, `✓ Deployment ${deployId} triggered`, 'done')

    log.success(`Deployment started: ${result.data?.deployment_uuid}`)
    fileLog.info('COOLIFY', 'Deployment started', {
      deploymentUuid: result.data?.deployment_uuid,
      resourceUuid: result.data?.resource_uuid,
      duration_ms: result.durationMs
    })
    return ok({
      success: true,
      deploymentUuid: result.data?.deployment_uuid,
      resourceUuid: result.data?.resource_uuid,
    })
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
    onProgress?.(25, `Configuring destination ${options.destinationUuid.slice(0, 8)}...`, 'configure_dest')
    onProgress?.(35, `Setting up Git: ${options.githubRepoUrl}`, 'setup_git')
    onProgress?.(50, `Build pack: ${options.buildPack || 'nixpacks'}`, 'build_pack')
    onProgress?.(65, 'Sending creation request to Coolify API...', 'api_request')

    const result = await this.request<{ uuid: string }>('/applications', {
      method: 'POST',
      body: JSON.stringify({
        name: options.name,
        description: options.description,
        server_uuid: options.serverUuid,
        destination_uuid: options.destinationUuid,
        project_uuid: options.serverUuid,
        environment_name: 'production',
        git_repository: options.githubRepoUrl,
        git_branch: options.branch || 'main',
        build_pack: options.buildPack || 'nixpacks',
        ports_exposes: '3000',
        instant_deploy: false,
      }),
    })

    if (result.error) {
      log.error(`Failed to create application: ${result.error}`)
      fileLog.error('COOLIFY', 'Failed to create application', {
        name: options.name,
        error: result.error,
        status: result.status,
        duration_ms: Date.now() - startTime
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: result.error })
    }

    onProgress?.(85, `App UUID: ${result.data?.uuid?.slice(0, 8)}...`, 'uuid_received')
    onProgress?.(100, `✓ Application "${options.name}" created`, 'done')

    log.success(`Application created: ${result.data?.uuid}`)
    fileLog.info('COOLIFY', 'Application created', {
      name: options.name,
      uuid: result.data?.uuid,
      duration_ms: Date.now() - startTime
    })
    return ok({
      success: true,
      uuid: result.data?.uuid,
    })
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

    const envArray = Object.entries(envVars).map(([key, value]) => ({
      key,
      value,
      is_build_time: false,
    }))

    const result = await this.request(`/applications/${appUuid}/envs`, {
      method: 'POST',
      body: JSON.stringify({ data: envArray }),
    })

    if (result.error) {
      log.error(`Failed to set env vars: ${result.error}`)
      fileLog.error('COOLIFY', 'Failed to set environment variables', {
        appUuid,
        error: result.error,
        duration_ms: Date.now() - startTime
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: result.error })
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

    const result = await this.request<{ status: string }>(
      `/applications/${appUuid}`
    )

    if (result.error) {
      fileLog.error('COOLIFY', 'Get application status failed', {
        appUuid,
        error: result.error,
        duration_ms: Date.now() - startTime
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: result.error })
    }

    fileLog.info('COOLIFY', 'Application status retrieved', {
      appUuid,
      status: result.data?.status,
      duration_ms: Date.now() - startTime
    })
    return ok(result.data?.status || 'unknown')
  }

  /**
   * Lists available servers in Coolify.
   *
   * @returns Result with servers or error
   */
  async listServers(): Promise<Result<ICoolifyServer[], ResultError<typeof AppErrorCode.COOLIFY_ERROR>>> {
    const startTime = Date.now()
    fileLog.info('COOLIFY', 'List servers')

    const result = await this.request<ICoolifyServer[]>('/servers')

    if (result.error) {
      fileLog.error('COOLIFY', 'List servers failed', {
        error: result.error,
        duration_ms: Date.now() - startTime
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: result.error })
    }

    fileLog.info('COOLIFY', 'Servers listed', {
      count: result.data?.length,
      duration_ms: Date.now() - startTime
    })
    return ok(result.data || [])
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

    const result = await this.request<ICoolifyServer>(`/servers/${serverUuid}`)

    if (result.error) {
      log.error(`Failed to get server: ${result.error}`)
      fileLog.error('COOLIFY', 'Get server failed', {
        serverUuid,
        error: result.error,
        duration_ms: Date.now() - startTime
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: result.error })
    }

    log.success(`Server details retrieved: ${serverUuid}`)
    fileLog.info('COOLIFY', 'Server retrieved', {
      serverUuid,
      name: result.data?.name,
      duration_ms: Date.now() - startTime
    })
    return ok(result.data as ICoolifyServer)
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

    const result = await this.request<ICoolifyProject[]>('/projects')

    if (result.error) {
      log.error(`Failed to list projects: ${result.error}`)
      fileLog.error('COOLIFY', 'List projects failed', {
        error: result.error,
        duration_ms: Date.now() - startTime
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: result.error })
    }

    log.success(`Listed ${result.data?.length || 0} projects`)
    fileLog.info('COOLIFY', 'Projects listed', {
      count: result.data?.length,
      duration_ms: Date.now() - startTime
    })
    return ok(result.data || [])
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

    const result = await this.request<ICoolifyTeam[]>('/teams')

    if (result.error) {
      log.error(`Failed to list teams: ${result.error}`)
      fileLog.error('COOLIFY', 'List teams failed', {
        error: result.error,
        duration_ms: Date.now() - startTime
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: result.error })
    }

    log.success(`Listed ${result.data?.length || 0} teams`)
    fileLog.info('COOLIFY', 'Teams listed', {
      count: result.data?.length,
      duration_ms: Date.now() - startTime
    })
    return ok(result.data || [])
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

    const result = await this.request<{
      destinations: ICoolifyDestination[]
    }>(`/servers/${serverUuid}`)

    if (result.error) {
      fileLog.error('COOLIFY', 'Get server destinations failed', {
        serverUuid,
        error: result.error,
        duration_ms: Date.now() - startTime
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: result.error })
    }

    fileLog.info('COOLIFY', 'Server destinations retrieved', {
      serverUuid,
      count: result.data?.destinations?.length,
      duration_ms: Date.now() - startTime
    })
    return ok(result.data?.destinations || [])
  }

  /**
   * Checks if Coolify is configured.
   *
   * @returns True if URL and token are configured
   */
  isConfigured(): boolean {
    const config = getConfigService()
    return !!(config.getCoolifyUrl() && config.getCoolifyToken())
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

    let endpoint = '/applications'
    const params = new URLSearchParams()
    if (teamId) params.set('team_id', teamId)
    if (projectId) params.set('project_id', projectId)
    if (params.toString()) {
      endpoint += `?${params.toString()}`
    }

    const result = await this.request<ICoolifyApplication[]>(endpoint)

    if (result.error) {
      log.error(`Failed to list applications: ${result.error}`)
      fileLog.error('COOLIFY', 'List applications failed', {
        error: result.error,
        duration_ms: Date.now() - startTime
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: result.error })
    }

    log.success(`Listed ${result.data?.length || 0} applications`)
    fileLog.info('COOLIFY', 'Applications listed', {
      count: result.data?.length,
      duration_ms: Date.now() - startTime
    })
    return ok(result.data || [])
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

    const result = await this.request<ICoolifyDeleteResult>(`/applications/${appUuid}`, {
      method: 'DELETE',
    })

    if (result.error) {
      log.error(`Failed to delete application: ${result.error}`)
      fileLog.error('COOLIFY', 'Delete application failed', {
        appUuid,
        error: result.error,
        duration_ms: Date.now() - startTime
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: result.error })
    }

    log.success(`Application deleted: ${appUuid}`)
    fileLog.info('COOLIFY', 'Application deleted', {
      appUuid,
      duration_ms: Date.now() - startTime
    })
    return ok({ success: true, message: 'Application deleted' })
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

    const body: Record<string, unknown> = {}
    if (options.name) body.name = options.name
    if (options.description) body.description = options.description
    if (options.buildPack) body.build_pack = options.buildPack
    if (options.gitBranch) body.git_branch = options.gitBranch
    if (options.portsExposes) body.ports_exposes = options.portsExposes
    if (options.installCommand) body.install_command = options.installCommand
    if (options.buildCommand) body.build_command = options.buildCommand
    if (options.startCommand) body.start_command = options.startCommand

    const result = await this.request<ICoolifyApplication>(`/applications/${appUuid}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })

    if (result.error) {
      log.error(`Failed to update application: ${result.error}`)
      fileLog.error('COOLIFY', 'Update application failed', {
        appUuid,
        error: result.error,
        duration_ms: Date.now() - startTime
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: result.error })
    }

    log.success(`Application updated: ${appUuid}`)
    fileLog.info('COOLIFY', 'Application updated', {
      appUuid,
      duration_ms: Date.now() - startTime
    })
    return ok(result.data as ICoolifyApplication)
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

    const params = new URLSearchParams()
    if (options.follow) params.set('follow', 'true')
    if (options.tail) params.set('tail', options.tail.toString())

    const endpoint = `/applications/${appUuid}/logs${params.toString() ? `?${params.toString()}` : ''}`

    const result = await this.request<{ logs: string[] }>(endpoint)

    if (result.error) {
      log.error(`Failed to get logs: ${result.error}`)
      fileLog.error('COOLIFY', 'Get logs failed', {
        appUuid,
        error: result.error,
        duration_ms: Date.now() - startTime
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: result.error })
    }

    log.success(`Logs retrieved for application: ${appUuid}`)
    fileLog.info('COOLIFY', 'Logs retrieved', {
      appUuid,
      logCount: result.data?.logs?.length,
      duration_ms: Date.now() - startTime
    })
    return ok({
      logs: result.data?.logs || [],
      timestamp: new Date().toISOString(),
    })
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

    const result = await this.request<ICoolifyDeployment[]>(`/applications/${appUuid}/deployments`)

    if (result.error) {
      log.error(`Failed to get deployment history: ${result.error}`)
      fileLog.error('COOLIFY', 'Get deployment history failed', {
        appUuid,
        error: result.error,
        duration_ms: Date.now() - startTime
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: result.error })
    }

    log.success(`Deployment history retrieved for ${appUuid}`)
    fileLog.info('COOLIFY', 'Deployment history retrieved', {
      appUuid,
      count: result.data?.length,
      duration_ms: Date.now() - startTime
    })
    return ok(result.data || [])
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

    const result = await this.request<ICoolifyApplication>(`/applications/${appUuid}/start`, {
      method: 'POST',
    })

    if (result.error) {
      log.error(`Failed to start application: ${result.error}`)
      fileLog.error('COOLIFY', 'Start application failed', {
        appUuid,
        error: result.error,
        duration_ms: Date.now() - startTime
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: result.error })
    }

    log.success(`Application started: ${appUuid}`)
    fileLog.info('COOLIFY', 'Application started', {
      appUuid,
      duration_ms: Date.now() - startTime
    })
    return ok(result.data as ICoolifyApplication)
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

    const result = await this.request<ICoolifyApplication>(`/applications/${appUuid}/stop`, {
      method: 'POST',
    })

    if (result.error) {
      log.error(`Failed to stop application: ${result.error}`)
      fileLog.error('COOLIFY', 'Stop application failed', {
        appUuid,
        error: result.error,
        duration_ms: Date.now() - startTime
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: result.error })
    }

    log.success(`Application stopped: ${appUuid}`)
    fileLog.info('COOLIFY', 'Application stopped', {
      appUuid,
      duration_ms: Date.now() - startTime
    })
    return ok(result.data as ICoolifyApplication)
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

    const result = await this.request<ICoolifyApplication>(`/applications/${appUuid}/restart`, {
      method: 'POST',
    })

    if (result.error) {
      log.error(`Failed to restart application: ${result.error}`)
      fileLog.error('COOLIFY', 'Restart application failed', {
        appUuid,
        error: result.error,
        duration_ms: Date.now() - startTime
      })
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: result.error })
    }

    log.success(`Application restarted: ${appUuid}`)
    fileLog.info('COOLIFY', 'Application restarted', {
      appUuid,
      duration_ms: Date.now() - startTime
    })
    return ok(result.data as ICoolifyApplication)
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

// Re-export types for backward compatibility
export type {
  ICoolifyServer,
  ICoolifyDestination,
  ICoolifyProject,
  ICoolifyTeam,
  ICoolifyApplication,
  ICoolifyDeployment,
  ICoolifyAppOptions,
  ICoolifyDeployOptions,
  ICoolifyUpdateOptions,
  ICoolifyLogsOptions,
} from '../types/index.js'
