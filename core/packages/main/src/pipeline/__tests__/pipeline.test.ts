import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { isOk, isErr, ok, err } from '@mks2508/no-throw'
import { AppErrorCode } from '../../types/errors.js'

const mockConfigGet = vi.fn()
const mockGitHubInit = vi.fn()
const mockGitHubCreateRepo = vi.fn()
const mockGitHubPushToRepo = vi.fn()
const mockCoolifyInit = vi.fn()
const mockCoolifyCreateApplication = vi.fn()
const mockCoolifySetEnvVars = vi.fn()
const mockCoolifyDeploy = vi.fn()
const mockBotFatherInit = vi.fn()
const mockBotFatherCreateBot = vi.fn()
const mockBotFatherDisconnect = vi.fn()
const mockBunSpawn = vi.fn()
const mockExistsSync = vi.fn()

vi.mock('node:fs', () => ({
  existsSync: (path: string) => mockExistsSync(path),
}))

vi.mock('../../services/config.service.js', () => ({
  getConfigService: () => ({
    get: mockConfigGet,
  }),
}))

vi.mock('../../services/github.service.js', () => ({
  getGitHubService: () => ({
    init: mockGitHubInit,
    createRepo: mockGitHubCreateRepo,
    pushToRepo: mockGitHubPushToRepo,
  }),
}))

vi.mock('../../services/coolify.service.js', () => ({
  getCoolifyService: () => ({
    init: mockCoolifyInit,
    createApplication: mockCoolifyCreateApplication,
    setEnvironmentVariables: mockCoolifySetEnvVars,
    deploy: mockCoolifyDeploy,
  }),
}))

vi.mock('../../services/botfather.service.js', () => ({
  getBotFatherService: () => ({
    init: mockBotFatherInit,
    createBot: mockBotFatherCreateBot,
    disconnect: mockBotFatherDisconnect,
  }),
}))

