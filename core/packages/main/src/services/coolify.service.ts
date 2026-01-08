/**
 * Coolify service for mks-bot-father.
 *
 * @module
 */

import { ok, err, type Result, type ResultError } from '@mks2508/no-throw'
import { createLogger } from '../utils/index.js'
import { getConfigService } from './config.service.js'
import {
  type ICoolifyAppOptions,
  type ICoolifyAppResult,
  type ICoolifyDeployOptions,
  type ICoolifyDeployResult,
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
}

/**
 * Coolify server type.
 */
export interface ICoolifyServer {
  uuid: string
  name: string
}

/**
 * Coolify destination type.
 */
export interface ICoolifyDestination {
  uuid: string
  name: string
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
    const config = getConfigService()
    this.baseUrl = config.getCoolifyUrl()
    this.token = config.getCoolifyToken()

    if (!this.baseUrl) {
      log.error('No Coolify URL configured')
      log.info('Configure with: mbf config set coolify.url <url>')
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: 'No Coolify URL configured' })
    }

    if (!this.token) {
      log.error('No Coolify token configured')
      log.info('Configure with: mbf config set coolify.token <token>')
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: 'No Coolify token configured' })
    }

    log.debug('Coolify connection configured')
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
    if (!this.baseUrl || !this.token) {
      return { error: 'Coolify not configured', status: 0 }
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
      let data: T | undefined

      try {
        data = text ? JSON.parse(text) : undefined
      } catch {
        if (!response.ok) {
          return { error: text || `HTTP ${response.status}`, status: response.status }
        }
      }

      if (!response.ok) {
        const errorMessage =
          (data as { message?: string } | undefined)?.message ||
          `HTTP ${response.status}`
        return { error: errorMessage, status: response.status }
      }

      return { data, status: response.status }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { error: message, status: 0 }
    }
  }

  /**
   * Deploys an application.
   *
   * @param options - Deployment options
   * @returns Result with deployment info or error
   */
  async deploy(
    options: ICoolifyDeployOptions
  ): Promise<Result<ICoolifyDeployResult, ResultError<typeof AppErrorCode.COOLIFY_ERROR>>> {
    if (!options.uuid && !options.tag) {
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: 'Either uuid or tag is required' })
    }

    log.info(`Deploying application ${options.uuid || options.tag}`)

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
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: result.error })
    }

    log.success(`Deployment started: ${result.data?.deployment_uuid}`)
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
   * @returns Result with application UUID or error
   */
  async createApplication(
    options: ICoolifyAppOptions
  ): Promise<Result<ICoolifyAppResult, ResultError<typeof AppErrorCode.COOLIFY_ERROR>>> {
    log.info(`Creating application ${options.name}`)

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
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: result.error })
    }

    log.success(`Application created: ${result.data?.uuid}`)
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
    log.info(`Setting environment variables for ${appUuid}`)

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
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: result.error })
    }

    log.success('Environment variables set')
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
    const result = await this.request<{ status: string }>(
      `/applications/${appUuid}`
    )

    if (result.error) {
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: result.error })
    }

    return ok(result.data?.status || 'unknown')
  }

  /**
   * Lists available servers in Coolify.
   *
   * @returns Result with servers or error
   */
  async listServers(): Promise<Result<ICoolifyServer[], ResultError<typeof AppErrorCode.COOLIFY_ERROR>>> {
    const result = await this.request<ICoolifyServer[]>('/servers')

    if (result.error) {
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: result.error })
    }

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
    const result = await this.request<{
      destinations: ICoolifyDestination[]
    }>(`/servers/${serverUuid}`)

    if (result.error) {
      return err({ code: AppErrorCode.COOLIFY_ERROR, message: result.error })
    }

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
