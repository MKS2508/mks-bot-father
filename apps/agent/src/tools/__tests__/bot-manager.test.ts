import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ok, err } from '@mks2508/no-throw'

const mockPipelineRun = vi.fn()
const mockBotFatherInit = vi.fn()
const mockBotFatherDisconnect = vi.fn()
const mockBotFatherGetAllBotsWithTokens = vi.fn()
const mockBotFatherSetCommands = vi.fn()
const mockBotFatherSetDescription = vi.fn()
const mockBotFatherSetAboutText = vi.fn()

vi.mock('@mks2508/mks-bot-father', () => ({
  getPipeline: () => ({
    run: mockPipelineRun,
  }),
  getBotFatherService: () => ({
    init: mockBotFatherInit,
    disconnect: mockBotFatherDisconnect,
    getAllBotsWithTokens: mockBotFatherGetAllBotsWithTokens,
    setCommands: mockBotFatherSetCommands,
    setDescription: mockBotFatherSetDescription,
    setAboutText: mockBotFatherSetAboutText,
  }),
}))

describe('Bot Manager Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBotFatherInit.mockResolvedValue(ok(undefined))
    mockBotFatherDisconnect.mockResolvedValue(ok(undefined))
  })

  describe('create_bot tool', () => {
    it('should create bot via pipeline successfully', async () => {
      mockPipelineRun.mockResolvedValue(
        ok({
          success: true,
          botUsername: 'test_bot',
          botToken: 'bot_token_123',
          githubRepoUrl: null,
          deploymentUrl: null,
          coolifyAppUuid: null,
          errors: [],
        })
      )

      const { botManagerServer } = await import('../bot-manager.js')
      const tools = botManagerServer.listTools()
      const createTool = tools.find((t) => t.name === 'create_bot')

      expect(createTool).toBeDefined()

      const result = await botManagerServer.callTool('create_bot', {
        name: 'TestBot',
      })

      expect(result.isError).toBeFalsy()
      if (result.content[0].type === 'text') {
        const parsed = JSON.parse(result.content[0].text)
        expect(parsed.success).toBe(true)
        expect(parsed.botUsername).toBe('test_bot')
        expect(parsed.botToken).toBe('bot_token_123')
      }
    })

    it('should create bot with GitHub repo', async () => {
      mockPipelineRun.mockResolvedValue(
        ok({
          success: true,
          botUsername: 'github_bot',
          botToken: 'token',
          githubRepoUrl: 'https://github.com/user/github_bot',
          errors: [],
        })
      )

      vi.resetModules()
      const { botManagerServer } = await import('../bot-manager.js')
      const result = await botManagerServer.callTool('create_bot', {
        name: 'github_bot',
        createGithub: true,
        githubOrg: 'test-org',
      })

      expect(result.isError).toBeFalsy()
      if (result.content[0].type === 'text') {
        const parsed = JSON.parse(result.content[0].text)
        expect(parsed.githubRepoUrl).toBe('https://github.com/user/github_bot')
      }

      expect(mockPipelineRun).toHaveBeenCalledWith(
        expect.objectContaining({
          createGitHubRepo: true,
          githubOrg: 'test-org',
        })
      )
    })

    it('should create bot with Coolify deployment', async () => {
      mockPipelineRun.mockResolvedValue(
        ok({
          success: true,
          botUsername: 'coolify_bot',
          botToken: 'token',
          deploymentUrl: 'https://coolify.example.com/app/uuid',
          coolifyAppUuid: 'app-uuid-123',
          errors: [],
        })
      )

      vi.resetModules()
      const { botManagerServer } = await import('../bot-manager.js')
      const result = await botManagerServer.callTool('create_bot', {
        name: 'coolify_bot',
        deployToCoolify: true,
        coolifyServer: 'server-uuid',
        coolifyDestination: 'dest-uuid',
      })

      expect(result.isError).toBeFalsy()
      if (result.content[0].type === 'text') {
        const parsed = JSON.parse(result.content[0].text)
        expect(parsed.deploymentUrl).toContain('coolify')
        expect(parsed.coolifyAppUuid).toBe('app-uuid-123')
      }
    })

    it('should pass description to pipeline', async () => {
      mockPipelineRun.mockResolvedValue(
        ok({ success: true, botUsername: 'test', botToken: 'token', errors: [] })
      )

      vi.resetModules()
      const { botManagerServer } = await import('../bot-manager.js')
      await botManagerServer.callTool('create_bot', {
        name: 'test_bot',
        description: 'My awesome bot',
      })

      expect(mockPipelineRun).toHaveBeenCalledWith(
        expect.objectContaining({
          botDescription: 'My awesome bot',
        })
      )
    })

    it('should handle pipeline errors', async () => {
      mockPipelineRun.mockResolvedValue(
        ok({
          success: false,
          errors: ['BotFather error: Username taken', 'GitHub error: Auth failed'],
        })
      )

      vi.resetModules()
      const { botManagerServer } = await import('../bot-manager.js')
      const result = await botManagerServer.callTool('create_bot', {
        name: 'existing_bot',
      })

      expect(result.isError).toBe(true)
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('Pipeline completed with errors')
        expect(result.content[0].text).toContain('Username taken')
        expect(result.content[0].text).toContain('Auth failed')
      }
    })

    it('should handle pipeline Result error', async () => {
      mockPipelineRun.mockResolvedValue(
        err({
          code: 'UNKNOWN_ERROR',
          message: 'Pipeline crashed',
        })
      )

      vi.resetModules()
      const { botManagerServer } = await import('../bot-manager.js')
      const result = await botManagerServer.callTool('create_bot', {
        name: 'crash_bot',
      })

      expect(result.isError).toBe(true)
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('Pipeline failed')
        expect(result.content[0].text).toContain('Pipeline crashed')
      }
    })

    it('should handle unexpected exceptions', async () => {
      mockPipelineRun.mockRejectedValue(new Error('Unexpected error'))

      vi.resetModules()
      const { botManagerServer } = await import('../bot-manager.js')
      const result = await botManagerServer.callTool('create_bot', {
        name: 'error_bot',
      })

      expect(result.isError).toBe(true)
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('Error creating bot')
        expect(result.content[0].text).toContain('Unexpected error')
      }
    })
  })

  describe('list_bots tool', () => {
    it('should list all bots with tokens', async () => {
      mockBotFatherGetAllBotsWithTokens.mockResolvedValue(
        ok([
          { username: 'bot1', token: 'token1' },
          { username: 'bot2', token: 'token2' },
        ])
      )

      vi.resetModules()
      const { botManagerServer } = await import('../bot-manager.js')
      const result = await botManagerServer.callTool('list_bots', {})

      expect(result.isError).toBeFalsy()
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('Found 2 bot(s)')
        expect(result.content[0].text).toContain('@bot1')
        expect(result.content[0].text).toContain('token1')
        expect(result.content[0].text).toContain('@bot2')
      }

      expect(mockBotFatherDisconnect).toHaveBeenCalled()
    })

    it('should handle no bots found', async () => {
      mockBotFatherGetAllBotsWithTokens.mockResolvedValue(ok([]))

      vi.resetModules()
      const { botManagerServer } = await import('../bot-manager.js')
      const result = await botManagerServer.callTool('list_bots', {})

      expect(result.isError).toBeFalsy()
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('No bots found')
        expect(result.content[0].text).toContain('create_bot tool')
      }
    })

    it('should handle BotFather init failure', async () => {
      mockBotFatherInit.mockResolvedValue(
        err({
          code: 'BOTFATHER_ERROR',
          message: 'Telegram credentials not configured',
        })
      )

      vi.resetModules()
      const { botManagerServer } = await import('../bot-manager.js')
      const result = await botManagerServer.callTool('list_bots', {})

      expect(result.isError).toBe(true)
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('Failed to initialize BotFather')
      }
    })

    it('should handle getAllBotsWithTokens failure', async () => {
      mockBotFatherGetAllBotsWithTokens.mockResolvedValue(
        err({
          code: 'BOTFATHER_ERROR',
          message: 'API timeout',
        })
      )

      vi.resetModules()
      const { botManagerServer } = await import('../bot-manager.js')
      const result = await botManagerServer.callTool('list_bots', {})

      expect(result.isError).toBe(true)
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('Failed to list bots')
        expect(result.content[0].text).toContain('API timeout')
      }
    })

    it('should handle unexpected errors', async () => {
      mockBotFatherInit.mockRejectedValue(new Error('Connection refused'))

      vi.resetModules()
      const { botManagerServer } = await import('../bot-manager.js')
      const result = await botManagerServer.callTool('list_bots', {})

      expect(result.isError).toBe(true)
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('Error listing bots')
      }
    })
  })

  describe('configure_bot tool', () => {
    it('should set commands successfully', async () => {
      mockBotFatherSetCommands.mockResolvedValue(ok(undefined))

      vi.resetModules()
      const { botManagerServer } = await import('../bot-manager.js')
      const result = await botManagerServer.callTool('configure_bot', {
        botUsername: 'test_bot',
        commands: [
          { command: 'start', description: 'Start the bot' },
          { command: 'help', description: 'Get help' },
        ],
      })

      expect(result.isError).toBeFalsy()
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('Commands updated')
        expect(result.content[0].text).toContain('2 commands')
      }

      expect(mockBotFatherDisconnect).toHaveBeenCalled()
    })

    it('should set description successfully', async () => {
      mockBotFatherSetDescription.mockResolvedValue(ok(undefined))

      vi.resetModules()
      const { botManagerServer } = await import('../bot-manager.js')
      const result = await botManagerServer.callTool('configure_bot', {
        botUsername: 'test_bot',
        description: 'My new description',
      })

      expect(result.isError).toBeFalsy()
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('Description updated')
      }
    })

    it('should set about text successfully', async () => {
      mockBotFatherSetAboutText.mockResolvedValue(ok(undefined))

      vi.resetModules()
      const { botManagerServer } = await import('../bot-manager.js')
      const result = await botManagerServer.callTool('configure_bot', {
        botUsername: 'test_bot',
        aboutText: 'New about text',
      })

      expect(result.isError).toBeFalsy()
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('About text updated')
      }
    })

    it('should update multiple settings at once', async () => {
      mockBotFatherSetCommands.mockResolvedValue(ok(undefined))
      mockBotFatherSetDescription.mockResolvedValue(ok(undefined))
      mockBotFatherSetAboutText.mockResolvedValue(ok(undefined))

      vi.resetModules()
      const { botManagerServer } = await import('../bot-manager.js')
      const result = await botManagerServer.callTool('configure_bot', {
        botUsername: 'test_bot',
        commands: [{ command: 'test', description: 'Test' }],
        description: 'New desc',
        aboutText: 'New about',
      })

      expect(result.isError).toBeFalsy()
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('Commands updated')
        expect(result.content[0].text).toContain('Description updated')
        expect(result.content[0].text).toContain('About text updated')
      }
    })

    it('should report partial success with errors', async () => {
      mockBotFatherSetCommands.mockResolvedValue(ok(undefined))
      mockBotFatherSetDescription.mockResolvedValue(
        err({ code: 'BOTFATHER_ERROR', message: 'Description too long' })
      )

      vi.resetModules()
      const { botManagerServer } = await import('../bot-manager.js')
      const result = await botManagerServer.callTool('configure_bot', {
        botUsername: 'test_bot',
        commands: [{ command: 'test', description: 'Test' }],
        description: 'x'.repeat(600),
      })

      expect(result.isError).toBeFalsy()
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('Success')
        expect(result.content[0].text).toContain('Commands updated')
        expect(result.content[0].text).toContain('Errors')
        expect(result.content[0].text).toContain('Description failed')
      }
    })

    it('should return error when all operations fail', async () => {
      mockBotFatherSetCommands.mockResolvedValue(
        err({ code: 'BOTFATHER_ERROR', message: 'Commands error' })
      )
      mockBotFatherSetDescription.mockResolvedValue(
        err({ code: 'BOTFATHER_ERROR', message: 'Description error' })
      )

      vi.resetModules()
      const { botManagerServer } = await import('../bot-manager.js')
      const result = await botManagerServer.callTool('configure_bot', {
        botUsername: 'test_bot',
        commands: [{ command: 'test', description: 'Test' }],
        description: 'desc',
      })

      expect(result.isError).toBe(true)
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('Commands failed')
        expect(result.content[0].text).toContain('Description failed')
      }
    })

    it('should return "No changes" when nothing requested', async () => {
      vi.resetModules()
      const { botManagerServer } = await import('../bot-manager.js')
      const result = await botManagerServer.callTool('configure_bot', {
        botUsername: 'test_bot',
      })

      expect(result.isError).toBeFalsy()
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('No changes requested')
      }
    })

    it('should handle unexpected errors', async () => {
      mockBotFatherInit.mockRejectedValue(new Error('Connection failed'))

      vi.resetModules()
      const { botManagerServer } = await import('../bot-manager.js')
      const result = await botManagerServer.callTool('configure_bot', {
        botUsername: 'test_bot',
        commands: [{ command: 'test', description: 'Test' }],
      })

      expect(result.isError).toBe(true)
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('Error configuring bot')
      }
    })
  })

  describe('get_bot_token tool', () => {
    it('should return token for existing bot', async () => {
      mockBotFatherGetAllBotsWithTokens.mockResolvedValue(
        ok([
          { username: 'test_bot', token: 'secret_token_123' },
          { username: 'other_bot', token: 'other_token' },
        ])
      )

      vi.resetModules()
      const { botManagerServer } = await import('../bot-manager.js')
      const result = await botManagerServer.callTool('get_bot_token', {
        botUsername: 'test_bot',
      })

      expect(result.isError).toBeFalsy()
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('@test_bot')
        expect(result.content[0].text).toContain('secret_token_123')
      }

      expect(mockBotFatherDisconnect).toHaveBeenCalled()
    })

    it('should handle username with @ prefix', async () => {
      mockBotFatherGetAllBotsWithTokens.mockResolvedValue(
        ok([{ username: 'test_bot', token: 'token' }])
      )

      vi.resetModules()
      const { botManagerServer } = await import('../bot-manager.js')
      const result = await botManagerServer.callTool('get_bot_token', {
        botUsername: '@test_bot',
      })

      expect(result.isError).toBeFalsy()
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('@test_bot')
      }
    })

    it('should handle bot not found', async () => {
      mockBotFatherGetAllBotsWithTokens.mockResolvedValue(
        ok([
          { username: 'other_bot1', token: 'token1' },
          { username: 'other_bot2', token: 'token2' },
        ])
      )

      vi.resetModules()
      const { botManagerServer } = await import('../bot-manager.js')
      const result = await botManagerServer.callTool('get_bot_token', {
        botUsername: 'nonexistent_bot',
      })

      expect(result.isError).toBe(true)
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('not found')
        expect(result.content[0].text).toContain('Available bots')
        expect(result.content[0].text).toContain('@other_bot1')
        expect(result.content[0].text).toContain('@other_bot2')
      }
    })

    it('should handle BotFather init failure', async () => {
      mockBotFatherInit.mockResolvedValue(
        err({
          code: 'BOTFATHER_ERROR',
          message: 'Not authenticated',
        })
      )

      vi.resetModules()
      const { botManagerServer } = await import('../bot-manager.js')
      const result = await botManagerServer.callTool('get_bot_token', {
        botUsername: 'test_bot',
      })

      expect(result.isError).toBe(true)
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('Failed to initialize BotFather')
      }
    })

    it('should handle getAllBotsWithTokens failure', async () => {
      mockBotFatherGetAllBotsWithTokens.mockResolvedValue(
        err({
          code: 'BOTFATHER_ERROR',
          message: 'Rate limited',
        })
      )

      vi.resetModules()
      const { botManagerServer } = await import('../bot-manager.js')
      const result = await botManagerServer.callTool('get_bot_token', {
        botUsername: 'test_bot',
      })

      expect(result.isError).toBe(true)
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('Failed to get bots')
        expect(result.content[0].text).toContain('Rate limited')
      }
    })

    it('should handle unexpected errors', async () => {
      mockBotFatherInit.mockRejectedValue(new Error('Network error'))

      vi.resetModules()
      const { botManagerServer } = await import('../bot-manager.js')
      const result = await botManagerServer.callTool('get_bot_token', {
        botUsername: 'test_bot',
      })

      expect(result.isError).toBe(true)
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('Error')
      }
    })
  })
})
