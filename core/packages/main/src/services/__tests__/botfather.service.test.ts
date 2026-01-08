import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { isOk, isErr } from '@mks2508/no-throw'

let mockApiId: number | undefined = 12345
let mockApiHash: string | undefined = 'test_api_hash'

const mockEnsureAuthorized = vi.fn()
const mockDisconnect = vi.fn()
const mockCreateBot = vi.fn()
const mockListBots = vi.fn()
const mockGetAllBotsWithTokens = vi.fn()
const mockSetCommands = vi.fn()
const mockSetDescription = vi.fn()
const mockSetAboutText = vi.fn()
const mockCreateEnv = vi.fn()

vi.mock('../config.service.js', () => ({
  getConfigService: () => ({
    getTelegramCredentials: () => ({
      apiId: mockApiId,
      apiHash: mockApiHash,
    }),
  }),
}))

vi.mock('@mks2508/telegram-bot-manager', () => ({
  BootstrapClient: class MockBootstrapClient {
    ensureAuthorized = mockEnsureAuthorized
    disconnect = mockDisconnect
  },
  BotFatherManager: class MockBotFatherManager {
    createBot = mockCreateBot
    listBots = mockListBots
    getAllBotsWithTokens = mockGetAllBotsWithTokens
    setCommands = mockSetCommands
    setDescription = mockSetDescription
    setAboutText = mockSetAboutText
  },
  EnvManager: class MockEnvManager {
    createEnv = mockCreateEnv
  },
}))

