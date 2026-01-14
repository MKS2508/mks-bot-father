/**
 * EnvManager MCP Tools.
 *
 * Local operations for managing bot configurations in .envs/ directory.
 * All operations are FAST (<100ms) - no MTProto/network calls.
 */

import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { EnvManager } from '@mks2508/telegram-bot-manager'
import { createToolLogger } from '../utils/tool-logger.js'
import { homedir } from 'os'
import { join } from 'path'

const environmentSchema = z.enum(['local', 'staging', 'production']).default('local')

/**
 * Get the unified core directory for bot configurations.
 * Priority: MKS_CORE_DIR env var > ~/.mks-bot-father/core
 */
function getCoreDir(): string {
  return process.env.MKS_CORE_DIR || join(homedir(), '.mks-bot-father', 'core')
}

/**
 * Create EnvManager instance with unified core directory.
 */
function createEnvManager(): EnvManager {
  return new EnvManager({ coreDir: getCoreDir() })
}

export const envManagerServer = createSdkMcpServer({
  name: 'env-manager',
  version: '1.0.0',
  tools: [
    tool(
      'list_configured_bots',
      `List all bots configured locally - INSTANT (<100ms).

✅ PREFERRED over bot-manager's list_bots which takes 3-10+ minutes with many bots.

Reads from ~/.mks-bot-father/core/.envs/ (or MKS_CORE_DIR env var).
Returns all bots with their environments, active status, and metadata.
No network calls - pure filesystem operation.`,
      {},
      async () => {
        const log = createToolLogger('env-manager.list_configured_bots')
        const startTime = log.start({})

        try {
          const envManager = createEnvManager()
          const bots = envManager.listBots()
          const activeBot = envManager.getActiveBot()

          log.success(startTime, { botCount: bots.length, activeBot })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                bots,
                activeBot,
                progress: [{ pct: 100, msg: 'Listed configured bots', step: 'done' }]
              }, null, 2)
            }]
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'list' })
          return {
            content: [{
              type: 'text' as const,
              text: `Error listing bots: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'get_active_bot',
      `Get the currently active bot from .envs/.active symlink.

Returns the username of the active bot or null if none is set.`,
      {},
      async () => {
        const log = createToolLogger('env-manager.get_active_bot')
        const startTime = log.start({})

        try {
          const envManager = createEnvManager()
          const activeBot = envManager.getActiveBot()

          log.success(startTime, { activeBot })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                activeBot,
                progress: [{ pct: 100, msg: 'Got active bot', step: 'done' }]
              }, null, 2)
            }]
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'get_active' })
          return {
            content: [{
              type: 'text' as const,
              text: `Error getting active bot: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'set_active_bot',
      `Set the active bot by creating .envs/.active symlink.

This determines which bot is used by default in other operations.`,
      {
        botUsername: z.string().describe('Bot username to set as active')
      },
      async (args) => {
        const log = createToolLogger('env-manager.set_active_bot')
        const startTime = log.start({ botUsername: args.botUsername })

        try {
          const envManager = createEnvManager()

          if (!envManager.botExists(args.botUsername)) {
            log.error(startTime, 'Bot not found', { botUsername: args.botUsername })
            return {
              content: [{
                type: 'text' as const,
                text: `Bot @${args.botUsername} not found in .envs/`
              }],
              isError: true
            }
          }

          await envManager.setActiveBot(args.botUsername)

          log.success(startTime, { botUsername: args.botUsername })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                activeBot: args.botUsername,
                message: `Set @${args.botUsername} as active bot`,
                progress: [{ pct: 100, msg: 'Active bot updated', step: 'done' }]
              }, null, 2)
            }]
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'set_active' })
          return {
            content: [{
              type: 'text' as const,
              text: `Error setting active bot: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'read_bot_config',
      `Read configuration for a specific bot from .envs/{botUsername}/{environment}.env

Returns the parsed environment configuration including token, mode, chat IDs, etc.`,
      {
        botUsername: z.string().describe('Bot username'),
        environment: environmentSchema.describe('Environment to read (local, staging, production)')
      },
      async (args) => {
        const log = createToolLogger('env-manager.read_bot_config')
        const startTime = log.start({ botUsername: args.botUsername, environment: args.environment })

        try {
          const envManager = createEnvManager()

          if (!envManager.botExists(args.botUsername)) {
            log.error(startTime, 'Bot not found', { botUsername: args.botUsername })
            return {
              content: [{
                type: 'text' as const,
                text: `Bot @${args.botUsername} not found in .envs/`
              }],
              isError: true
            }
          }

          const config = await envManager.readEnv(args.botUsername, args.environment)

          log.success(startTime, { hasConfig: !!config, environment: args.environment })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                botUsername: args.botUsername,
                environment: args.environment,
                config,
                progress: [{ pct: 100, msg: 'Read bot config', step: 'done' }]
              }, null, 2)
            }]
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'read' })
          return {
            content: [{
              type: 'text' as const,
              text: `Error reading config: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'update_bot_config',
      `Update configuration for a specific bot in .envs/{botUsername}/{environment}.env

Merges the updates with existing configuration.`,
      {
        botUsername: z.string().describe('Bot username'),
        environment: environmentSchema.describe('Environment to update'),
        updates: z.object({
          botToken: z.string().optional().describe('Bot token'),
          mode: z.enum(['polling', 'webhook']).optional().describe('Bot mode'),
          webhookUrl: z.string().optional().describe('Webhook URL'),
          controlChatId: z.string().optional().describe('Control chat ID'),
          logLevel: z.enum(['debug', 'info', 'warn', 'error']).optional().describe('Log level')
        }).describe('Configuration updates to apply')
      },
      async (args) => {
        const log = createToolLogger('env-manager.update_bot_config')
        const startTime = log.start({
          botUsername: args.botUsername,
          environment: args.environment,
          updateKeys: Object.keys(args.updates)
        })

        try {
          const envManager = createEnvManager()

          if (!envManager.botExists(args.botUsername)) {
            log.error(startTime, 'Bot not found', { botUsername: args.botUsername })
            return {
              content: [{
                type: 'text' as const,
                text: `Bot @${args.botUsername} not found in .envs/`
              }],
              isError: true
            }
          }

          await envManager.updateEnv(args.botUsername, args.environment, args.updates)

          log.success(startTime, { updated: Object.keys(args.updates) })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                botUsername: args.botUsername,
                environment: args.environment,
                updated: Object.keys(args.updates),
                message: `Updated ${Object.keys(args.updates).length} config values`,
                progress: [{ pct: 100, msg: 'Config updated', step: 'done' }]
              }, null, 2)
            }]
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'update' })
          return {
            content: [{
              type: 'text' as const,
              text: `Error updating config: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'delete_bot_config',
      `Delete a bot's configuration directory from .envs/

WARNING: This permanently removes all environment files for this bot.`,
      {
        botUsername: z.string().describe('Bot username to delete')
      },
      async (args) => {
        const log = createToolLogger('env-manager.delete_bot_config')
        const startTime = log.start({ botUsername: args.botUsername })

        try {
          const envManager = createEnvManager()

          if (!envManager.botExists(args.botUsername)) {
            log.error(startTime, 'Bot not found', { botUsername: args.botUsername })
            return {
              content: [{
                type: 'text' as const,
                text: `Bot @${args.botUsername} not found in .envs/`
              }],
              isError: true
            }
          }

          await envManager.deleteBot(args.botUsername)

          log.success(startTime, { deleted: args.botUsername })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                deleted: args.botUsername,
                message: `Deleted configuration for @${args.botUsername}`,
                progress: [{ pct: 100, msg: 'Bot config deleted', step: 'done' }]
              }, null, 2)
            }]
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'delete' })
          return {
            content: [{
              type: 'text' as const,
              text: `Error deleting config: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'get_bot_metadata',
      `Get metadata for a bot from .envs/{botUsername}/metadata.json

Metadata includes creation date, last modified, and custom properties.`,
      {
        botUsername: z.string().describe('Bot username')
      },
      async (args) => {
        const log = createToolLogger('env-manager.get_bot_metadata')
        const startTime = log.start({ botUsername: args.botUsername })

        try {
          const envManager = createEnvManager()

          if (!envManager.botExists(args.botUsername)) {
            log.error(startTime, 'Bot not found', { botUsername: args.botUsername })
            return {
              content: [{
                type: 'text' as const,
                text: `Bot @${args.botUsername} not found in .envs/`
              }],
              isError: true
            }
          }

          const metadata = envManager.getMetadata(args.botUsername)

          log.success(startTime, { hasMetadata: !!metadata })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                botUsername: args.botUsername,
                metadata,
                progress: [{ pct: 100, msg: 'Got metadata', step: 'done' }]
              }, null, 2)
            }]
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'get_metadata' })
          return {
            content: [{
              type: 'text' as const,
              text: `Error getting metadata: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          }
        }
      }
    )
  ]
})
