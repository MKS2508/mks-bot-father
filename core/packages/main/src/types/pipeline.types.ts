/**
 * Pipeline types for mks-bot-father.
 *
 * @module
 */

import type { IProgressCallback } from './progress.types.js'

/**
 * Available template types for workspace creation.
 */
export const TemplateType = {
  TelegramBot: 'telegram-bot',
  Monorepo: 'monorepo',
  Fumadocs: 'fumadocs',
} as const

export type TemplateType = (typeof TemplateType)[keyof typeof TemplateType]

/**
 * Options for external workspace creation (library usage).
 *
 * @example
 * ```typescript
 * import { createWorkspace } from '@mks2508/mks-bot-father'
 *
 * const result = await createWorkspace({
 *   projectName: 'my-bot',
 *   template: 'telegram-bot',
 *   targetPath: '/workspace/projects',
 *   skipExternal: { github: true, coolify: true },
 * })
 * ```
 */
export interface IExternalPipelineOptions {
  /** Project name (used for directory and repository) */
  projectName: string
  /** Template to use for scaffolding */
  template: TemplateType
  /** Target path for project creation (defaults to cwd) */
  targetPath?: string
  /** Skip external service integrations */
  skipExternal?: {
    /** Skip BotFather automation */
    botFather?: boolean
    /** Skip GitHub repository creation */
    github?: boolean
    /** Skip Coolify deployment */
    coolify?: boolean
  }
  /** Enable workspace mode (optimized for dev environment integration) */
  workspaceMode?: boolean
  /** Bot token (if skipping BotFather but need token for env) */
  botToken?: string
  /** Bot username (if skipping BotFather) */
  botUsername?: string
  /** Bot description */
  description?: string
  /** Progress callback */
  onProgress?: IProgressCallback
}

/**
 * Result of workspace creation for external consumers.
 */
export interface IWorkspaceResult {
  /** Whether the operation succeeded */
  success: boolean
  /** Absolute path to created workspace */
  workspacePath: string
  /** Template used */
  template: TemplateType
  /** Bot token (if BotFather was run or provided) */
  botToken?: string
  /** Bot username (if BotFather was run or provided) */
  botUsername?: string
  /** GitHub repository URL (if created) */
  githubUrl?: string
  /** Coolify deployment URL (if deployed) */
  coolifyUrl?: string
  /** Coolify application UUID (if deployed) */
  coolifyAppUuid?: string
  /** List of errors encountered */
  errors: string[]
}

/**
 * Options for running the full pipeline.
 */
export interface IPipelineOptions {
  /** Bot name (used for project and repository) */
  botName: string
  /** Bot description */
  botDescription?: string
  /** Template to use for scaffolding (defaults to telegram-bot) */
  template?: TemplateType
  /** Target path for project creation (defaults to cwd) */
  targetPath?: string
  /** Whether to create a GitHub repository */
  createGitHubRepo?: boolean
  /** Whether to deploy to Coolify */
  deployToCoolify?: boolean
  /** Skip BotFather automation step */
  skipBotFather?: boolean
  /** Pre-existing bot token (used if skipBotFather is true) */
  existingBotToken?: string
  /** Pre-existing bot username (used if skipBotFather is true) */
  existingBotUsername?: string
  /** GitHub organization */
  githubOrg?: string
  /** Coolify server UUID */
  coolifyServer?: string
  /** Coolify destination UUID */
  coolifyDestination?: string
  /** Progress callback for pipeline steps */
  onProgress?: IProgressCallback
  /** Workspace mode: skip git init, use simpler structure */
  workspaceMode?: boolean
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
