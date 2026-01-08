/**
 * Coolify deployment management for mks-bot-father.
 *
 * @module
 */

import { component } from '@mks2508/better-logger'
import { getConfigManager } from '../config/index.js'
import type {
  ICoolifyAppOptions,
  ICoolifyAppResult,
  ICoolifyDeployOptions,
  ICoolifyDeployResult,
} from '../types.js'

const log = component('Coolify')

/**
 * Manages Coolify deployment operations.
 *
 * @example
 * ```typescript
 * const coolify = getCoolifyManager()
 * await coolify.init()
 * await coolify.deploy({ uuid: 'app-uuid' })
 * ```
 */
export class CoolifyManager {
  private baseUrl: string | undefined
  private token: string | undefined

  /**
   * Initializes the Coolify manager by loading configuration.
   *
   * @returns True if initialization succeeded
   */
  async init(): Promise<boolean> {
    const config = getConfigManager()
    this.baseUrl = config.getCoolifyUrl()
    this.token = config.getCoolifyToken()

    if (!this.baseUrl) {
      log.error('No Coolify URL configured')
      log.info('Configure with: mbf config set coolify.url <url>')
      return false
    }

    if (!this.token) {
      log.error('No Coolify token configured')
      log.info('Configure with: mbf config set coolify.token <token>')
      return false
    }

    log.debug('Coolify connection configured')
    return true
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data?: T; error?: string; status: number }> {
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
   * @returns Result with deployment and resource UUIDs
   */
  async deploy(options: ICoolifyDeployOptions): Promise<ICoolifyDeployResult> {
    if (!options.uuid && !options.tag) {
      return { success: false, error: 'Either uuid or tag is required' }
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
      return { success: false, error: result.error }
    }

    log.success(`Deployment started: ${result.data?.deployment_uuid}`)
    return {
      success: true,
      deploymentUuid: result.data?.deployment_uuid,
      resourceUuid: result.data?.resource_uuid,
    }
  }

  /**
   * Creates a new application in Coolify.
   *
   * @param options - Application options
   * @returns Result with application UUID
   */
  async createApplication(
    options: ICoolifyAppOptions
  ): Promise<ICoolifyAppResult> {
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
      return { success: false, error: result.error }
    }

    log.success(`Application created: ${result.data?.uuid}`)
    return {
      success: true,
      uuid: result.data?.uuid,
    }
  }

  /**
   * Sets environment variables for an application.
   *
   * @param appUuid - Application UUID
   * @param envVars - Environment variables to set
   * @returns Result indicating success or failure
   */
  async setEnvironmentVariables(
    appUuid: string,
    envVars: Record<string, string>
  ): Promise<{ success: boolean; error?: string }> {
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
      return { success: false, error: result.error }
    }

    log.success('Environment variables set')
    return { success: true }
  }

  /**
   * Gets the status of an application.
   *
   * @param appUuid - Application UUID
   * @returns Status string or error
   */
  async getApplicationStatus(
    appUuid: string
  ): Promise<{ status?: string; error?: string }> {
    const result = await this.request<{ status: string }>(
      `/applications/${appUuid}`
    )

    if (result.error) {
      return { error: result.error }
    }

    return { status: result.data?.status }
  }

  /**
   * Lists available servers in Coolify.
   *
   * @returns Array of servers with UUID and name
   */
  async listServers(): Promise<{
    servers?: Array<{ uuid: string; name: string }>
    error?: string
  }> {
    const result = await this.request<Array<{ uuid: string; name: string }>>(
      '/servers'
    )

    if (result.error) {
      return { error: result.error }
    }

    return { servers: result.data }
  }

  /**
   * Gets available destinations for a server.
   *
   * @param serverUuid - Server UUID
   * @returns Array of destinations with UUID and name
   */
  async getServerDestinations(serverUuid: string): Promise<{
    destinations?: Array<{ uuid: string; name: string }>
    error?: string
  }> {
    const result = await this.request<{
      destinations: Array<{ uuid: string; name: string }>
    }>(`/servers/${serverUuid}`)

    if (result.error) {
      return { error: result.error }
    }

    return { destinations: result.data?.destinations }
  }

  /**
   * Checks if Coolify is configured.
   *
   * @returns True if URL and token are configured
   */
  isConfigured(): boolean {
    const config = getConfigManager()
    return !!(config.getCoolifyUrl() && config.getCoolifyToken())
  }
}

let instance: CoolifyManager | null = null

/**
 * Gets the singleton CoolifyManager instance.
 *
 * @returns The CoolifyManager instance
 */
export function getCoolifyManager(): CoolifyManager {
  if (!instance) {
    instance = new CoolifyManager()
  }
  return instance
}
