import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { isOk, isErr, ok, err } from '@mks2508/no-throw'

let mockToken: string | undefined = 'ghp_test_token'
let mockTokenError: boolean = false

vi.mock('../config.service.js', () => ({
  getConfigService: () => ({
    get: () => ({ github: { token: mockToken } }),
    getGitHubToken: () => mockToken,
    resolveGitHubToken: async () => {
      if (mockTokenError) {
        return err({ code: 'CONFIG_ERROR', message: 'Token resolution failed' })
      }
      return ok(mockToken)
    },
  }),
}))

describe('GitHubService', () => {
  let mockFetch: Mock
  let mockBunSpawn: Mock
  let GitHubService: typeof import('../github.service.js').GitHubService
  let getGitHubService: typeof import('../github.service.js').getGitHubService

  beforeEach(async () => {
    mockToken = 'ghp_test_token'
    mockTokenError = false
    mockFetch = vi.fn()
    mockBunSpawn = vi.fn()

    vi.stubGlobal('fetch', mockFetch)

    const originalBun = globalThis.Bun
    vi.stubGlobal('Bun', {
      ...originalBun,
      spawn: mockBunSpawn,
    })

    vi.resetModules()
    const module = await import('../github.service.js')
    GitHubService = module.GitHubService
    getGitHubService = module.getGitHubService
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  describe('init()', () => {
    it('should initialize with valid token', async () => {
      const service = new GitHubService()
      const result = await service.init()
      expect(isOk(result)).toBe(true)
    })

    it('should error if no token available', async () => {
      mockToken = undefined

      vi.resetModules()
      const freshModule = await import('../github.service.js')
      const service = new freshModule.GitHubService()
      const result = await service.init()

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('No GitHub token')
      }
    })

    it('should error if token resolution fails', async () => {
      mockTokenError = true

      vi.resetModules()
      const freshModule = await import('../github.service.js')
      const service = new freshModule.GitHubService()
      const result = await service.init()

      expect(isErr(result)).toBe(true)
    })
  })

  describe('getAuthenticatedUser()', () => {
    it('should return username on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ login: 'testuser' }),
      })

      const service = new GitHubService()
      await service.init()
      const result = await service.getAuthenticatedUser()

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toBe('testuser')
      }
    })

    it('should return error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Bad credentials' }),
      })

      const service = new GitHubService()
      await service.init()
      const result = await service.getAuthenticatedUser()

      expect(isErr(result)).toBe(true)
    })
  })

  describe('isOrganization()', () => {
    it('should return true for organization', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ type: 'Organization' }),
      })

      const service = new GitHubService()
      await service.init()
      const result = await service.isOrganization('test-org')

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toBe(true)
      }
    })

    it('should return false for user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ type: 'User' }),
      })

      const service = new GitHubService()
      await service.init()
      const result = await service.isOrganization('testuser')

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toBe(false)
      }
    })
  })

  describe('repoExists()', () => {
    it('should return true if repo exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ name: 'test-repo' }),
      })

      const service = new GitHubService()
      await service.init()
      const result = await service.repoExists('owner', 'test-repo')

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toBe(true)
      }
    })

    it('should return false if repo does not exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not Found' }),
      })

      const service = new GitHubService()
      await service.init()
      const result = await service.repoExists('owner', 'nonexistent')

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toBe(false)
      }
    })
  })

  describe('createRepo()', () => {
    it('should create repo for user', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ login: 'testuser' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ type: 'User' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            html_url: 'https://github.com/testuser/new-repo',
            clone_url: 'https://github.com/testuser/new-repo.git',
            full_name: 'testuser/new-repo',
          }),
        })

      const service = new GitHubService()
      await service.init()
      const result = await service.createRepo({
        name: 'new-repo',
        description: 'Test repo',
        private: false,
      })

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.repoUrl).toBe('https://github.com/testuser/new-repo')
        expect(result.value.cloneUrl).toBe('https://github.com/testuser/new-repo.git')
      }
    })

    it('should create repo for organization', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ login: 'testuser' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ type: 'Organization' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            html_url: 'https://github.com/test-org/new-repo',
            clone_url: 'https://github.com/test-org/new-repo.git',
            full_name: 'test-org/new-repo',
          }),
        })

      const service = new GitHubService()
      await service.init()
      const result = await service.createRepo({
        name: 'new-repo',
        owner: 'test-org',
      })

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.repoUrl).toBe('https://github.com/test-org/new-repo')
      }
    })

    it('should handle API error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ login: 'testuser' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ type: 'User' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 422,
          json: async () => ({ message: 'Repository creation failed' }),
        })

      const service = new GitHubService()
      await service.init()
      const result = await service.createRepo({ name: 'new-repo' })

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('Repository creation failed')
      }
    })
  })

  describe('createRepoFromTemplate()', () => {
    it('should create repo from template', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ login: 'testuser' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            html_url: 'https://github.com/testuser/from-template',
            clone_url: 'https://github.com/testuser/from-template.git',
            full_name: 'testuser/from-template',
          }),
        })

      const service = new GitHubService()
      await service.init()
      const result = await service.createRepoFromTemplate({
        name: 'from-template',
        templateOwner: 'MKS2508',
        templateRepo: 'mks-telegram-bot',
      })

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.repoUrl).toBe('https://github.com/testuser/from-template')
      }

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/repos/MKS2508/mks-telegram-bot/generate'),
        expect.any(Object)
      )
    })
  })

  describe('pushToRepo()', () => {
    it('should push code to repo successfully', async () => {
      const mockProcess = {
        exited: Promise.resolve(0),
        stdout: new ReadableStream(),
        stderr: new ReadableStream(),
      }

      mockBunSpawn.mockReturnValue(mockProcess)

      const service = new GitHubService()
      await service.init()
      const result = await service.pushToRepo(
        'https://github.com/test/repo.git',
        '/path/to/project'
      )

      expect(isOk(result)).toBe(true)
      expect(mockBunSpawn).toHaveBeenCalledWith(['git', 'init'], expect.any(Object))
      expect(mockBunSpawn).toHaveBeenCalledWith(['git', 'add', '.'], expect.any(Object))
      expect(mockBunSpawn).toHaveBeenCalledWith(
        ['git', 'commit', '-m', 'Initial commit from mks-bot-father'],
        expect.any(Object)
      )
    })

    it('should handle push failure', async () => {
      const createMockProcess = (exitCode: number, stderrText = '') => ({
        exited: Promise.resolve(exitCode),
        stdout: new ReadableStream(),
        stderr: new ReadableStream({
          start(controller) {
            if (stderrText) {
              controller.enqueue(new TextEncoder().encode(stderrText))
            }
            controller.close()
          },
        }),
      })

      mockBunSpawn
        .mockReturnValueOnce(createMockProcess(0))
        .mockReturnValueOnce(createMockProcess(0))
        .mockReturnValueOnce(createMockProcess(0))
        .mockReturnValueOnce(createMockProcess(0))
        .mockReturnValueOnce(createMockProcess(0))
        .mockReturnValueOnce(createMockProcess(1, 'Push failed'))

      const service = new GitHubService()
      await service.init()
      const result = await service.pushToRepo(
        'https://github.com/test/repo.git',
        '/path/to/project'
      )

      expect(isErr(result)).toBe(true)
    })
  })

  describe('getGitHubService() singleton', () => {
    it('should return the same instance', async () => {
      const instance1 = getGitHubService()
      const instance2 = getGitHubService()

      expect(instance1).toBe(instance2)
    })
  })
})
