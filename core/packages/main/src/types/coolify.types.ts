/**
 * Coolify types for mks-bot-father.
 *
 * @module
 */

/**
 * Options for deploying to Coolify.
 */
export interface ICoolifyDeployOptions {
  /** Application UUID */
  uuid?: string
  /** Application tag */
  tag?: string
  /** Force rebuild without cache */
  force?: boolean
}

/**
 * Result of a Coolify deployment.
 */
export interface ICoolifyDeployResult {
  /** Whether the deployment started successfully */
  success: boolean
  /** Deployment UUID */
  deploymentUuid?: string
  /** Resource UUID */
  resourceUuid?: string
  /** Error message if failed */
  error?: string
}

/**
 * Options for creating a Coolify application.
 */
export interface ICoolifyAppOptions {
  /** Application name */
  name: string
  /** Application description */
  description?: string
  /** Server UUID */
  serverUuid: string
  /** Destination UUID */
  destinationUuid: string
  /** GitHub repository URL */
  githubRepoUrl: string
  /** Git branch */
  branch?: string
  /** Build pack type */
  buildPack?: 'dockerfile' | 'nixpacks' | 'static'
  /** Environment variables */
  envVars?: Record<string, string>
}

/**
 * Result of creating a Coolify application.
 */
export interface ICoolifyAppResult {
  /** Whether the application was created */
  success: boolean
  /** Application UUID */
  uuid?: string
  /** Error message if failed */
  error?: string
}
