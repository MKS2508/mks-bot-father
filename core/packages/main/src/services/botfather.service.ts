/**
 * BotFather service for mks-bot-father.
 *
 * @module
 */

import { ok, err, tryCatchAsync, isErr, type Result, type ResultError } from '@mks2508/no-throw'
import {
  BootstrapClient,
  BotFatherManager,
  EnvManager,
} from '@mks2508/telegram-bot-manager'
import { createLogger, log as fileLog } from '../utils/index.js'
import { getConfigService } from './config.service.js'
import { AppErrorCode } from '../types/errors.js'

const log = createLogger('BotFatherService')

/**
 * Bot creation options.
 */
export interface IBotCreateOptions {
  /** Bot name (display name) */
  botName: string
  /** Bot username (optional, generated from name if not provided) */
  botUsername?: string
  /** Bot description */
  description?: string
  /** Bot about text */
  aboutText?: string
}

/**
 * Bot creation result.
 */
export interface IBotCreateResult {
  /** Bot token */
  botToken: string
  /** Bot username */
  botUsername: string
}

/**
 * BotFather service for Telegram bot automation.
 *
 * @example
 * ```typescript
 * const botfather = getBotFatherService()
 * const initResult = await botfather.init()
 * if (isErr(initResult)) {
 *   console.error(initResult.error.message)
 *   return
 * }
 *
 * const createResult = await botfather.createBot({
 *   botName: 'My Awesome Bot',
 *   description: 'Does awesome things',
 * })
 *
 * if (isOk(createResult)) {
 *   console.log('Token:', createResult.value.botToken)
 * }
 *
 * await botfather.disconnect()
 * ```
 */
export class BotFatherService {
  private client: BootstrapClient | null = null
  private botFatherManager: BotFatherManager | null = null

  /**
   * Initializes the BotFather service by connecting to Telegram.
   *
   * @returns Result indicating success or error
   */
  async init(): Promise<Result<void, ResultError<typeof AppErrorCode.BOTFATHER_ERROR>>> {
    const config = getConfigService()
    const telegramCreds = config.getTelegramCredentials()

    if (!telegramCreds.apiId || !telegramCreds.apiHash) {
      log.error('Telegram API credentials not configured')
      log.info('Configure with: mbf config set telegram.apiId <id>')
      log.info('Configure with: mbf config set telegram.apiHash <hash>')
      fileLog.error('BOTFATHER', 'Telegram API credentials not configured', { reason: 'not_configured' })
      return err({
        code: AppErrorCode.BOTFATHER_ERROR,
        message: 'Telegram API credentials not configured',
      })
    }

    fileLog.info('BOTFATHER', 'Initializing Telegram connection', { apiId: telegramCreds.apiId })

    const result = await tryCatchAsync(async () => {
      this.client = new BootstrapClient({
        apiId: telegramCreds.apiId!,
        apiHash: telegramCreds.apiHash!,
      })

      log.info('Connecting to Telegram...')
      await this.client.ensureAuthorized()

      this.botFatherManager = new BotFatherManager(this.client)
      log.success('Connected to Telegram')
      fileLog.info('BOTFATHER', 'Connected to Telegram successfully')
    }, AppErrorCode.BOTFATHER_ERROR)

    if (isErr(result)) {
      fileLog.error('BOTFATHER', 'Failed to connect to Telegram', { error: result.error.message })
    }

    return result
  }

  /**
   * Creates a new bot via BotFather.
   *
   * @param options - Bot creation options
   * @returns Result with bot token and username or error
   */
  async createBot(
    options: IBotCreateOptions
  ): Promise<Result<IBotCreateResult, ResultError<typeof AppErrorCode.BOTFATHER_ERROR>>> {
    if (!this.botFatherManager) {
      fileLog.error('BOTFATHER', 'BotFather service not initialized', { reason: 'not_initialized' })
      return err({
        code: AppErrorCode.BOTFATHER_ERROR,
        message: 'BotFather service not initialized. Call init() first.',
      })
    }

    const botUsername =
      options.botUsername || this.generateBotUsername(options.botName)

    log.info(`Creating bot: ${options.botName} (@${botUsername})`)
    fileLog.info('BOTFATHER', 'Creating bot', {
      botName: options.botName,
      botUsername,
      hasDescription: !!options.description
    })

    const result = await tryCatchAsync(async () => {
      const createResult = await this.botFatherManager!.createBot({
        botName: options.botName,
        botUsername,
      })

      if (!createResult.success) {
        throw new Error(createResult.error || 'Failed to create bot')
      }

      log.success(`Bot created: @${createResult.botUsername}`)
      fileLog.info('BOTFATHER', 'Bot created successfully', {
        botUsername: createResult.botUsername
      })

      if (options.description && createResult.botUsername) {
        await this.botFatherManager!.setDescription(
          createResult.botUsername,
          options.description
        )
      }

      if (options.aboutText && createResult.botUsername) {
        await this.botFatherManager!.setAboutText(
          createResult.botUsername,
          options.aboutText
        )
      }

      if (createResult.botUsername && createResult.botToken) {
        const envManager = new EnvManager()
        await envManager.createEnv(createResult.botUsername, 'local', {
          botToken: createResult.botToken,
          mode: 'polling',
        })
      }

      return {
        botToken: createResult.botToken!,
        botUsername: createResult.botUsername!,
      }
    }, AppErrorCode.BOTFATHER_ERROR)

    if (isErr(result)) {
      fileLog.error('BOTFATHER', 'Failed to create bot', {
        botName: options.botName,
        botUsername,
        error: result.error.message
      })
    }

    return result
  }