describe('Pipeline', () => {
  let Pipeline: typeof import('../pipeline.js').Pipeline
  let getPipeline: typeof import('../pipeline.js').getPipeline

  beforeEach(async () => {
    vi.clearAllMocks()

    mockConfigGet.mockReturnValue({
      github: {
        defaultOrg: 'test-org',
        defaultVisibility: 'public',
      },
      coolify: {
        url: 'https://coolify.test.com',
        defaultServer: 'server-uuid',
        defaultDestination: 'dest-uuid',
      },
    })

    mockExistsSync.mockReturnValue(false)

    const originalBun = globalThis.Bun
    vi.stubGlobal('Bun', {
      ...originalBun,
      spawn: mockBunSpawn,
    })

    vi.resetModules()
    const module = await import('../pipeline.js')
    Pipeline = module.Pipeline
    getPipeline = module.getPipeline
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  describe('run() - Full pipeline success', () => {
    beforeEach(() => {
      mockBotFatherInit.mockResolvedValue(ok(undefined))
      mockBotFatherCreateBot.mockResolvedValue(
        ok({
          botToken: 'bot_token_123',
          botUsername: 'test_bot',
        })
      )
      mockBotFatherDisconnect.mockResolvedValue(ok(undefined))

      mockBunSpawn.mockReturnValue({
        exited: Promise.resolve(0),
        stdout: new ReadableStream(),
        stderr: new ReadableStream(),
      })

      mockGitHubInit.mockResolvedValue(ok(undefined))
      mockGitHubCreateRepo.mockResolvedValue(
        ok({
          repoUrl: 'https://github.com/test-org/test-bot',
          cloneUrl: 'https://github.com/test-org/test-bot.git',
        })
      )
      mockGitHubPushToRepo.mockResolvedValue(ok(undefined))

      mockCoolifyInit.mockResolvedValue(ok(undefined))
      mockCoolifyCreateApplication.mockResolvedValue(
        ok({
          uuid: 'app-uuid-123',
        })
      )
      mockCoolifySetEnvVars.mockResolvedValue(ok(undefined))
      mockCoolifyDeploy.mockResolvedValue(
        ok({
          deploymentUuid: 'deploy-uuid-456',
        })
      )
    })

    it('should run full pipeline successfully', async () => {
      const pipeline = new Pipeline()
      const result = await pipeline.run({
        botName: 'test-bot',
        createGitHubRepo: true,
        deployToCoolify: true,
      })

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.success).toBe(true)
        expect(result.value.errors).toHaveLength(0)
        expect(result.value.botToken).toBe('bot_token_123')
        expect(result.value.botUsername).toBe('test_bot')
        expect(result.value.githubRepoUrl).toBe('https://github.com/test-org/test-bot')
        expect(result.value.coolifyAppUuid).toBe('app-uuid-123')
      }
    })

    it('should skip BotFather step when skipBotFather is true', async () => {
      const pipeline = new Pipeline()
      const result = await pipeline.run({
        botName: 'test-bot',
        skipBotFather: true,
        createGitHubRepo: true,
        deployToCoolify: true,
      })

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.botToken).toBeUndefined()
        expect(result.value.botUsername).toBeUndefined()
      }

      expect(mockBotFatherInit).not.toHaveBeenCalled()
      expect(mockBotFatherCreateBot).not.toHaveBeenCalled()
    })

    it('should skip GitHub step when createGitHubRepo is false', async () => {
      const pipeline = new Pipeline()
      const result = await pipeline.run({
        botName: 'test-bot',
        createGitHubRepo: false,
      })

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.githubRepoUrl).toBeUndefined()
      }

      expect(mockGitHubInit).not.toHaveBeenCalled()
    })

    it('should skip Coolify step when deployToCoolify is false', async () => {
      const pipeline = new Pipeline()
      const result = await pipeline.run({
        botName: 'test-bot',
        createGitHubRepo: true,
        deployToCoolify: false,
      })

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.coolifyAppUuid).toBeUndefined()
      }

      expect(mockCoolifyInit).not.toHaveBeenCalled()
    })

    it('should use custom githubOrg when provided', async () => {
      const pipeline = new Pipeline()
      await pipeline.run({
        botName: 'test-bot',
        createGitHubRepo: true,
        githubOrg: 'custom-org',
      })

      expect(mockGitHubCreateRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'custom-org',
        })
      )
    })

    it('should use custom coolify server and destination when provided', async () => {
      const pipeline = new Pipeline()
      await pipeline.run({
        botName: 'test-bot',
        createGitHubRepo: true,
        deployToCoolify: true,
        coolifyServer: 'custom-server',
        coolifyDestination: 'custom-dest',
      })

      expect(mockCoolifyCreateApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          serverUuid: 'custom-server',
          destinationUuid: 'custom-dest',
        })
      )
    })

    it('should include bot description in steps', async () => {
      const pipeline = new Pipeline()
      await pipeline.run({
        botName: 'test-bot',
        botDescription: 'My test bot description',
        createGitHubRepo: true,
      })

      expect(mockBotFatherCreateBot).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'My test bot description',
        })
      )

      expect(mockGitHubCreateRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'My test bot description',
        })
      )
    })
  })

  describe('run() - Error handling', () => {
    it('should return error when BotFather init fails', async () => {
      mockBotFatherInit.mockResolvedValue(
        err({
          code: AppErrorCode.BOTFATHER_ERROR,
          message: 'Telegram credentials not configured',
        })
      )

      const pipeline = new Pipeline()
      const result = await pipeline.run({
        botName: 'test-bot',
      })

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.success).toBe(false)
        expect(result.value.errors).toContain('Telegram credentials not configured')
      }
    })

    it('should return error when bot creation fails', async () => {
      mockBotFatherInit.mockResolvedValue(ok(undefined))
      mockBotFatherCreateBot.mockResolvedValue(
        err({
          code: AppErrorCode.BOTFATHER_ERROR,
          message: 'Username already taken',
        })
      )
      mockBotFatherDisconnect.mockResolvedValue(ok(undefined))

      const pipeline = new Pipeline()
      const result = await pipeline.run({
        botName: 'test-bot',
      })

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.success).toBe(false)
        expect(result.value.errors).toContain('Username already taken')
      }
    })

    it('should return error when project directory already exists', async () => {
      mockBotFatherInit.mockResolvedValue(ok(undefined))
      mockBotFatherCreateBot.mockResolvedValue(
        ok({ botToken: 'token', botUsername: 'test_bot' })
      )
      mockBotFatherDisconnect.mockResolvedValue(ok(undefined))
      mockExistsSync.mockReturnValue(true)

      const pipeline = new Pipeline()
      const result = await pipeline.run({
        botName: 'existing-dir',
      })

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.success).toBe(false)
        expect(result.value.errors[0]).toContain('already exists')
      }
    })

    it('should return error when scaffold fails', async () => {
      mockBotFatherInit.mockResolvedValue(ok(undefined))
      mockBotFatherCreateBot.mockResolvedValue(
        ok({ botToken: 'token', botUsername: 'test_bot' })
      )
      mockBotFatherDisconnect.mockResolvedValue(ok(undefined))

      mockBunSpawn.mockReturnValue({
        exited: Promise.resolve(1),
        stdout: new ReadableStream(),
        stderr: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('bunspace error'))
            controller.close()
          },
        }),
      })

      const pipeline = new Pipeline()
      const result = await pipeline.run({
        botName: 'test-bot',
      })

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.success).toBe(false)
        expect(result.value.errors[0]).toContain('bunspace error')
      }
    })

    it('should return error when GitHub init fails', async () => {
      mockBotFatherInit.mockResolvedValue(ok(undefined))
      mockBotFatherCreateBot.mockResolvedValue(
        ok({ botToken: 'token', botUsername: 'test_bot' })
      )
      mockBotFatherDisconnect.mockResolvedValue(ok(undefined))

      mockBunSpawn.mockReturnValue({
        exited: Promise.resolve(0),
        stdout: new ReadableStream(),
        stderr: new ReadableStream(),
      })

      mockGitHubInit.mockResolvedValue(
        err({
          code: AppErrorCode.GITHUB_ERROR,
          message: 'No GitHub token',
        })
      )

      const pipeline = new Pipeline()
      const result = await pipeline.run({
        botName: 'test-bot',
        createGitHubRepo: true,
      })

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.success).toBe(false)
        expect(result.value.errors).toContain('No GitHub token')
      }
    })

    it('should return error when repo creation fails', async () => {
      mockBotFatherInit.mockResolvedValue(ok(undefined))
      mockBotFatherCreateBot.mockResolvedValue(
        ok({ botToken: 'token', botUsername: 'test_bot' })
      )
      mockBotFatherDisconnect.mockResolvedValue(ok(undefined))

      mockBunSpawn.mockReturnValue({
        exited: Promise.resolve(0),
        stdout: new ReadableStream(),
        stderr: new ReadableStream(),
      })

      mockGitHubInit.mockResolvedValue(ok(undefined))
      mockGitHubCreateRepo.mockResolvedValue(
        err({
          code: AppErrorCode.GITHUB_ERROR,
          message: 'Repository creation failed',
        })
      )

      const pipeline = new Pipeline()
      const result = await pipeline.run({
        botName: 'test-bot',
        createGitHubRepo: true,
      })

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.success).toBe(false)
        expect(result.value.errors).toContain('Repository creation failed')
      }
    })

    it('should return error when no clone URL is returned', async () => {
      mockBotFatherInit.mockResolvedValue(ok(undefined))
      mockBotFatherCreateBot.mockResolvedValue(
        ok({ botToken: 'token', botUsername: 'test_bot' })
      )
      mockBotFatherDisconnect.mockResolvedValue(ok(undefined))

      mockBunSpawn.mockReturnValue({
        exited: Promise.resolve(0),
        stdout: new ReadableStream(),
        stderr: new ReadableStream(),
      })

      mockGitHubInit.mockResolvedValue(ok(undefined))
      mockGitHubCreateRepo.mockResolvedValue(
        ok({
          repoUrl: 'https://github.com/test/repo',
          cloneUrl: undefined,
        })
      )

      const pipeline = new Pipeline()
      const result = await pipeline.run({
        botName: 'test-bot',
        createGitHubRepo: true,
      })

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.success).toBe(false)
        expect(result.value.errors[0]).toContain('No clone URL')
      }
    })

    it('should return error when push fails', async () => {
      mockBotFatherInit.mockResolvedValue(ok(undefined))
      mockBotFatherCreateBot.mockResolvedValue(
        ok({ botToken: 'token', botUsername: 'test_bot' })
      )
      mockBotFatherDisconnect.mockResolvedValue(ok(undefined))

      mockBunSpawn.mockReturnValue({
        exited: Promise.resolve(0),
        stdout: new ReadableStream(),
        stderr: new ReadableStream(),
      })

      mockGitHubInit.mockResolvedValue(ok(undefined))
      mockGitHubCreateRepo.mockResolvedValue(
        ok({
          repoUrl: 'https://github.com/test/repo',
          cloneUrl: 'https://github.com/test/repo.git',
        })
      )
      mockGitHubPushToRepo.mockResolvedValue(
        err({
          code: AppErrorCode.GITHUB_ERROR,
          message: 'Push failed',
        })
      )

      const pipeline = new Pipeline()
      const result = await pipeline.run({
        botName: 'test-bot',
        createGitHubRepo: true,
      })

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.success).toBe(false)
        expect(result.value.errors).toContain('Push failed')
      }
    })

    it('should return error when Coolify server/destination not configured', async () => {
      mockConfigGet.mockReturnValue({
        github: { defaultOrg: 'test-org' },
        coolify: {},
      })

      mockBotFatherInit.mockResolvedValue(ok(undefined))
      mockBotFatherCreateBot.mockResolvedValue(
        ok({ botToken: 'token', botUsername: 'test_bot' })
      )
      mockBotFatherDisconnect.mockResolvedValue(ok(undefined))

      mockBunSpawn.mockReturnValue({
        exited: Promise.resolve(0),
        stdout: new ReadableStream(),
        stderr: new ReadableStream(),
      })

      mockGitHubInit.mockResolvedValue(ok(undefined))
      mockGitHubCreateRepo.mockResolvedValue(
        ok({
          repoUrl: 'https://github.com/test/repo',
          cloneUrl: 'https://github.com/test/repo.git',
        })
      )
      mockGitHubPushToRepo.mockResolvedValue(ok(undefined))

      mockCoolifyInit.mockResolvedValue(ok(undefined))

      const pipeline = new Pipeline()
      const result = await pipeline.run({
        botName: 'test-bot',
        createGitHubRepo: true,
        deployToCoolify: true,
      })

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.success).toBe(false)
        expect(result.value.errors[0]).toContain('server and destination not configured')
      }
    })

    it('should return error when Coolify init fails', async () => {
      mockBotFatherInit.mockResolvedValue(ok(undefined))
      mockBotFatherCreateBot.mockResolvedValue(
        ok({ botToken: 'token', botUsername: 'test_bot' })
      )
      mockBotFatherDisconnect.mockResolvedValue(ok(undefined))

      mockBunSpawn.mockReturnValue({
        exited: Promise.resolve(0),
        stdout: new ReadableStream(),
        stderr: new ReadableStream(),
      })

      mockGitHubInit.mockResolvedValue(ok(undefined))
      mockGitHubCreateRepo.mockResolvedValue(
        ok({
          repoUrl: 'https://github.com/test/repo',
          cloneUrl: 'https://github.com/test/repo.git',
        })
      )
      mockGitHubPushToRepo.mockResolvedValue(ok(undefined))

      mockCoolifyInit.mockResolvedValue(
        err({
          code: AppErrorCode.COOLIFY_ERROR,
          message: 'No Coolify token',
        })
      )

      const pipeline = new Pipeline()
      const result = await pipeline.run({
        botName: 'test-bot',
        createGitHubRepo: true,
        deployToCoolify: true,
      })

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.success).toBe(false)
        expect(result.value.errors).toContain('No Coolify token')
      }
    })

    it('should return error when application creation fails', async () => {
      mockBotFatherInit.mockResolvedValue(ok(undefined))
      mockBotFatherCreateBot.mockResolvedValue(
        ok({ botToken: 'token', botUsername: 'test_bot' })
      )
      mockBotFatherDisconnect.mockResolvedValue(ok(undefined))

      mockBunSpawn.mockReturnValue({
        exited: Promise.resolve(0),
        stdout: new ReadableStream(),
        stderr: new ReadableStream(),
      })

      mockGitHubInit.mockResolvedValue(ok(undefined))
      mockGitHubCreateRepo.mockResolvedValue(
        ok({
          repoUrl: 'https://github.com/test/repo',
          cloneUrl: 'https://github.com/test/repo.git',
        })
      )
      mockGitHubPushToRepo.mockResolvedValue(ok(undefined))

      mockCoolifyInit.mockResolvedValue(ok(undefined))
      mockCoolifyCreateApplication.mockResolvedValue(
        err({
          code: AppErrorCode.COOLIFY_ERROR,
          message: 'Invalid server UUID',
        })
      )

      const pipeline = new Pipeline()
      const result = await pipeline.run({
        botName: 'test-bot',
        createGitHubRepo: true,
        deployToCoolify: true,
      })

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.success).toBe(false)
        expect(result.value.errors).toContain('Invalid server UUID')
      }
    })

    it('should return error when no application UUID returned', async () => {
      mockBotFatherInit.mockResolvedValue(ok(undefined))
      mockBotFatherCreateBot.mockResolvedValue(
        ok({ botToken: 'token', botUsername: 'test_bot' })
      )
      mockBotFatherDisconnect.mockResolvedValue(ok(undefined))

      mockBunSpawn.mockReturnValue({
        exited: Promise.resolve(0),
        stdout: new ReadableStream(),
        stderr: new ReadableStream(),
      })

      mockGitHubInit.mockResolvedValue(ok(undefined))
      mockGitHubCreateRepo.mockResolvedValue(
        ok({
          repoUrl: 'https://github.com/test/repo',
          cloneUrl: 'https://github.com/test/repo.git',
        })
      )
      mockGitHubPushToRepo.mockResolvedValue(ok(undefined))

      mockCoolifyInit.mockResolvedValue(ok(undefined))
      mockCoolifyCreateApplication.mockResolvedValue(ok({ uuid: undefined }))

      const pipeline = new Pipeline()
      const result = await pipeline.run({
        botName: 'test-bot',
        createGitHubRepo: true,
        deployToCoolify: true,
      })

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.success).toBe(false)
        expect(result.value.errors[0]).toContain('No application UUID')
      }
    })

    it('should continue when env vars setting fails (non-fatal)', async () => {
      mockBotFatherInit.mockResolvedValue(ok(undefined))
      mockBotFatherCreateBot.mockResolvedValue(
        ok({ botToken: 'token', botUsername: 'test_bot' })
      )
      mockBotFatherDisconnect.mockResolvedValue(ok(undefined))

      mockBunSpawn.mockReturnValue({
        exited: Promise.resolve(0),
        stdout: new ReadableStream(),
        stderr: new ReadableStream(),
      })

      mockGitHubInit.mockResolvedValue(ok(undefined))
      mockGitHubCreateRepo.mockResolvedValue(
        ok({
          repoUrl: 'https://github.com/test/repo',
          cloneUrl: 'https://github.com/test/repo.git',
        })
      )
      mockGitHubPushToRepo.mockResolvedValue(ok(undefined))

      mockCoolifyInit.mockResolvedValue(ok(undefined))
      mockCoolifyCreateApplication.mockResolvedValue(ok({ uuid: 'app-uuid' }))
      mockCoolifySetEnvVars.mockResolvedValue(
        err({ code: AppErrorCode.COOLIFY_ERROR, message: 'Failed to set env vars' })
      )
      mockCoolifyDeploy.mockResolvedValue(ok({ deploymentUuid: 'deploy-uuid' }))

      const pipeline = new Pipeline()
      const result = await pipeline.run({
        botName: 'test-bot',
        createGitHubRepo: true,
        deployToCoolify: true,
      })

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.success).toBe(true)
        expect(result.value.coolifyAppUuid).toBe('app-uuid')
      }
    })

    it('should return error when deploy fails', async () => {
      mockBotFatherInit.mockResolvedValue(ok(undefined))
      mockBotFatherCreateBot.mockResolvedValue(
        ok({ botToken: 'token', botUsername: 'test_bot' })
      )
      mockBotFatherDisconnect.mockResolvedValue(ok(undefined))

      mockBunSpawn.mockReturnValue({
        exited: Promise.resolve(0),
        stdout: new ReadableStream(),
        stderr: new ReadableStream(),
      })

      mockGitHubInit.mockResolvedValue(ok(undefined))
      mockGitHubCreateRepo.mockResolvedValue(
        ok({
          repoUrl: 'https://github.com/test/repo',
          cloneUrl: 'https://github.com/test/repo.git',
        })
      )
      mockGitHubPushToRepo.mockResolvedValue(ok(undefined))

      mockCoolifyInit.mockResolvedValue(ok(undefined))
      mockCoolifyCreateApplication.mockResolvedValue(ok({ uuid: 'app-uuid' }))
      mockCoolifySetEnvVars.mockResolvedValue(ok(undefined))
      mockCoolifyDeploy.mockResolvedValue(
        err({ code: AppErrorCode.COOLIFY_ERROR, message: 'Deploy failed' })
      )

      const pipeline = new Pipeline()
      const result = await pipeline.run({
        botName: 'test-bot',
        createGitHubRepo: true,
        deployToCoolify: true,
      })

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.success).toBe(false)
        expect(result.value.errors).toContain('Deploy failed')
      }
    })

    it('should warn but continue when disconnect fails', async () => {
      mockBotFatherInit.mockResolvedValue(ok(undefined))
      mockBotFatherCreateBot.mockResolvedValue(
        ok({ botToken: 'token', botUsername: 'test_bot' })
      )
      mockBotFatherDisconnect.mockResolvedValue(
        err({ code: AppErrorCode.BOTFATHER_ERROR, message: 'Disconnect failed' })
      )

      mockBunSpawn.mockReturnValue({
        exited: Promise.resolve(0),
        stdout: new ReadableStream(),
        stderr: new ReadableStream(),
      })

      const pipeline = new Pipeline()
      const result = await pipeline.run({
        botName: 'test-bot',
      })

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.success).toBe(true)
        expect(result.value.botToken).toBe('token')
      }
    })
  })

  describe('run() - Scaffold only', () => {
    it('should run scaffold only when all optional steps disabled', async () => {
      mockBunSpawn.mockReturnValue({
        exited: Promise.resolve(0),
        stdout: new ReadableStream(),
        stderr: new ReadableStream(),
      })

      const pipeline = new Pipeline()
      const result = await pipeline.run({
        botName: 'scaffold-only-bot',
        skipBotFather: true,
        createGitHubRepo: false,
        deployToCoolify: false,
      })

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.success).toBe(true)
        expect(result.value.errors).toHaveLength(0)
        expect(result.value.botToken).toBeUndefined()
        expect(result.value.githubRepoUrl).toBeUndefined()
        expect(result.value.coolifyAppUuid).toBeUndefined()
      }

      expect(mockBotFatherInit).not.toHaveBeenCalled()
      expect(mockGitHubInit).not.toHaveBeenCalled()
      expect(mockCoolifyInit).not.toHaveBeenCalled()
    })
  })

  describe('getPipeline() singleton', () => {
    it('should return the same instance', async () => {
      const instance1 = getPipeline()
      const instance2 = getPipeline()

      expect(instance1).toBe(instance2)
    })
  })
})
