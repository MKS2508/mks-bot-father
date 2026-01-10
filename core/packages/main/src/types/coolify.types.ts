/**
 * Coolify types for mks-bot-father.
 *
 * Internal options use camelCase for consistency with TypeScript conventions.
 * API response types use snake_case to match Coolify API responses.
 *
 * @module
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT OPTIONS (camelCase - internal use)
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT TYPES (camelCase wrapper with success flag)
// ═══════════════════════════════════════════════════════════════════════════════

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
 * Application logs response.
 */
export interface ICoolifyLogs {
  /** Log lines */
  logs: string[]
  /** Timestamp of log retrieval */
  timestamp: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// API RESPONSE TYPES (snake_case - matches Coolify API)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Deployment record from API (snake_case).
 */
export interface ICoolifyDeployment {
  /** Deployment ID */
  id: number
  /** Deployment UUID */
  uuid: string
  /** Deployment status */
  status: string
  /** Application ID */
  application_id?: number
  /** Pull request ID if applicable */
  pull_request_id?: number | null
  /** Force rebuild flag */
  force_rebuild?: boolean
  /** Commit hash */
  commit?: string | null
  /** Rollback flag */
  rollback?: boolean
  /** Commit message */
  commit_message?: string | null
  /** Creation timestamp */
  created_at: string
  /** Update timestamp */
  updated_at: string
}

/**
 * Application details from API (snake_case).
 */
export interface ICoolifyApplication {
  /** Application UUID */
  uuid: string
  /** Application name */
  name: string
  /** Application description */
  description?: string | null
  /** Current status (e.g., "running:unknown", "stopped") */
  status: string
  /** FQDN if configured */
  fqdn?: string | null
  /** Git repository (e.g., "MKS2508/repo-name") */
  git_repository?: string | null
  /** Git branch */
  git_branch?: string | null
  /** Full git URL */
  git_full_url?: string | null
  /** Build pack type */
  build_pack?: string | null
  /** Ports exposed */
  ports_exposes?: string | null
  /** Server status (boolean) */
  server_status?: boolean
  /** Environment ID */
  environment_id?: number
  /** Destination info */
  destination?: {
    uuid: string
    name: string
    server?: {
      uuid: string
      name: string
      ip: string
    }
  } | null
  /** Install command */
  install_command?: string | null
  /** Build command */
  build_command?: string | null
  /** Start command */
  start_command?: string | null
  /** Creation timestamp */
  created_at?: string
  /** Update timestamp */
  updated_at?: string
}

/**
 * Server details from API (snake_case).
 */
export interface ICoolifyServer {
  /** Server UUID */
  uuid: string
  /** Server name */
  name: string
  /** Server description */
  description?: string | null
  /** Server IP address */
  ip?: string
  /** SSH port */
  port?: number
  /** Whether this is the Coolify host */
  is_coolify_host?: boolean
  /** Whether server is reachable */
  is_reachable?: boolean
  /** Whether server is usable */
  is_usable?: boolean
  /** Proxy configuration */
  proxy?: {
    redirect_enabled?: boolean
  } | null
  /** Server settings */
  settings?: Record<string, unknown> | null
}

/**
 * Destination (Docker network) from API (snake_case).
 */
export interface ICoolifyDestination {
  /** Destination UUID */
  uuid: string
  /** Destination name */
  name: string
  /** Network name */
  network?: string
  /** Server UUID */
  server_uuid?: string
}

/**
 * Project details from API (snake_case).
 */
export interface ICoolifyProject {
  /** Project UUID */
  uuid: string
  /** Project name */
  name: string
  /** Project description */
  description?: string | null
  /** Environments in this project */
  environments?: ICoolifyEnvironment[]
}

/**
 * Environment within a project from API (snake_case).
 */
export interface ICoolifyEnvironment {
  /** Environment ID */
  id: number
  /** Environment name */
  name: string
  /** Environment description */
  description?: string | null
  /** Project ID */
  project_id: number
  /** Creation timestamp */
  created_at?: string
  /** Update timestamp */
  updated_at?: string
}

/**
 * Team details from API (snake_case).
 */
export interface ICoolifyTeam {
  /** Team ID */
  id: number
  /** Team name */
  name: string
  /** Team description */
  description?: string | null
  /** Personal team flag */
  personal_team?: boolean
}
