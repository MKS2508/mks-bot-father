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

/**
 * Result of a delete operation.
 */
export interface ICoolifyDeleteResult {
  /** Whether the deletion was successful */
  success: boolean
  /** Optional message */
  message?: string
}

/**
 * Options for updating a Coolify application.
 */
export interface ICoolifyUpdateOptions {
  /** Application name */
  name?: string
  /** Application description */
  description?: string
  /** Build pack type */
  buildPack?: 'dockerfile' | 'nixpacks' | 'static'
  /** Git branch */
  gitBranch?: string
  /** Ports to expose */
  portsExposes?: string
  /** Install command (nixpacks) */
  installCommand?: string
  /** Build command */
  buildCommand?: string
  /** Start command */
  startCommand?: string
}

/**
 * Options for retrieving application logs.
 */
export interface ICoolifyLogsOptions {
  /** Follow logs in real-time */
  follow?: boolean
  /** Number of lines to retrieve */
  tail?: number
}

/**
 * Application logs response.
 */
export interface ICoolifyLogs {
  /** Log lines */
  logs: string[]
  /** Timestamp of log retrieval */
  timestamp: string
}

/**
 * Deployment record in history.
 */
export interface ICoolifyDeployment {
  /** Deployment ID */
  id: string
  /** Deployment UUID */
  uuid: string
  /** Deployment status */
  status: 'building' | 'built' | 'failed' | 'deploying'
  /** Creation timestamp */
  createdAt: string
  /** Completion timestamp */
  finishedAt?: string
  /** Commit hash if available */
  commit?: string
}

/**
 * Application details returned from API.
 */
export interface ICoolifyApplication {
  /** Application UUID */
  uuid: string
  /** Application name */
  name: string
  /** Application description */
  description?: string
  /** Current status */
  status: string
  /** FQDN if configured */
  fqdn?: string
  /** Git repository URL */
  gitRepository?: string
  /** Git branch */
  gitBranch?: string
  /** Build pack type */
  buildPack?: string
  /** Ports exposed */
  portsExposes?: string
}
