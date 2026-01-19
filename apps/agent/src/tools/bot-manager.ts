/**
 * Bot Manager MCP Tools.
 *
 * Provides tools for Telegram bot management via BotFather automation.
 */

import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { isOk, isErr } from '@mks2508/no-throw'
import {
  getPipeline,
  getBotFatherService,
} from '@mks2508/mks-bot-father'
import { createToolLogger } from '../utils/tool-logger.js'
import { progressEmitter } from '../services/progress-emitter.js'

export const botManagerServer = createSdkMcpServer({
  name: 'bot-manager',
  version: '1.0.0',
  tools: [
    tool(
      'create_bot',
      `Create a new Telegram bot via BotFather automation.

This tool automates the entire bot creation process:
1. Creates the bot via @BotFather using MTProto
2. Optionally creates a GitHub repo from template
3. Optionally deploys to Coolify with env vars

Returns: bot token, username, and deployment URLs if applicable.`,
      {
        name: z.string()
          .min(3)
          .max(32)
          .describe('Bot name (3-32 chars, will have _bot suffix added by BotFather)'),
        description: z.string()
          .max(512)
          .optional()
          .describe('Bot description (max 512 chars)'),
        aboutText: z.string()
          .max(120)
          .optional()
          .describe('Short about text (max 120 chars, shown in bot profile)'),
        createGithub: z.boolean()
          .default(false)
          .describe('Create a GitHub repository from mks-telegram-bot template'),
        githubOrg: z.string()
          .optional()
          .describe('GitHub organization (defaults to authenticated user)'),
        deployToCoolify: z.boolean()
          .default(false)
          .describe('Deploy to Coolify after creation'),
        coolifyServer: z.string()
          .optional()
          .describe('Coolify server UUID (uses default if not specified)'),
        coolifyDestination: z.string()
          .optional()
          .describe('Coolify destination UUID (uses default if not specified)')
      },
      async (args) => {
        const log = createToolLogger('bot-manager.create_bot')
        const startTime = log.start({
          name: args.name,
          createGithub: args.createGithub,
          deployToCoolify: args.deployToCoolify
        })
        const progressEvents: Array<{ pct: number; msg: string; step?: string }> = []

        try {
          const pipeline = getPipeline()
          const result = await pipeline.run({
            botName: args.name,
            botDescription: args.description,
            createGitHubRepo: args.createGithub,
            githubOrg: args.githubOrg,
            deployToCoolify: args.deployToCoolify,
            coolifyServer: args.coolifyServer,
            coolifyDestination: args.coolifyDestination,
            onProgress: (pct, msg, step) => {
              progressEvents.push({ pct, msg, step })
              log.info(`Progress ${pct}%: ${msg}`, { step })
              // Emit to global progress emitter for real-time Telegram updates
              progressEmitter.emitProgress(pct, msg, step, { tool: 'create_bot' })
            }
          })

          if (isOk(result)) {
            const data = result.value
            if (data.success) {
              log.success(startTime, {
                botUsername: data.botUsername,
                githubRepoUrl: data.githubRepoUrl || null,
                coolifyAppUuid: data.coolifyAppUuid || null
              })
              return {
                content: [{
                  type: 'text' as const,
                  text: JSON.stringify({
                    success: true,
                    botUsername: data.botUsername,
                    botToken: data.botToken,
                    githubRepoUrl: data.githubRepoUrl || null,
                    deploymentUrl: data.deploymentUrl || null,
                    coolifyAppUuid: data.coolifyAppUuid || null,
                    progress: progressEvents
                  }, null, 2)
                }]
              }
            } else {
              log.error(startTime, data.errors?.join(', ') || 'Unknown error', { phase: 'pipeline' })
              return {
                content: [{
                  type: 'text' as const,
                  text: `Pipeline completed with errors:\n${data.errors?.join('\n') || 'Unknown error'}`
                }],
                isError: true
              }
            }
          } else {
            log.error(startTime, result.error.message, { phase: 'pipeline' })
            return {
              content: [{
                type: 'text' as const,
                text: `Pipeline failed: ${result.error.message}`
              }],
              isError: true
            }
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'exception' })
          return {
            content: [{
              type: 'text' as const,
              text: `Error creating bot: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'list_bots',
      `List all Telegram bots created via BotFather.

⚠️ WARNING: This operation is VERY SLOW with many bots (exponential time).
- 1-5 bots: ~30 seconds
- 5-10 bots: ~1-2 minutes
- 10+ bots: ~3-10+ minutes (current account has 10+ bots)

PREFER using 'list_configured_bots' (env-manager) for instant local results.
Only use this tool when you need to sync with BotFather or get tokens for bots not yet configured locally.

Connects to BotFather via MTProto and retrieves all bots with their tokens.`,
      {},
      async () => {
        const log = createToolLogger('bot-manager.list_bots')
        const startTime = log.start({})
        const progressEvents: Array<{ pct: number; msg: string; step?: string }> = []

        const reportProgress = (pct: number, msg: string, step?: string) => {
          progressEvents.push({ pct, msg, step })
          log.info(`Progress ${pct}%: ${msg}`, { step })
          // Emit to global progress emitter for real-time Telegram updates
          progressEmitter.emitProgress(pct, msg, step, { tool: 'list_bots' })
        }

        try {
          reportProgress(10, 'Initializing BotFather connection...', 'init')
          const botfather = getBotFatherService()
          const initResult = await botfather.init()

          if (isErr(initResult)) {
            log.error(startTime, initResult.error.message, { phase: 'init' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to initialize BotFather: ${initResult.error.message}`
              }],
              isError: true
            }
          }

          reportProgress(40, 'Connected. Fetching bot list...', 'fetch')
          // Note: onProgress support added to BotFatherService - rebuild core package to update types
          const result = await (botfather.getAllBotsWithTokens as (opts?: { onProgress?: (msg: string) => void }) => ReturnType<typeof botfather.getAllBotsWithTokens>)({
            onProgress: (msg: string) => {
              // Parse progress message and emit to global emitter
              // Messages like "📄 Page 1...", "⏳ [1/5] Fetching @bot...", "✓ [@bot] Got token"
              progressEmitter.emitSubstep(msg, { tool: 'list_bots' })
            }
          })

          reportProgress(80, 'Disconnecting...', 'disconnect')
          await botfather.disconnect()

          if (isOk(result)) {
            const bots = result.value
            reportProgress(100, `Found ${bots.length} bots`, 'done')
            log.success(startTime, { botCount: bots.length })

            if (bots.length === 0) {
              return {
                content: [{
                  type: 'text' as const,
                  text: JSON.stringify({
                    success: true,
                    bots: [],
                    message: 'No bots found. Create one with create_bot tool.',
                    progress: progressEvents
                  }, null, 2)
                }]
              }
            }

            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  bots: bots.map(bot => ({
                    username: bot.username,
                    token: bot.token
                  })),
                  progress: progressEvents
                }, null, 2)
              }]
            }
          } else {
            log.error(startTime, result.error.message, { phase: 'getAllBots' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to list bots: ${result.error.message}`
              }],
              isError: true
            }
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'exception' })
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
      'configure_bot',
      `Configure an existing Telegram bot's settings via BotFather.

Can update:
- Bot commands (shown in menu)
- Bot description (shown when user opens chat)
- About text (shown in bot profile)`,
      {
        botUsername: z.string()
          .describe('Bot username (with or without @)'),
        commands: z.array(z.object({
          command: z.string().describe('Command name without /'),
          description: z.string().describe('Command description')
        }))
          .optional()
          .describe('Array of commands to set'),
        description: z.string()
          .max(512)
          .optional()
          .describe('Bot description (max 512 chars)'),
        aboutText: z.string()
          .max(120)
          .optional()
          .describe('About text (max 120 chars)')
      },
      async (args) => {
        const log = createToolLogger('bot-manager.configure_bot')
        const startTime = log.start({
          botUsername: args.botUsername,
          hasCommands: !!(args.commands && args.commands.length > 0),
          hasDescription: !!args.description,
          hasAboutText: !!args.aboutText
        })
        const progressEvents: Array<{ pct: number; msg: string; step?: string }> = []

        const reportProgress = (pct: number, msg: string, step?: string) => {
          progressEvents.push({ pct, msg, step })
          log.info(`Progress ${pct}%: ${msg}`, { step })
          // Emit to global progress emitter for real-time Telegram updates
          progressEmitter.emitProgress(pct, msg, step, { tool: 'configure_bot' })
        }

        try {
          reportProgress(10, 'Initializing BotFather...', 'init')
          const botfather = getBotFatherService()
          await botfather.init()

          const results: string[] = []
          const errors: string[] = []
          const totalSteps = [args.commands?.length, args.description, args.aboutText].filter(Boolean).length
          let currentStep = 0

          if (args.commands && args.commands.length > 0) {
            currentStep++
            reportProgress(20 + (currentStep / totalSteps) * 60, `Setting ${args.commands.length} commands...`, 'commands')
            const cmdResult = await botfather.setCommands(args.botUsername, args.commands)
            if (isOk(cmdResult)) {
              results.push(`Commands updated (${args.commands.length} commands)`)
            } else {
              errors.push(`Commands failed: ${cmdResult.error.message}`)
            }
          }

          if (args.description) {
            currentStep++
            reportProgress(20 + (currentStep / totalSteps) * 60, 'Setting description...', 'description')
            const descResult = await botfather.setDescription(args.botUsername, args.description)
            if (isOk(descResult)) {
              results.push('Description updated')
            } else {
              errors.push(`Description failed: ${descResult.error.message}`)
            }
          }

          if (args.aboutText) {
            currentStep++
            reportProgress(20 + (currentStep / totalSteps) * 60, 'Setting about text...', 'about')
            const aboutResult = await botfather.setAboutText(args.botUsername, args.aboutText)
            if (isOk(aboutResult)) {
              results.push('About text updated')
            } else {
              errors.push(`About text failed: ${aboutResult.error.message}`)
            }
          }

          reportProgress(90, 'Disconnecting...', 'disconnect')
          await botfather.disconnect()
          reportProgress(100, 'Configuration complete', 'done')

          if (errors.length > 0 && results.length === 0) {
            log.error(startTime, errors.join(', '), { results, errors })
          } else {
            log.success(startTime, { resultsCount: results.length, errorsCount: errors.length })
          }

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: results.length > 0,
                results,
                errors,
                progress: progressEvents
              }, null, 2)
            }],
            isError: errors.length > 0 && results.length === 0
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'exception' })
          return {
            content: [{
              type: 'text' as const,
              text: `Error configuring bot: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'get_bot_token',
      `Get the API token for a specific bot.

Useful when you need to configure the bot token in environment
variables or other systems.`,
      {
        botUsername: z.string().describe('Bot username (with or without @)')
      },
      async (args) => {
        const log = createToolLogger('bot-manager.get_bot_token')
        const startTime = log.start({ botUsername: args.botUsername })
        const progressEvents: Array<{ pct: number; msg: string; step?: string }> = []

        const reportProgress = (pct: number, msg: string, step?: string) => {
          progressEvents.push({ pct, msg, step })
          log.info(`Progress ${pct}%: ${msg}`, { step })
        }

        try {
          reportProgress(10, 'Initializing BotFather...', 'init')
          const botfather = getBotFatherService()
          const initResult = await botfather.init()

          if (isErr(initResult)) {
            log.error(startTime, initResult.error.message, { phase: 'init' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to initialize BotFather: ${initResult.error.message}`
              }],
              isError: true
            }
          }

          reportProgress(40, 'Fetching bot token...', 'fetch')
          const result = await botfather.getAllBotsWithTokens()

          reportProgress(80, 'Disconnecting...', 'disconnect')
          await botfather.disconnect()

          if (isOk(result)) {
            const username = args.botUsername.replace('@', '')
            const bot = result.value.find(b => b.username === username)

            if (bot) {
              reportProgress(100, 'Token retrieved', 'done')
              log.success(startTime, { found: true })
              return {
                content: [{
                  type: 'text' as const,
                  text: JSON.stringify({
                    success: true,
                    botUsername: username,
                    token: bot.token,
                    progress: progressEvents
                  }, null, 2)
                }]
              }
            }

            log.error(startTime, 'Bot not found', { botUsername: username, availableBots: result.value.length })
            return {
              content: [{
                type: 'text' as const,
                text: `Bot @${username} not found. Available bots: ${result.value.map(b => '@' + b.username).join(', ') || 'none'}`
              }],
              isError: true
            }
          } else {
            log.error(startTime, result.error.message, { phase: 'getAllBots' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to get bots: ${result.error.message}`
              }],
              isError: true
            }
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'exception' })
          return {
            content: [{
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'get_bot_info',
      `Get detailed information about a specific bot from BotFather.

Returns bot name, username, description, about text, and settings.`,
      {
        botUsername: z.string().describe('Bot username (with or without @)')
      },
      async (args) => {
        const log = createToolLogger('bot-manager.get_bot_info')
        const startTime = log.start({ botUsername: args.botUsername })
        const progressEvents: Array<{ pct: number; msg: string; step?: string }> = []

        const reportProgress = (pct: number, msg: string, step?: string) => {
          progressEvents.push({ pct, msg, step })
          log.info(`Progress ${pct}%: ${msg}`, { step })
        }

        try {
          reportProgress(10, 'Initializing BotFather...', 'init')
          const botfather = getBotFatherService()
          const initResult = await botfather.init()

          if (isErr(initResult)) {
            log.error(startTime, initResult.error.message, { phase: 'init' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to initialize BotFather: ${initResult.error.message}`
              }],
              isError: true
            }
          }

          reportProgress(40, 'Fetching bot info...', 'fetch')
          const username = args.botUsername.replace('@', '')
          const result = await botfather.getBotInfo(username)

          reportProgress(80, 'Disconnecting...', 'disconnect')
          await botfather.disconnect()

          if (isOk(result)) {
            reportProgress(100, 'Info retrieved', 'done')
            log.success(startTime, { found: true })
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  botInfo: result.value,
                  progress: progressEvents
                }, null, 2)
              }]
            }
          } else {
            log.error(startTime, result.error.message, { phase: 'getBotInfo' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to get bot info: ${result.error.message}`
              }],
              isError: true
            }
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'exception' })
          return {
            content: [{
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'set_bot_name',
      `Change the display name of a bot via BotFather.

The display name is shown in the chat title and profile.`,
      {
        botUsername: z.string().describe('Bot username (with or without @)'),
        name: z.string().min(1).max(64).describe('New display name for the bot')
      },
      async (args) => {
        const log = createToolLogger('bot-manager.set_bot_name')
        const startTime = log.start({ botUsername: args.botUsername, name: args.name })
        const progressEvents: Array<{ pct: number; msg: string; step?: string }> = []

        const reportProgress = (pct: number, msg: string, step?: string) => {
          progressEvents.push({ pct, msg, step })
          log.info(`Progress ${pct}%: ${msg}`, { step })
        }

        try {
          reportProgress(10, 'Initializing BotFather...', 'init')
          const botfather = getBotFatherService()
          const initResult = await botfather.init()

          if (isErr(initResult)) {
            log.error(startTime, initResult.error.message, { phase: 'init' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to initialize BotFather: ${initResult.error.message}`
              }],
              isError: true
            }
          }

          reportProgress(40, 'Setting bot name...', 'set_name')
          const username = args.botUsername.replace('@', '')
          const result = await botfather.setName(username, args.name)

          reportProgress(80, 'Disconnecting...', 'disconnect')
          await botfather.disconnect()

          if (isOk(result)) {
            reportProgress(100, 'Name updated', 'done')
            log.success(startTime, { name: args.name })
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  botUsername: username,
                  newName: args.name,
                  progress: progressEvents
                }, null, 2)
              }]
            }
          } else {
            log.error(startTime, result.error.message, { phase: 'setName' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to set bot name: ${result.error.message}`
              }],
              isError: true
            }
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'exception' })
          return {
            content: [{
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'check_username_available',
      `Check if a bot username is available for registration.

Useful before creating a new bot to verify the username is free.`,
      {
        botUsername: z.string().describe('Username to check (with or without @, with or without _bot suffix)')
      },
      async (args) => {
        const log = createToolLogger('bot-manager.check_username_available')
        const startTime = log.start({ botUsername: args.botUsername })
        const progressEvents: Array<{ pct: number; msg: string; step?: string }> = []

        const reportProgress = (pct: number, msg: string, step?: string) => {
          progressEvents.push({ pct, msg, step })
          log.info(`Progress ${pct}%: ${msg}`, { step })
        }

        try {
          reportProgress(10, 'Initializing BotFather...', 'init')
          const botfather = getBotFatherService()
          const initResult = await botfather.init()

          if (isErr(initResult)) {
            log.error(startTime, initResult.error.message, { phase: 'init' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to initialize BotFather: ${initResult.error.message}`
              }],
              isError: true
            }
          }

          reportProgress(40, 'Checking username...', 'check')
          let username = args.botUsername.replace('@', '')
          if (!username.endsWith('_bot') && !username.endsWith('Bot')) {
            username = username + '_bot'
          }

          const isAvailable = await botfather.checkUsernameAvailable(username)

          reportProgress(80, 'Disconnecting...', 'disconnect')
          await botfather.disconnect()

          reportProgress(100, 'Check complete', 'done')
          log.success(startTime, { username, isAvailable })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                username,
                isAvailable,
                message: isAvailable ? `@${username} is available` : `@${username} is already taken`,
                progress: progressEvents
              }, null, 2)
            }]
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'exception' })
          return {
            content: [{
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          }
        }
      }
    )
  ]
})