  /**
   * Lists all bots created by the user.
   *
   * @returns Result with list of bot usernames or error
   */
  async listBots(): Promise<Result<string[], ResultError<typeof AppErrorCode.BOTFATHER_ERROR>>> {
    if (!this.botFatherManager) {
      return err({
        code: AppErrorCode.BOTFATHER_ERROR,
        message: 'BotFather service not initialized. Call init() first.',
      })
    }

    const result = await tryCatchAsync(async () => {
      const listResult = await this.botFatherManager!.listBots()
      if (!listResult.success) {
        throw new Error(listResult.error || 'Failed to list bots')
      }
      return (listResult.bots || []).map((bot: { username: string }) => bot.username)
    }, AppErrorCode.BOTFATHER_ERROR)

    return result
  }

  /**
   * Gets all bots with their tokens.
   *
   * @returns Result with bots and tokens or error
   */
  async getAllBotsWithTokens(): Promise<
    Result<Array<{ username: string; token: string }>, ResultError<typeof AppErrorCode.BOTFATHER_ERROR>>
  > {
    if (!this.botFatherManager) {
      return err({
        code: AppErrorCode.BOTFATHER_ERROR,
        message: 'BotFather service not initialized. Call init() first.',
      })
    }

    const result = await tryCatchAsync(async () => {
      const botsWithTokens = await this.botFatherManager!.getAllBotsWithTokens()
      return botsWithTokens.map((bot: { username: string; token: string }) => ({
        username: bot.username,
        token: bot.token,
      }))
    }, AppErrorCode.BOTFATHER_ERROR)

    return result
  }

  /**
   * Sets bot commands.
   *
   * @param botUsername - Bot username
   * @param commands - Commands to set
   * @returns Result indicating success or error
   */
  async setCommands(
    botUsername: string,
    commands: Array<{ command: string; description: string }>
  ): Promise<Result<void, ResultError<typeof AppErrorCode.BOTFATHER_ERROR>>> {
    if (!this.botFatherManager) {
      return err({
        code: AppErrorCode.BOTFATHER_ERROR,
        message: 'BotFather service not initialized. Call init() first.',
      })
    }

    const result = await tryCatchAsync(async () => {
      const setResult = await this.botFatherManager!.setCommands(botUsername, commands)
      if (!setResult.success) {
        throw new Error(setResult.error || 'Failed to set commands')
      }
      log.success(`Commands set for @${botUsername}`)
    }, AppErrorCode.BOTFATHER_ERROR)

    return result
  }

  /**
   * Sets bot description.
   *
   * @param botUsername - Bot username
   * @param description - Description text
   * @returns Result indicating success or error
   */
  async setDescription(
    botUsername: string,
    description: string
  ): Promise<Result<void, ResultError<typeof AppErrorCode.BOTFATHER_ERROR>>> {
    if (!this.botFatherManager) {
      return err({
        code: AppErrorCode.BOTFATHER_ERROR,
        message: 'BotFather service not initialized. Call init() first.',
      })
    }

    const result = await tryCatchAsync(async () => {
      await this.botFatherManager!.setDescription(botUsername, description)
      log.success(`Description set for @${botUsername}`)
    }, AppErrorCode.BOTFATHER_ERROR)

    return result
  }

  /**
   * Sets bot about text.
   *
   * @param botUsername - Bot username
   * @param aboutText - About text
   * @returns Result indicating success or error
   */
  async setAboutText(
    botUsername: string,
    aboutText: string
  ): Promise<Result<void, ResultError<typeof AppErrorCode.BOTFATHER_ERROR>>> {
    if (!this.botFatherManager) {
      return err({
        code: AppErrorCode.BOTFATHER_ERROR,
        message: 'BotFather service not initialized. Call init() first.',
      })
    }

    const result = await tryCatchAsync(async () => {
      await this.botFatherManager!.setAboutText(botUsername, aboutText)
      log.success(`About text set for @${botUsername}`)
    }, AppErrorCode.BOTFATHER_ERROR)

    return result
  }

  /**
   * Disconnects from Telegram.
   *
   * @returns Result indicating success or error
   */
  async disconnect(): Promise<Result<void, ResultError<typeof AppErrorCode.BOTFATHER_ERROR>>> {
    if (!this.client) {
      return ok(undefined)
    }

    const result = await tryCatchAsync(async () => {
      await this.client!.disconnect()
      this.client = null
      this.botFatherManager = null
      log.info('Disconnected from Telegram')
      fileLog.info('BOTFATHER', 'Disconnected from Telegram')
    }, AppErrorCode.BOTFATHER_ERROR)

    if (isErr(result)) {
      fileLog.error('BOTFATHER', 'Failed to disconnect', { error: result.error.message })
    }

    return result
  }

  /**
   * Generates a valid bot username from the bot name.
   *
   * @param name - The bot name
   * @returns A valid bot username ending with 'bot'
   */
  private generateBotUsername(name: string): string {
    const sanitized = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')

    if (sanitized.endsWith('bot')) {
      return sanitized
    }

    return `${sanitized}_bot`
  }
}

let instance: BotFatherService | null = null

/**
 * Gets the singleton BotFatherService instance.
 *
 * @returns The BotFatherService instance
 */
export function getBotFatherService(): BotFatherService {
  if (!instance) {
    instance = new BotFatherService()
  }
  return instance
}
