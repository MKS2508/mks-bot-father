import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ok, err } from '@mks2508/no-throw'

const mockPipelineRun = vi.fn()
const mockBotFatherInit = vi.fn()
const mockBotFatherDisconnect = vi.fn()
const mockBotFatherGetAllBotsWithTokens = vi.fn()
const mockBotFatherSetCommands = vi.fn()
const mockBotFatherSetDescription = vi.fn()
const mockBotFatherSetAboutText = vi.fn()
const mockBotFatherGetBotInfo = vi.fn()
const mockBotFatherSetName = vi.fn()
const mockBotFatherCheckUsernameAvailable = vi.fn()

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
    getBotInfo: mockBotFatherGetBotInfo,
    setName: mockBotFatherSetName,
    checkUsernameAvailable: mockBotFatherCheckUsernameAvailable,
  }),
}))

type ToolHandler = (args: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>
  isError?: boolean
}>

interface CapturedTool {
  name: string
  description: string
  handler: ToolHandler
}

let capturedTools: CapturedTool[] = []

vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  createSdkMcpServer: (config: { name: string; tools: CapturedTool[] }) => {
    capturedTools = config.tools
    return { name: config.name }
  },
  tool: (name: string, description: string, _schema: unknown, handler: ToolHandler) => ({
    name,
    description,
    handler,
  }),
}))

function getTool(name: string): CapturedTool | undefined {
  return capturedTools.find((t) => t.name === name)
}

