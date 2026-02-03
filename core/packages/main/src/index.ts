/**
 * @mks2508/mks-bot-father
 *
 * Complete pipeline for Telegram bot automation:
 * BotFather + GitHub + Coolify deployment.
 *
 * @module
 *
 * @example
 * ```typescript
 * import {
 *   getPipeline,
 *   getConfigService,
 *   createWorkspace,
 *   TemplateType,
 * } from '@mks2508/mks-bot-father'
 *
 * // Method 1: Simple workspace creation (library usage)
 * const result = await createWorkspace({
 *   projectName: 'my-bot',
 *   template: TemplateType.TelegramBot,
 *   targetPath: '/workspace/projects',
 *   skipExternal: { github: true, coolify: true },
 * })
 *
 * if (result.isOk()) {
 *   console.log('Created at:', result.value.workspacePath)
 * }
 *
 * // Method 2: Full pipeline with all services
 * const config = getConfigService()
 * config.set('github.token', 'ghp_xxx')
 * config.set('coolify.url', 'https://coolify.example.com')
 *
 * const pipeline = getPipeline()
 * const pipelineResult = await pipeline.run({
 *   botName: 'my-awesome-bot',
 *   createGitHubRepo: true,
 *   deployToCoolify: true,
 * })
 * ```
 */

import { ok, err, isErr, type Result, type ResultError } from '@mks2508/no-throw'
import { getPipeline } from './pipeline/index.js'
import {
  type IExternalPipelineOptions,
  type IWorkspaceResult,
  TemplateType,
} from './types/pipeline.types.js'
import { AppErrorCode } from './types/errors.js'
import { createLogger } from './utils/index.js'

const log = createLogger('BotFatherLib')

// ─────────────────────────────────────────────────────────────
// Types (re-export all)
// ─────────────────────────────────────────────────────────────
export * from './types/index.js'

// ─────────────────────────────────────────────────────────────
// Services
// ─────────────────────────────────────────────────────────────
export {
  ConfigService,
  getConfigService,
  CONFIG_DIR,
  CONFIG_FILE,
} from './services/config.service.js'

export {
  GitHubService,
  getGitHubService,
} from './services/github.service.js'

export {
  CoolifyService,
  getCoolifyService,
  type ICoolifyServer,
  type ICoolifyDestination,
} from './services/coolify.service.js'

export {
  BotFatherService,
  getBotFatherService,
  type IBotCreateOptions,
  type IBotCreateResult,
} from './services/botfather.service.js'

// ─────────────────────────────────────────────────────────────
// Pipeline
// ─────────────────────────────────────────────────────────────
export { Pipeline, getPipeline } from './pipeline/index.js'

// ─────────────────────────────────────────────────────────────
// Utils (re-export)
// ─────────────────────────────────────────────────────────────
export { createLogger } from './utils/index.js'

// ─────────────────────────────────────────────────────────────
// Progress utilities (explicit exports for external consumers)
// ─────────────────────────────────────────────────────────────
export {
  createProgressTracker,
  createProgressEventCollector,
} from './types/progress.types.js'

// ─────────────────────────────────────────────────────────────
// Error utilities (explicit exports for external consumers)
// ─────────────────────────────────────────────────────────────
export { AppErrorCode, createAppError } from './types/errors.js'

// ─────────────────────────────────────────────────────────────
// External API: createWorkspace
// ─────────────────────────────────────────────────────────────

