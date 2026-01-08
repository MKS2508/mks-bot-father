/**
 * Pipeline types for mks-bot-father.
 *
 * @module
 */

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

/**
 * Result of the BotFather step.
 */
export interface IBotFatherStepResult {
  /** Whether the step succeeded */
  success: boolean
  /** Bot token */
  token?: string
  /** Bot username */
  username?: string
  /** Error message if failed */
  error?: string
}

/**
 * Result of the scaffold step.
 */
export interface IScaffoldStepResult {
  /** Whether the step succeeded */
  success: boolean
  /** Path to the scaffolded project */
  projectPath?: string
  /** Error message if failed */
  error?: string
}

/**
 * Result of the GitHub step.
 */
export interface IGitHubStepResult {
  /** Whether the step succeeded */
  success: boolean
  /** Repository URL */
  repoUrl?: string
  /** Error message if failed */
  error?: string
}

/**
 * Result of the Coolify step.
 */
export interface ICoolifyStepResult {
  /** Whether the step succeeded */
  success: boolean
  /** Application UUID */
  appUuid?: string
  /** Deployment URL */
  deploymentUrl?: string
  /** Error message if failed */
  error?: string
}