describe('Bot Manager Tools', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    capturedTools = []
    mockBotFatherInit.mockResolvedValue(ok(undefined))
    mockBotFatherDisconnect.mockResolvedValue(ok(undefined))
    vi.resetModules()
    await import('../bot-manager.js')
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

      const tool = getTool('create_bot')
      expect(tool).toBeDefined()

      const result = await tool!.handler({
        name: 'TestBot',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.botUsername).toBe('test_bot')
      expect(parsed.botToken).toBe('bot_token_123')
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

      const tool = getTool('create_bot')
      const result = await tool!.handler({
        name: 'github_bot',
        createGithub: true,
        githubOrg: 'test-org',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.githubRepoUrl).toBe('https://github.com/user/github_bot')

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

      const tool = getTool('create_bot')
      const result = await tool!.handler({
        name: 'coolify_bot',
        deployToCoolify: true,
        coolifyServer: 'server-uuid',
        coolifyDestination: 'dest-uuid',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.deploymentUrl).toContain('coolify')
      expect(parsed.coolifyAppUuid).toBe('app-uuid-123')
    })

    it('should pass description to pipeline', async () => {
      mockPipelineRun.mockResolvedValue(
        ok({ success: true, botUsername: 'test', botToken: 'token', errors: [] })
      )

      const tool = getTool('create_bot')
      await tool!.handler({
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

      const tool = getTool('create_bot')
      const result = await tool!.handler({
        name: 'existing_bot',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Pipeline completed with errors')
      expect(result.content[0].text).toContain('Username taken')
      expect(result.content[0].text).toContain('Auth failed')
    })

    it('should handle pipeline Result error', async () => {
      mockPipelineRun.mockResolvedValue(
        err({
          code: 'UNKNOWN_ERROR',
          message: 'Pipeline crashed',
        })
      )

      const tool = getTool('create_bot')
      const result = await tool!.handler({
        name: 'crash_bot',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Pipeline failed')
      expect(result.content[0].text).toContain('Pipeline crashed')
    })

    it('should handle unexpected exceptions', async () => {
      mockPipelineRun.mockRejectedValue(new Error('Unexpected error'))

      const tool = getTool('create_bot')
      const result = await tool!.handler({
        name: 'error_bot',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Error creating bot')
      expect(result.content[0].text).toContain('Unexpected error')
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

      const tool = getTool('list_bots')
      const result = await tool!.handler({})

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.bots).toHaveLength(2)
      expect(parsed.bots[0].username).toBe('bot1')
      expect(parsed.bots[0].token).toBe('token1')
      expect(parsed.bots[1].username).toBe('bot2')
      expect(parsed.progress).toBeDefined()
      expect(parsed.progress.length).toBeGreaterThan(0)

      expect(mockBotFatherDisconnect).toHaveBeenCalled()
    })

    it('should handle no bots found', async () => {
      mockBotFatherGetAllBotsWithTokens.mockResolvedValue(ok([]))

      const tool = getTool('list_bots')
      const result = await tool!.handler({})

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.bots).toHaveLength(0)
      expect(parsed.message).toContain('No bots found')
      expect(parsed.progress).toBeDefined()
    })

    it('should handle BotFather init failure', async () => {
      mockBotFatherInit.mockResolvedValue(
        err({
          code: 'BOTFATHER_ERROR',
          message: 'Telegram credentials not configured',
        })
      )

      vi.resetModules()
      capturedTools = []
      await import('../bot-manager.js')

      const tool = getTool('list_bots')
      const result = await tool!.handler({})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to initialize BotFather')
    })

    it('should handle getAllBotsWithTokens failure', async () => {
      mockBotFatherGetAllBotsWithTokens.mockResolvedValue(
        err({
          code: 'BOTFATHER_ERROR',
          message: 'API timeout',
        })
      )

      const tool = getTool('list_bots')
      const result = await tool!.handler({})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to list bots')
      expect(result.content[0].text).toContain('API timeout')
    })

    it('should handle unexpected errors', async () => {
      mockBotFatherInit.mockRejectedValue(new Error('Connection refused'))

      vi.resetModules()
      capturedTools = []
      await import('../bot-manager.js')

      const tool = getTool('list_bots')
      const result = await tool!.handler({})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Error listing bots')
    })
  })

  describe('configure_bot tool', () => {
    it('should set commands successfully', async () => {
      mockBotFatherSetCommands.mockResolvedValue(ok(undefined))

      const tool = getTool('configure_bot')
      const result = await tool!.handler({
        botUsername: 'test_bot',
        commands: [
          { command: 'start', description: 'Start the bot' },
          { command: 'help', description: 'Get help' },
        ],
      })

      expect(result.isError).toBeFalsy()
      expect(result.content[0].text).toContain('Commands updated')
      expect(result.content[0].text).toContain('2 commands')

      expect(mockBotFatherDisconnect).toHaveBeenCalled()
    })

    it('should set description successfully', async () => {
      mockBotFatherSetDescription.mockResolvedValue(ok(undefined))

      const tool = getTool('configure_bot')
      const result = await tool!.handler({
        botUsername: 'test_bot',
        description: 'My new description',
      })

      expect(result.isError).toBeFalsy()
      expect(result.content[0].text).toContain('Description updated')
    })

    it('should set about text successfully', async () => {
      mockBotFatherSetAboutText.mockResolvedValue(ok(undefined))

      const tool = getTool('configure_bot')
      const result = await tool!.handler({
        botUsername: 'test_bot',
        aboutText: 'New about text',
      })

      expect(result.isError).toBeFalsy()
      expect(result.content[0].text).toContain('About text updated')
    })

    it('should update multiple settings at once', async () => {
      mockBotFatherSetCommands.mockResolvedValue(ok(undefined))
      mockBotFatherSetDescription.mockResolvedValue(ok(undefined))
      mockBotFatherSetAboutText.mockResolvedValue(ok(undefined))

      const tool = getTool('configure_bot')
      const result = await tool!.handler({
        botUsername: 'test_bot',
        commands: [{ command: 'test', description: 'Test' }],
        description: 'New desc',
        aboutText: 'New about',
      })

      expect(result.isError).toBeFalsy()
      expect(result.content[0].text).toContain('Commands updated')
      expect(result.content[0].text).toContain('Description updated')
      expect(result.content[0].text).toContain('About text updated')
    })

    it('should report partial success with errors', async () => {
      mockBotFatherSetCommands.mockResolvedValue(ok(undefined))
      mockBotFatherSetDescription.mockResolvedValue(
        err({ code: 'BOTFATHER_ERROR', message: 'Description too long' })
      )

      const tool = getTool('configure_bot')
      const result = await tool!.handler({
        botUsername: 'test_bot',
        commands: [{ command: 'test', description: 'Test' }],
        description: 'x'.repeat(600),
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.results).toContain('Commands updated (1 commands)')
      expect(parsed.errors).toHaveLength(1)
      expect(parsed.errors[0]).toContain('Description failed')
    })

    it('should return error when all operations fail', async () => {
      mockBotFatherSetCommands.mockResolvedValue(
        err({ code: 'BOTFATHER_ERROR', message: 'Commands error' })
      )
      mockBotFatherSetDescription.mockResolvedValue(
        err({ code: 'BOTFATHER_ERROR', message: 'Description error' })
      )

      const tool = getTool('configure_bot')
      const result = await tool!.handler({
        botUsername: 'test_bot',
        commands: [{ command: 'test', description: 'Test' }],
        description: 'desc',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Commands failed')
      expect(result.content[0].text).toContain('Description failed')
    })

    it('should return empty results when nothing requested', async () => {
      const tool = getTool('configure_bot')
      const result = await tool!.handler({
        botUsername: 'test_bot',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(false)
      expect(parsed.results).toHaveLength(0)
      expect(parsed.errors).toHaveLength(0)
    })

    it('should handle unexpected errors', async () => {
      mockBotFatherInit.mockRejectedValue(new Error('Connection failed'))

      vi.resetModules()
      capturedTools = []
      await import('../bot-manager.js')

      const tool = getTool('configure_bot')
      const result = await tool!.handler({
        botUsername: 'test_bot',
        commands: [{ command: 'test', description: 'Test' }],
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Error configuring bot')
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

      const tool = getTool('get_bot_token')
      const result = await tool!.handler({
        botUsername: 'test_bot',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.botUsername).toBe('test_bot')
      expect(parsed.token).toBe('secret_token_123')
      expect(parsed.progress).toBeDefined()

      expect(mockBotFatherDisconnect).toHaveBeenCalled()
    })

    it('should handle username with @ prefix', async () => {
      mockBotFatherGetAllBotsWithTokens.mockResolvedValue(
        ok([{ username: 'test_bot', token: 'token' }])
      )

      const tool = getTool('get_bot_token')
      const result = await tool!.handler({
        botUsername: '@test_bot',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.botUsername).toBe('test_bot')
    })

    it('should handle bot not found', async () => {
      mockBotFatherGetAllBotsWithTokens.mockResolvedValue(
        ok([
          { username: 'other_bot1', token: 'token1' },
          { username: 'other_bot2', token: 'token2' },
        ])
      )

      const tool = getTool('get_bot_token')
      const result = await tool!.handler({
        botUsername: 'nonexistent_bot',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('not found')
      expect(result.content[0].text).toContain('Available bots')
      expect(result.content[0].text).toContain('@other_bot1')
      expect(result.content[0].text).toContain('@other_bot2')
    })

    it('should handle BotFather init failure', async () => {
      mockBotFatherInit.mockResolvedValue(
        err({
          code: 'BOTFATHER_ERROR',
          message: 'Not authenticated',
        })
      )

      vi.resetModules()
      capturedTools = []
      await import('../bot-manager.js')

      const tool = getTool('get_bot_token')
      const result = await tool!.handler({
        botUsername: 'test_bot',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to initialize BotFather')
    })

    it('should handle getAllBotsWithTokens failure', async () => {
      mockBotFatherGetAllBotsWithTokens.mockResolvedValue(
        err({
          code: 'BOTFATHER_ERROR',
          message: 'Rate limited',
        })
      )

      const tool = getTool('get_bot_token')
      const result = await tool!.handler({
        botUsername: 'test_bot',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to get bots')
      expect(result.content[0].text).toContain('Rate limited')
    })

    it('should handle unexpected errors', async () => {
      mockBotFatherInit.mockRejectedValue(new Error('Network error'))

      vi.resetModules()
      capturedTools = []
      await import('../bot-manager.js')

      const tool = getTool('get_bot_token')
      const result = await tool!.handler({
        botUsername: 'test_bot',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Error')
    })
  })

  describe('get_bot_info tool', () => {
    it('should get bot info successfully', async () => {
      mockBotFatherGetBotInfo.mockResolvedValue(
        ok({
          username: 'test_bot',
          name: 'Test Bot',
          description: 'A test bot',
          aboutText: 'About text',
          commands: [{ command: 'start', description: 'Start' }],
        })
      )

      const tool = getTool('get_bot_info')
      expect(tool).toBeDefined()

      const result = await tool!.handler({ botUsername: 'test_bot' })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.botInfo.username).toBe('test_bot')
      expect(parsed.progress).toBeDefined()
      expect(mockBotFatherDisconnect).toHaveBeenCalled()
    })

    it('should handle username with @ prefix', async () => {
      mockBotFatherGetBotInfo.mockResolvedValue(
        ok({ username: 'test_bot', name: 'Test' })
      )

      const tool = getTool('get_bot_info')
      const result = await tool!.handler({ botUsername: '@test_bot' })

      expect(result.isError).toBeFalsy()
    })

    it('should handle getBotInfo failure', async () => {
      mockBotFatherGetBotInfo.mockResolvedValue(
        err({ code: 'BOTFATHER_ERROR', message: 'Bot not found' })
      )

      const tool = getTool('get_bot_info')
      const result = await tool!.handler({ botUsername: 'unknown_bot' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to get bot info')
    })

    it('should handle init failure', async () => {
      mockBotFatherInit.mockResolvedValue(
        err({ code: 'BOTFATHER_ERROR', message: 'Init failed' })
      )

      vi.resetModules()
      capturedTools = []
      await import('../bot-manager.js')

      const tool = getTool('get_bot_info')
      const result = await tool!.handler({ botUsername: 'test_bot' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to initialize BotFather')
    })
  })

  describe('set_bot_name tool', () => {
    it('should set bot name successfully', async () => {
      mockBotFatherSetName.mockResolvedValue(ok(undefined))

      const tool = getTool('set_bot_name')
      expect(tool).toBeDefined()

      const result = await tool!.handler({
        botUsername: 'test_bot',
        name: 'New Bot Name',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.newName).toBe('New Bot Name')
      expect(parsed.progress).toBeDefined()
      expect(mockBotFatherSetName).toHaveBeenCalledWith('test_bot', 'New Bot Name')
      expect(mockBotFatherDisconnect).toHaveBeenCalled()
    })

    it('should handle setName failure', async () => {
      mockBotFatherSetName.mockResolvedValue(
        err({ code: 'BOTFATHER_ERROR', message: 'Name too long' })
      )

      const tool = getTool('set_bot_name')
      const result = await tool!.handler({
        botUsername: 'test_bot',
        name: 'x'.repeat(100),
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to set bot name')
    })

    it('should handle init failure', async () => {
      mockBotFatherInit.mockResolvedValue(
        err({ code: 'BOTFATHER_ERROR', message: 'Auth error' })
      )

      vi.resetModules()
      capturedTools = []
      await import('../bot-manager.js')

      const tool = getTool('set_bot_name')
      const result = await tool!.handler({
        botUsername: 'test_bot',
        name: 'New Name',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to initialize BotFather')
    })
  })

  describe('check_username_available tool', () => {
    it('should return available for free username', async () => {
      mockBotFatherCheckUsernameAvailable.mockResolvedValue(true)

      const tool = getTool('check_username_available')
      expect(tool).toBeDefined()

      const result = await tool!.handler({ botUsername: 'new_bot' })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.isAvailable).toBe(true)
      expect(parsed.username).toBe('new_bot')
      expect(parsed.message).toContain('is available')
      expect(parsed.progress).toBeDefined()
    })

    it('should return unavailable for taken username', async () => {
      mockBotFatherCheckUsernameAvailable.mockResolvedValue(false)

      const tool = getTool('check_username_available')
      const result = await tool!.handler({ botUsername: 'existing_bot' })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.isAvailable).toBe(false)
      expect(parsed.message).toContain('already taken')
    })

    it('should add _bot suffix if missing', async () => {
      mockBotFatherCheckUsernameAvailable.mockResolvedValue(true)

      const tool = getTool('check_username_available')
      const result = await tool!.handler({ botUsername: 'myapp' })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.username).toBe('myapp_bot')
    })

    it('should not add suffix if already ends with Bot', async () => {
      mockBotFatherCheckUsernameAvailable.mockResolvedValue(true)

      const tool = getTool('check_username_available')
      const result = await tool!.handler({ botUsername: 'myAppBot' })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.username).toBe('myAppBot')
    })

    it('should handle @ prefix', async () => {
      mockBotFatherCheckUsernameAvailable.mockResolvedValue(true)

      const tool = getTool('check_username_available')
      const result = await tool!.handler({ botUsername: '@test_bot' })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.username).toBe('test_bot')
    })

    it('should handle init failure', async () => {
      mockBotFatherInit.mockResolvedValue(
        err({ code: 'BOTFATHER_ERROR', message: 'Network error' })
      )

      vi.resetModules()
      capturedTools = []
      await import('../bot-manager.js')

      const tool = getTool('check_username_available')
      const result = await tool!.handler({ botUsername: 'test_bot' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to initialize BotFather')
    })
  })
})