/**
 * Creates a new workspace using BotFather templates.
 *
 * This is the main entry point for external library consumers
 * who want to create workspaces programmatically without using the CLI.
 *
 * @param options - Workspace creation options
 * @returns Result with workspace details or error
 *
 * @example
 * ```typescript
 * import { createWorkspace, TemplateType } from '@mks2508/mks-bot-father'
 *
 * // Create telegram bot workspace (skip external services)
 * const result = await createWorkspace({
 *   projectName: 'my-telegram-bot',
 *   template: TemplateType.TelegramBot,
 *   targetPath: '/workspace',
 *   skipExternal: { botFather: true, github: true, coolify: true },
 * })
 *
 * if (result.isOk()) {
 *   console.log('Workspace created:', result.value.workspacePath)
 * }
 *
 * // Create with BotFather automation only
 * const botResult = await createWorkspace({
 *   projectName: 'auto-bot',
 *   template: TemplateType.TelegramBot,
 *   skipExternal: { github: true, coolify: true },
 *   onProgress: (pct, msg) => console.log(`${pct}%: ${msg}`),
 * })
 *
 * if (botResult.isOk()) {
 *   console.log('Bot token:', botResult.value.botToken)
 * }
 * ```
 */
export async function createWorkspace(
  options: IExternalPipelineOptions
): Promise<Result<IWorkspaceResult, ResultError<typeof AppErrorCode.UNKNOWN_ERROR>>> {
  log.info(`Creating workspace: ${options.projectName}`)
  log.info(`Template: ${options.template}`)
  log.info(`Target: ${options.targetPath || process.cwd()}`)

  const pipeline = getPipeline()

  const pipelineResult = await pipeline.run({
    botName: options.projectName,
    botDescription: options.description,
    template: options.template,
    targetPath: options.targetPath,
    skipBotFather: options.skipExternal?.botFather ?? false,
    createGitHubRepo: !(options.skipExternal?.github ?? true),
    deployToCoolify: !(options.skipExternal?.coolify ?? true),
    existingBotToken: options.botToken,
    existingBotUsername: options.botUsername,
    onProgress: options.onProgress,
    workspaceMode: options.workspaceMode ?? true,
  })

  if (isErr(pipelineResult)) {
    return err(pipelineResult.error)
  }

  const result = pipelineResult.value
  const basePath = options.targetPath || process.cwd()
  const workspacePath = `${basePath}/${options.projectName}`

  const workspaceResult: IWorkspaceResult = {
    success: result.success,
    workspacePath,
    template: options.template,
    botToken: result.botToken || options.botToken,
    botUsername: result.botUsername || options.botUsername,
    githubUrl: result.githubRepoUrl,
    coolifyUrl: result.deploymentUrl,
    coolifyAppUuid: result.coolifyAppUuid,
    errors: result.errors,
  }

  if (workspaceResult.success) {
    log.success(`Workspace created: ${workspacePath}`)
  } else {
    log.warn(`Workspace created with ${workspaceResult.errors.length} error(s)`)
  }

  return ok(workspaceResult)
}

/**
 * Lists available templates for workspace creation.
 *
 * @returns Array of available template names
 */
export function listTemplates(): TemplateType[] {
  return Object.values(TemplateType) as TemplateType[]
}

/**
 * Gets template details.
 *
 * @param template - Template type
 * @returns Template description and metadata
 */
export function getTemplateInfo(template: TemplateType): {
  name: TemplateType
  description: string
  features: string[]
} {
  const templates: Record<TemplateType, { description: string; features: string[] }> = {
    [TemplateType.TelegramBot]: {
      description: 'Telegram bot with GramIO, TypeScript, Docker-ready',
      features: ['GramIO framework', 'TypeScript', 'Docker support', 'Webhook/Polling modes'],
    },
    [TemplateType.Monorepo]: {
      description: 'Monorepo structure with workspace management',
      features: ['Bun workspaces', 'Shared packages', 'Turborepo-compatible'],
    },
    [TemplateType.Fumadocs]: {
      description: 'Documentation site with Fumadocs framework',
      features: ['Next.js', 'MDX support', 'Search', 'Dark mode'],
    },
  }

  return {
    name: template,
    ...templates[template],
  }
}

// ─────────────────────────────────────────────────────────────
// Version
// ─────────────────────────────────────────────────────────────
export const version = '0.2.0'
