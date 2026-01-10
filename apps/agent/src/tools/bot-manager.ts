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

        try {
          const pipeline = getPipeline()
          const result = await pipeline.run({
            botName: args.name,
            botDescription: args.description,
            createGitHubRepo: args.createGithub,
            githubOrg: args.githubOrg,
            deployToCoolify: args.deployToCoolify,
            coolifyServer: args.coolifyServer,
            coolifyDestination: args.coolifyDestination
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
                    coolifyAppUuid: data.coolifyAppUuid || null
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

Connects to BotFather and retrieves the complete list of bots
with their usernames and tokens. Requires Telegram API credentials.`,
      {},
      async () => {
        const log = createToolLogger('bot-manager.list_bots')
        const startTime = log.start({})

        try {
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

          const result = await botfather.getAllBotsWithTokens()
          await botfather.disconnect()

          if (isOk(result)) {
            const bots = result.value
            log.success(startTime, { botCount: bots.length })

            if (bots.length === 0) {
              return {
                content: [{
                  type: 'text' as const,
                  text: 'No bots found. Create one with create_bot tool.'
                }]
              }
            }

            const formatted = bots.map((bot, i) =>
              `${i + 1}. @${bot.username}\n   Token: ${bot.token}`
            ).join('\n\n')

            return {
              content: [{
                type: 'text' as const,
                text: `Found ${bots.length} bot(s):\n\n${formatted}`
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

        try {
          const botfather = getBotFatherService()
          await botfather.init()

          const results: string[] = []
          const errors: string[] = []

          if (args.commands && args.commands.length > 0) {
            const cmdResult = await botfather.setCommands(args.botUsername, args.commands)
            if (isOk(cmdResult)) {
              results.push(`Commands updated (${args.commands.length} commands)`)
            } else {
              errors.push(`Commands failed: ${cmdResult.error.message}`)
            }
          }

          if (args.description) {
            const descResult = await botfather.setDescription(args.botUsername, args.description)
            if (isOk(descResult)) {
              results.push('Description updated')
            } else {
              errors.push(`Description failed: ${descResult.error.message}`)
            }
          }

          if (args.aboutText) {
            const aboutResult = await botfather.setAboutText(args.botUsername, args.aboutText)
            if (isOk(aboutResult)) {
              results.push('About text updated')
            } else {
              errors.push(`About text failed: ${aboutResult.error.message}`)
            }
          }

          await botfather.disconnect()

          const summary = [
            results.length > 0 ? `Success:\n${results.map(r => `  - ${r}`).join('\n')}` : '',
            errors.length > 0 ? `Errors:\n${errors.map(e => `  - ${e}`).join('\n')}` : ''
          ].filter(Boolean).join('\n\n')

          if (errors.length > 0 && results.length === 0) {
            log.error(startTime, errors.join(', '), { results, errors })
          } else {
            log.success(startTime, { resultsCount: results.length, errorsCount: errors.length })
          }

          return {
            content: [{
              type: 'text' as const,
              text: summary || 'No changes requested'
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

        try {
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

          const result = await botfather.getAllBotsWithTokens()
          await botfather.disconnect()

          if (isOk(result)) {
            const username = args.botUsername.replace('@', '')
            const bot = result.value.find(b => b.username === username)

            if (bot) {
              log.success(startTime, { found: true })
              return {
                content: [{
                  type: 'text' as const,
                  text: `Token for @${username}:\n${bot.token}`
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
    )
  ]
})