describe('BotFatherService', () => {
  let BotFatherService: typeof import('../botfather.service.js').BotFatherService
  let getBotFatherService: typeof import('../botfather.service.js').getBotFatherService

  beforeEach(async () => {
    mockApiId = 12345
    mockApiHash = 'test_api_hash'

    mockEnsureAuthorized.mockResolvedValue(undefined)
    mockDisconnect.mockResolvedValue(undefined)
    mockCreateBot.mockReset()
    mockListBots.mockReset()
    mockGetAllBotsWithTokens.mockReset()
    mockSetCommands.mockReset()
    mockSetDescription.mockReset()
    mockSetAboutText.mockReset()
    mockCreateEnv.mockReset()

    vi.resetModules()
    const module = await import('../botfather.service.js')
    BotFatherService = module.BotFatherService
    getBotFatherService = module.getBotFatherService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('init()', () => {
    it('should initialize with valid credentials', async () => {
      const service = new BotFatherService()
      const result = await service.init()

      expect(isOk(result)).toBe(true)
      expect(mockEnsureAuthorized).toHaveBeenCalled()
    })

    it('should error if apiId is missing', async () => {
      mockApiId = undefined

      vi.resetModules()
      const freshModule = await import('../botfather.service.js')
      const service = new freshModule.BotFatherService()
      const result = await service.init()

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('Telegram API credentials not configured')
      }
    })

    it('should error if apiHash is missing', async () => {
      mockApiHash = undefined

      vi.resetModules()
      const freshModule = await import('../botfather.service.js')
      const service = new freshModule.BotFatherService()
      const result = await service.init()

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('Telegram API credentials not configured')
      }
    })

    it('should handle connection failure', async () => {
      mockEnsureAuthorized.mockRejectedValueOnce(new Error('Connection failed'))

      const service = new BotFatherService()
      const result = await service.init()

      expect(isErr(result)).toBe(true)
    })
  })

  describe('createBot()', () => {
    it('should error if service not initialized', async () => {
      const service = new BotFatherService()
      const result = await service.createBot({ botName: 'TestBot' })

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('not initialized')
      }
    })

    it('should create bot successfully', async () => {
      mockCreateBot.mockResolvedValue({
        success: true,
        botToken: 'bot_token_123',
        botUsername: 'test_bot',
      })

      const service = new BotFatherService()
      await service.init()
      const result = await service.createBot({ botName: 'TestBot', botUsername: 'test_bot' })

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.botToken).toBe('bot_token_123')
        expect(result.value.botUsername).toBe('test_bot')
      }
    })

    it('should generate username from name if not provided', async () => {
      mockCreateBot.mockResolvedValue({
        success: true,
        botToken: 'bot_token_456',
        botUsername: 'my_awesome_bot',
      })

      const service = new BotFatherService()
      await service.init()
      await service.createBot({ botName: 'My Awesome' })

      expect(mockCreateBot).toHaveBeenCalledWith(
        expect.objectContaining({
          botUsername: 'my_awesome_bot',
        })
      )
    })

    it('should set description if provided', async () => {
      mockCreateBot.mockResolvedValue({
        success: true,
        botToken: 'token',
        botUsername: 'desc_bot',
      })
      mockSetDescription.mockResolvedValue(undefined)

      const service = new BotFatherService()
      await service.init()
      await service.createBot({
        botName: 'DescBot',
        botUsername: 'desc_bot',
        description: 'Test description',
      })

      expect(mockSetDescription).toHaveBeenCalledWith('desc_bot', 'Test description')
    })

    it('should set aboutText if provided', async () => {
      mockCreateBot.mockResolvedValue({
        success: true,
        botToken: 'token',
        botUsername: 'about_bot',
      })
      mockSetAboutText.mockResolvedValue(undefined)

      const service = new BotFatherService()
      await service.init()
      await service.createBot({
        botName: 'AboutBot',
        botUsername: 'about_bot',
        aboutText: 'Test about text',
      })

      expect(mockSetAboutText).toHaveBeenCalledWith('about_bot', 'Test about text')
    })

    it('should save bot to EnvManager', async () => {
      mockCreateBot.mockResolvedValue({
        success: true,
        botToken: 'bot_token_env',
        botUsername: 'env_bot',
      })
      mockCreateEnv.mockResolvedValue(undefined)

      const service = new BotFatherService()
      await service.init()
      await service.createBot({ botName: 'EnvBot', botUsername: 'env_bot' })

      expect(mockCreateEnv).toHaveBeenCalledWith('env_bot', 'local', {
        botToken: 'bot_token_env',
        mode: 'polling',
      })
    })

    it('should handle creation failure', async () => {
      mockCreateBot.mockResolvedValue({
        success: false,
        error: 'Username already taken',
      })

      const service = new BotFatherService()
      await service.init()
      const result = await service.createBot({ botName: 'FailBot' })

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('Username already taken')
      }
    })

    it('should handle creation failure with no error message', async () => {
      mockCreateBot.mockResolvedValue({
        success: false,
      })

      const service = new BotFatherService()
      await service.init()
      const result = await service.createBot({ botName: 'FailBot' })

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('Failed to create bot')
      }
    })
  })

  describe('listBots()', () => {
    it('should error if service not initialized', async () => {
      const service = new BotFatherService()
      const result = await service.listBots()

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('not initialized')
      }
    })

    it('should return list of bot usernames', async () => {
      mockListBots.mockResolvedValue({
        success: true,
        bots: [{ username: 'bot1' }, { username: 'bot2' }, { username: 'bot3' }],
      })

      const service = new BotFatherService()
      await service.init()
      const result = await service.listBots()

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toEqual(['bot1', 'bot2', 'bot3'])
      }
    })

    it('should return empty array if no bots', async () => {
      mockListBots.mockResolvedValue({
        success: true,
        bots: [],
      })

      const service = new BotFatherService()
      await service.init()
      const result = await service.listBots()

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toEqual([])
      }
    })

    it('should handle undefined bots array', async () => {
      mockListBots.mockResolvedValue({
        success: true,
      })

      const service = new BotFatherService()
      await service.init()
      const result = await service.listBots()

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toEqual([])
      }
    })

    it('should handle list failure', async () => {
      mockListBots.mockResolvedValue({
        success: false,
        error: 'Failed to list bots',
      })

      const service = new BotFatherService()
      await service.init()
      const result = await service.listBots()

      expect(isErr(result)).toBe(true)
    })

    it('should handle list failure with no error message', async () => {
      mockListBots.mockResolvedValue({
        success: false,
      })

      const service = new BotFatherService()
      await service.init()
      const result = await service.listBots()

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('Failed to list bots')
      }
    })
  })

  describe('getAllBotsWithTokens()', () => {
    it('should error if service not initialized', async () => {
      const service = new BotFatherService()
      const result = await service.getAllBotsWithTokens()

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('not initialized')
      }
    })

    it('should return bots with tokens', async () => {
      mockGetAllBotsWithTokens.mockResolvedValue([
        { username: 'bot1', token: 'token1' },
        { username: 'bot2', token: 'token2' },
      ])

      const service = new BotFatherService()
      await service.init()
      const result = await service.getAllBotsWithTokens()

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toHaveLength(2)
        expect(result.value[0]).toEqual({ username: 'bot1', token: 'token1' })
        expect(result.value[1]).toEqual({ username: 'bot2', token: 'token2' })
      }
    })

    it('should return empty array if no bots', async () => {
      mockGetAllBotsWithTokens.mockResolvedValue([])

      const service = new BotFatherService()
      await service.init()
      const result = await service.getAllBotsWithTokens()

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toEqual([])
      }
    })

    it('should handle API failure', async () => {
      mockGetAllBotsWithTokens.mockRejectedValue(new Error('API error'))

      const service = new BotFatherService()
      await service.init()
      const result = await service.getAllBotsWithTokens()

      expect(isErr(result)).toBe(true)
    })
  })

  describe('setCommands()', () => {
    it('should error if service not initialized', async () => {
      const service = new BotFatherService()
      const result = await service.setCommands('test_bot', [])

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('not initialized')
      }
    })

    it('should set commands successfully', async () => {
      mockSetCommands.mockResolvedValue({ success: true })

      const service = new BotFatherService()
      await service.init()

      const commands = [
        { command: 'start', description: 'Start the bot' },
        { command: 'help', description: 'Get help' },
      ]
      const result = await service.setCommands('test_bot', commands)

      expect(isOk(result)).toBe(true)
      expect(mockSetCommands).toHaveBeenCalledWith('test_bot', commands)
    })

    it('should handle set commands failure', async () => {
      mockSetCommands.mockResolvedValue({
        success: false,
        error: 'Invalid commands',
      })

      const service = new BotFatherService()
      await service.init()
      const result = await service.setCommands('test_bot', [])

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('Invalid commands')
      }
    })

    it('should handle set commands failure with no error message', async () => {
      mockSetCommands.mockResolvedValue({
        success: false,
      })

      const service = new BotFatherService()
      await service.init()
      const result = await service.setCommands('test_bot', [])

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('Failed to set commands')
      }
    })
  })

  describe('setDescription()', () => {
    it('should error if service not initialized', async () => {
      const service = new BotFatherService()
      const result = await service.setDescription('test_bot', 'Test')

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('not initialized')
      }
    })

    it('should set description successfully', async () => {
      mockSetDescription.mockResolvedValue(undefined)

      const service = new BotFatherService()
      await service.init()
      const result = await service.setDescription('test_bot', 'New description')

      expect(isOk(result)).toBe(true)
      expect(mockSetDescription).toHaveBeenCalledWith('test_bot', 'New description')
    })

    it('should handle set description failure', async () => {
      mockSetDescription.mockRejectedValue(new Error('Failed to set description'))

      const service = new BotFatherService()
      await service.init()
      const result = await service.setDescription('test_bot', 'Bad description')

      expect(isErr(result)).toBe(true)
    })
  })

  describe('setAboutText()', () => {
    it('should error if service not initialized', async () => {
      const service = new BotFatherService()
      const result = await service.setAboutText('test_bot', 'Test')

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('not initialized')
      }
    })

    it('should set about text successfully', async () => {
      mockSetAboutText.mockResolvedValue(undefined)

      const service = new BotFatherService()
      await service.init()
      const result = await service.setAboutText('test_bot', 'New about text')

      expect(isOk(result)).toBe(true)
      expect(mockSetAboutText).toHaveBeenCalledWith('test_bot', 'New about text')
    })

    it('should handle set about text failure', async () => {
      mockSetAboutText.mockRejectedValue(new Error('Failed to set about'))

      const service = new BotFatherService()
      await service.init()
      const result = await service.setAboutText('test_bot', 'Bad about')

      expect(isErr(result)).toBe(true)
    })
  })

  describe('disconnect()', () => {
    it('should return ok if not connected', async () => {
      const service = new BotFatherService()
      const result = await service.disconnect()

      expect(isOk(result)).toBe(true)
    })

    it('should disconnect successfully', async () => {
      mockDisconnect.mockResolvedValue(undefined)

      const service = new BotFatherService()
      await service.init()
      const result = await service.disconnect()

      expect(isOk(result)).toBe(true)
      expect(mockDisconnect).toHaveBeenCalled()
    })

    it('should handle disconnect failure', async () => {
      const service = new BotFatherService()
      await service.init()

      mockDisconnect.mockRejectedValueOnce(new Error('Disconnect failed'))
      const result = await service.disconnect()

      expect(isErr(result)).toBe(true)
    })
  })

  describe('getBotFatherService() singleton', () => {
    it('should return the same instance', async () => {
      const instance1 = getBotFatherService()
      const instance2 = getBotFatherService()

      expect(instance1).toBe(instance2)
    })
  })

  describe('generateBotUsername (tested via createBot)', () => {
    it('should sanitize name and add _bot suffix', async () => {
      mockCreateBot.mockResolvedValue({
        success: true,
        botToken: 'token',
        botUsername: 'my_cool_app_bot',
      })

      const service = new BotFatherService()
      await service.init()
      await service.createBot({ botName: 'My Cool App!' })

      expect(mockCreateBot).toHaveBeenCalledWith({
        botName: 'My Cool App!',
        botUsername: 'my_cool_app_bot',
      })
    })

    it('should not duplicate bot suffix if name already ends with bot', async () => {
      mockCreateBot.mockResolvedValue({
        success: true,
        botToken: 'token',
        botUsername: 'testbot',
      })

      const service = new BotFatherService()
      await service.init()
      await service.createBot({ botName: 'TestBot' })

      expect(mockCreateBot).toHaveBeenCalledWith({
        botName: 'TestBot',
        botUsername: 'testbot',
      })
    })

    it('should remove special characters from username', async () => {
      mockCreateBot.mockResolvedValue({
        success: true,
        botToken: 'token',
        botUsername: 'hello_world_bot',
      })

      const service = new BotFatherService()
      await service.init()
      await service.createBot({ botName: 'Hello@#$%World' })

      expect(mockCreateBot).toHaveBeenCalledWith({
        botName: 'Hello@#$%World',
        botUsername: 'hello_world_bot',
      })
    })

    it('should collapse multiple underscores', async () => {
      mockCreateBot.mockResolvedValue({
        success: true,
        botToken: 'token',
        botUsername: 'my_test_bot',
      })

      const service = new BotFatherService()
      await service.init()
      await service.createBot({ botName: 'My___Test' })

      expect(mockCreateBot).toHaveBeenCalledWith({
        botName: 'My___Test',
        botUsername: 'my_test_bot',
      })
    })

    it('should trim leading/trailing underscores', async () => {
      mockCreateBot.mockResolvedValue({
        success: true,
        botToken: 'token',
        botUsername: 'trimmed_bot',
      })

      const service = new BotFatherService()
      await service.init()
      await service.createBot({ botName: '___Trimmed___' })

      expect(mockCreateBot).toHaveBeenCalledWith({
        botName: '___Trimmed___',
        botUsername: 'trimmed_bot',
      })
    })
  })
})
