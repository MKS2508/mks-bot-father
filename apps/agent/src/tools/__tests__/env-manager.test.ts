import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockListBots = vi.fn()
const mockGetActiveBot = vi.fn()
const mockSetActiveBot = vi.fn()
const mockBotExists = vi.fn()
const mockReadEnv = vi.fn()
const mockUpdateEnv = vi.fn()
const mockDeleteBot = vi.fn()
const mockGetMetadata = vi.fn()

class MockEnvManager {
  listBots = mockListBots
  getActiveBot = mockGetActiveBot
  setActiveBot = mockSetActiveBot
  botExists = mockBotExists
  readEnv = mockReadEnv
  updateEnv = mockUpdateEnv
  deleteBot = mockDeleteBot
  getMetadata = mockGetMetadata
}

vi.mock('@mks2508/telegram-bot-manager', () => ({
  EnvManager: MockEnvManager,
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

describe('Env Manager Tools', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    capturedTools = []
    mockBotExists.mockReturnValue(true)
    vi.resetModules()
    await import('../env-manager.js')
  })

  describe('list_configured_bots tool', () => {
    it('should list all configured bots', async () => {
      mockListBots.mockReturnValue([
        { username: 'bot1', environments: ['local', 'production'] },
        { username: 'bot2', environments: ['local'] },
      ])
      mockGetActiveBot.mockReturnValue('bot1')

      const tool = getTool('list_configured_bots')
      expect(tool).toBeDefined()

      const result = await tool!.handler({})

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.bots).toHaveLength(2)
      expect(parsed.activeBot).toBe('bot1')
      expect(parsed.progress).toBeDefined()
    })

    it('should handle empty bot list', async () => {
      mockListBots.mockReturnValue([])
      mockGetActiveBot.mockReturnValue(null)

      const tool = getTool('list_configured_bots')
      const result = await tool!.handler({})

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.bots).toHaveLength(0)
      expect(parsed.activeBot).toBeNull()
    })

    it('should handle errors', async () => {
      mockListBots.mockImplementation(() => {
        throw new Error('Filesystem error')
      })

      const tool = getTool('list_configured_bots')
      const result = await tool!.handler({})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Error listing bots')
    })
  })

  describe('get_active_bot tool', () => {
    it('should return active bot', async () => {
      mockGetActiveBot.mockReturnValue('my_bot')

      const tool = getTool('get_active_bot')
      const result = await tool!.handler({})

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.activeBot).toBe('my_bot')
    })

    it('should handle no active bot', async () => {
      mockGetActiveBot.mockReturnValue(null)

      const tool = getTool('get_active_bot')
      const result = await tool!.handler({})

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.activeBot).toBeNull()
    })
  })

  describe('set_active_bot tool', () => {
    it('should set active bot successfully', async () => {
      mockBotExists.mockReturnValue(true)
      mockSetActiveBot.mockResolvedValue(undefined)

      const tool = getTool('set_active_bot')
      const result = await tool!.handler({ botUsername: 'my_bot' })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.activeBot).toBe('my_bot')
      expect(mockSetActiveBot).toHaveBeenCalledWith('my_bot')
    })

    it('should return error if bot does not exist', async () => {
      mockBotExists.mockReturnValue(false)

      const tool = getTool('set_active_bot')
      const result = await tool!.handler({ botUsername: 'nonexistent' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('not found')
    })
  })

  describe('read_bot_config tool', () => {
    it('should read bot config successfully', async () => {
      mockBotExists.mockReturnValue(true)
      mockReadEnv.mockResolvedValue({
        botToken: 'token123',
        mode: 'polling',
        logLevel: 'info',
      })

      const tool = getTool('read_bot_config')
      const result = await tool!.handler({
        botUsername: 'my_bot',
        environment: 'local',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.config.botToken).toBe('token123')
      expect(parsed.environment).toBe('local')
    })

    it('should return error if bot does not exist', async () => {
      mockBotExists.mockReturnValue(false)

      const tool = getTool('read_bot_config')
      const result = await tool!.handler({
        botUsername: 'nonexistent',
        environment: 'local',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('not found')
    })
  })

  describe('update_bot_config tool', () => {
    it('should update config successfully', async () => {
      mockBotExists.mockReturnValue(true)
      mockUpdateEnv.mockResolvedValue(undefined)

      const tool = getTool('update_bot_config')
      const result = await tool!.handler({
        botUsername: 'my_bot',
        environment: 'local',
        updates: { mode: 'webhook', webhookUrl: 'https://example.com' },
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.updated).toContain('mode')
      expect(parsed.updated).toContain('webhookUrl')
    })

    it('should return error if bot does not exist', async () => {
      mockBotExists.mockReturnValue(false)

      const tool = getTool('update_bot_config')
      const result = await tool!.handler({
        botUsername: 'nonexistent',
        environment: 'local',
        updates: { mode: 'polling' },
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('not found')
    })
  })

  describe('delete_bot_config tool', () => {
    it('should delete bot config successfully', async () => {
      mockBotExists.mockReturnValue(true)
      mockDeleteBot.mockResolvedValue(undefined)

      const tool = getTool('delete_bot_config')
      const result = await tool!.handler({ botUsername: 'old_bot' })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.deleted).toBe('old_bot')
    })

    it('should return error if bot does not exist', async () => {
      mockBotExists.mockReturnValue(false)

      const tool = getTool('delete_bot_config')
      const result = await tool!.handler({ botUsername: 'nonexistent' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('not found')
    })
  })

  describe('get_bot_metadata tool', () => {
    it('should get bot metadata successfully', async () => {
      mockBotExists.mockReturnValue(true)
      mockGetMetadata.mockReturnValue({
        createdAt: '2024-01-01T00:00:00Z',
        lastModified: '2024-01-02T00:00:00Z',
        source: 'botfather',
      })

      const tool = getTool('get_bot_metadata')
      const result = await tool!.handler({ botUsername: 'my_bot' })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.metadata.source).toBe('botfather')
    })

    it('should return error if bot does not exist', async () => {
      mockBotExists.mockReturnValue(false)

      const tool = getTool('get_bot_metadata')
      const result = await tool!.handler({ botUsername: 'nonexistent' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('not found')
    })

    it('should handle null metadata', async () => {
      mockBotExists.mockReturnValue(true)
      mockGetMetadata.mockReturnValue(null)

      const tool = getTool('get_bot_metadata')
      const result = await tool!.handler({ botUsername: 'my_bot' })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.metadata).toBeNull()
    })
  })
})
