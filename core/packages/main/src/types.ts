/**
 * Type definitions for mks-bot-father.
 *
 * @module
 */

import { type } from 'arktype'

// =============================================================================
// Configuration Schema (Arktype)
// =============================================================================

/**
 * GitHub configuration schema.
 */
export const GitHubConfigSchema = type({
  'token?': 'string',
  'useGhCli?': 'boolean',
  'defaultOrg?': 'string',
  'defaultVisibility?': '"public" | "private"',
})

/**
 * Coolify configuration schema.
 */
export const CoolifyConfigSchema = type({
  'url?': 'string',
  'token?': 'string',
  'defaultServer?': 'string',
  'defaultDestination?': 'string',
})

/**
 * Telegram credentials schema.
 */
export const TelegramConfigSchema = type({
  'apiId?': 'number',
  'apiHash?': 'string',
})

/**
 * Main configuration schema.
 */
export const ConfigSchema = type({
  'github?': GitHubConfigSchema,
  'coolify?': CoolifyConfigSchema,
  'telegram?': TelegramConfigSchema,
})

/**
 * Configuration type inferred from schema.
 */
export type Config = typeof ConfigSchema.infer

// =============================================================================
// Interfaces - GitHub
// =============================================================================

/**
 * Options for creating a GitHub repository.
 */
export interface IGitHubRepoOptions {
  /** Repository name */
  name: string
  /** Repository description */
  description?: string
  /** Whether the repository should be private */
  private?: boolean
  /** Owner (user or organization) */
  owner?: string
  /** Template repository owner */
  templateOwner?: string
  /** Template repository name */
  templateRepo?: string
}

/**
 * Result of a GitHub repository operation.
 */
export interface IGitHubRepoResult {
  /** Whether the operation succeeded */
  success: boolean
  /** URL of the created repository */
  repoUrl?: string
  /** Clone URL */
  cloneUrl?: string
  /** Error message if failed */
  error?: string
}

// =============================================================================
// Interfaces - Coolify
// =============================================================================

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

// =============================================================================
// Interfaces - Pipeline
// =============================================================================

/**
 * Options for running the full pipeline.
 */
export interface IPipelineOptions {
  /** Bot name (used for project and repository) */
  botName: string
  /** Bot description */
  botDescription?: string
  /** Whether to create a GitHub repository */
  createGitHubRepo?: boolean
  /** Whether to deploy to Coolify */
  deployToCoolify?: boolean
  /** Skip BotFather automation step */
  skipBotFather?: boolean
  /** GitHub organization */
  githubOrg?: string
  /** Coolify server UUID */
  coolifyServer?: string
  /** Coolify destination UUID */
  coolifyDestination?: string
}

/**
 * Result of the pipeline execution.
 */
export interface IPipelineResult {
  /** Whether the pipeline completed successfully */
  success: boolean
  /** Bot token from BotFather */
  botToken?: string
  /** Bot username */
  botUsername?: string
  /** GitHub repository URL */
  githubRepoUrl?: string
  /** Coolify application UUID */
  coolifyAppUuid?: string
  /** Deployment URL */
  deploymentUrl?: string
  /** List of errors encountered */
  errors: string[]
}

// =============================================================================
// Types
// =============================================================================

/**
 * Environment type.
 */
export type Environment = 'local' | 'staging' | 'production'

/**
 * Error codes for the application.
 */
export type AppErrorCode =
  | 'CONFIG_ERROR'
  | 'GITHUB_ERROR'
  | 'COOLIFY_ERROR'
  | 'BOTFATHER_ERROR'
  | 'SCAFFOLD_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR'
