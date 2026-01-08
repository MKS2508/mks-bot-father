import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { isOk, isErr } from '@mks2508/no-throw'

let mockCoolifyUrl: string | undefined = 'https://coolify.test.com'
let mockCoolifyToken: string | undefined = 'test_coolify_token'

vi.mock('../config.service.js', () => ({
  getConfigService: () => ({
    get: () => ({
      coolify: {
        url: mockCoolifyUrl,
        token: mockCoolifyToken,
        defaultServer: 'server-uuid',
        defaultDestination: 'dest-uuid',
      },
    }),
    getCoolifyUrl: () => mockCoolifyUrl,
    getCoolifyToken: () => mockCoolifyToken,
  }),
}))

describe('CoolifyService', () => {
  let mockFetch: Mock
  let CoolifyService: typeof import('../coolify.service.js').CoolifyService
  let getCoolifyService: typeof import('../coolify.service.js').getCoolifyService

  beforeEach(async () => {
    mockCoolifyUrl = 'https://coolify.test.com'
    mockCoolifyToken = 'test_coolify_token'
    mockFetch = vi.fn()

    vi.stubGlobal('fetch', mockFetch)

    vi.resetModules()
    const module = await import('../coolify.service.js')
    CoolifyService = module.CoolifyService
    getCoolifyService = module.getCoolifyService
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  describe('init()', () => {
    it('should initialize with URL and token', async () => {
      const service = new CoolifyService()
      const result = await service.init()

      expect(isOk(result)).toBe(true)
    })

    it('should error if URL is missing', async () => {
      mockCoolifyUrl = undefined

      vi.resetModules()
      const freshModule = await import('../coolify.service.js')
      const service = new freshModule.CoolifyService()
      const result = await service.init()

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('No Coolify URL')
      }
    })

    it('should error if token is missing', async () => {
      mockCoolifyToken = undefined

      vi.resetModules()
      const freshModule = await import('../coolify.service.js')
      const service = new freshModule.CoolifyService()
      const result = await service.init()

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('No Coolify token')
      }
    })
  })

  describe('deploy()', () => {
    it('should trigger deployment successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            resource_uuid: 'resource-123',
            deployment_uuid: 'deploy-456',
          }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.deploy({ uuid: 'app-uuid' })

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.deploymentUuid).toBe('deploy-456')
        expect(result.value.resourceUuid).toBe('resource-123')
      }

      expect(mockFetch).toHaveBeenCalledWith(
        'https://coolify.test.com/api/v1/deploy',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test_coolify_token',
          }),
        })
      )
    })

    it('should support force rebuild', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            resource_uuid: 'resource-123',
            deployment_uuid: 'deploy-456',
          }),
      })

      const service = new CoolifyService()
      await service.init()
      await service.deploy({ uuid: 'app-uuid', force: true })

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1].body)
      expect(body.force).toBe(true)
    })

    it('should error if uuid or tag missing', async () => {
      const service = new CoolifyService()
      await service.init()
      const result = await service.deploy({})

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('Either uuid or tag is required')
      }
    })

    it('should handle API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ message: 'Application not found' }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.deploy({ uuid: 'nonexistent' })

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('Application not found')
      }
    })
  })

  describe('createApplication()', () => {
    it('should create application successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ uuid: 'new-app-uuid' }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.createApplication({
        name: 'test-app',
        serverUuid: 'server-uuid',
        destinationUuid: 'dest-uuid',
        githubRepoUrl: 'https://github.com/test/repo',
      })

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.uuid).toBe('new-app-uuid')
      }
    })

    it('should handle creation error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: async () => JSON.stringify({ message: 'Invalid configuration' }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.createApplication({
        name: 'test-app',
        serverUuid: 'server-uuid',
        destinationUuid: 'dest-uuid',
        githubRepoUrl: 'https://github.com/test/repo',
      })

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('Invalid configuration')
      }
    })
  })

  describe('setEnvironmentVariables()', () => {
    it('should set environment variables successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ success: true }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.setEnvironmentVariables('app-uuid', {
        TG_BOT_TOKEN: 'token123',
        TG_MODE: 'webhook',
      })

      expect(isOk(result)).toBe(true)

      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[0]).toContain('/applications/app-uuid/envs')
      const body = JSON.parse(callArgs[1].body)
      expect(body.data).toHaveLength(2)
      expect(body.data[0].key).toBe('TG_BOT_TOKEN')
      expect(body.data[0].value).toBe('token123')
    })

    it('should handle error when setting variables', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ message: 'Server error' }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.setEnvironmentVariables('app-uuid', {
        KEY: 'value',
      })

      expect(isErr(result)).toBe(true)
    })
  })

  describe('getApplicationStatus()', () => {
    it('should return application status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ status: 'running' }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.getApplicationStatus('app-uuid')

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toBe('running')
      }
    })

    it('should handle not found error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ message: 'Not found' }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.getApplicationStatus('nonexistent')

      expect(isErr(result)).toBe(true)
    })
  })

  describe('listServers()', () => {
    it('should return list of servers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify([
            { uuid: 'server-1', name: 'Server 1' },
            { uuid: 'server-2', name: 'Server 2' },
          ]),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.listServers()

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toHaveLength(2)
        expect(result.value[0].uuid).toBe('server-1')
      }
    })

    it('should return empty array if no servers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify([]),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.listServers()

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toHaveLength(0)
      }
    })
  })

  describe('getServerDestinations()', () => {
    it('should return destinations for a server', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            destinations: [
              { uuid: 'dest-1', name: 'Destination 1' },
              { uuid: 'dest-2', name: 'Destination 2' },
            ],
          }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.getServerDestinations('server-uuid')

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toHaveLength(2)
        expect(result.value[0].uuid).toBe('dest-1')
      }
    })
  })

  describe('isConfigured()', () => {
    it('should return true when URL and token are configured', async () => {
      const service = new CoolifyService()
      expect(service.isConfigured()).toBe(true)
    })

    it('should return false when URL is missing', async () => {
      mockCoolifyUrl = undefined

      vi.resetModules()
      const freshModule = await import('../coolify.service.js')
      const service = new freshModule.CoolifyService()
      expect(service.isConfigured()).toBe(false)
    })

    it('should return false when token is missing', async () => {
      mockCoolifyToken = undefined

      vi.resetModules()
      const freshModule = await import('../coolify.service.js')
      const service = new freshModule.CoolifyService()
      expect(service.isConfigured()).toBe(false)
    })
  })

  describe('getCoolifyService() singleton', () => {
    it('should return the same instance', async () => {
      const instance1 = getCoolifyService()
      const instance2 = getCoolifyService()

      expect(instance1).toBe(instance2)
    })
  })
})
