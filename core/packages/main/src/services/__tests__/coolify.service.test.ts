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

  describe('listApplications()', () => {
    it('should return list of applications', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify([
            { uuid: 'app-1', name: 'App 1', status: 'running' },
            { uuid: 'app-2', name: 'App 2', status: 'stopped' },
          ]),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.listApplications()

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toHaveLength(2)
        expect(result.value[0].uuid).toBe('app-1')
        expect(result.value[0].name).toBe('App 1')
        expect(result.value[1].status).toBe('stopped')
      }
    })

    it('should return empty array if no applications', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify([]),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.listApplications()

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toHaveLength(0)
      }
    })

    it('should filter by teamId when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify([{ uuid: 'app-1', name: 'Team App', status: 'running' }]),
      })

      const service = new CoolifyService()
      await service.init()
      await service.listApplications('team-123')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('team_id=team-123'),
        expect.any(Object)
      )
    })

    it('should filter by projectId when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify([]),
      })

      const service = new CoolifyService()
      await service.init()
      await service.listApplications(undefined, 'project-456')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('project_id=project-456'),
        expect.any(Object)
      )
    })

    it('should handle API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ message: 'Internal server error' }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.listApplications()

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('Internal server error')
      }
    })
  })

  describe('deleteApplication()', () => {
    it('should delete application successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ message: 'deleted' }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.deleteApplication('app-uuid')

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.success).toBe(true)
      }

      expect(mockFetch).toHaveBeenCalledWith(
        'https://coolify.test.com/api/v1/applications/app-uuid',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })

    it('should handle not found error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ message: 'Application not found' }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.deleteApplication('nonexistent')

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('Application not found')
      }
    })

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const service = new CoolifyService()
      await service.init()
      const result = await service.deleteApplication('app-uuid')

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('Network error')
      }
    })
  })

  describe('updateApplication()', () => {
    it('should update application with all options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            uuid: 'app-uuid',
            name: 'Updated App',
            status: 'running',
          }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.updateApplication('app-uuid', {
        name: 'Updated App',
        description: 'New description',
        buildPack: 'nixpacks',
        gitBranch: 'develop',
        portsExposes: '3000,8080',
        installCommand: 'bun install',
        buildCommand: 'bun run build',
        startCommand: 'bun run start',
      })

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.name).toBe('Updated App')
      }
    })

    it('should update application with partial options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            uuid: 'app-uuid',
            name: 'Renamed App',
            status: 'running',
          }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.updateApplication('app-uuid', {
        name: 'Renamed App',
      })

      expect(isOk(result)).toBe(true)
    })

    it('should handle validation error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: async () => JSON.stringify({ message: 'Invalid build pack' }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.updateApplication('app-uuid', {
        buildPack: 'dockerfile',
      })

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('Invalid build pack')
      }
    })

    it('should send correct API payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ uuid: 'app-uuid', name: 'Test', status: 'running' }),
      })

      const service = new CoolifyService()
      await service.init()
      await service.updateApplication('app-uuid', {
        name: 'New Name',
        gitBranch: 'main',
        buildCommand: 'npm build',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://coolify.test.com/api/v1/applications/app-uuid',
        expect.objectContaining({
          method: 'PATCH',
        })
      )

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1].body)
      expect(body.name).toBe('New Name')
      expect(body.git_branch).toBe('main')
      expect(body.build_command).toBe('npm build')
    })
  })

  describe('getApplicationLogs()', () => {
    it('should return logs successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            logs: ['Line 1', 'Line 2', 'Line 3'],
          }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.getApplicationLogs('app-uuid')

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.logs).toHaveLength(3)
        expect(result.value.logs[0]).toBe('Line 1')
        expect(result.value.timestamp).toBeDefined()
      }
    })

    it('should support tail option', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ logs: ['Last line'] }),
      })

      const service = new CoolifyService()
      await service.init()
      await service.getApplicationLogs('app-uuid', { tail: 50 })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('tail=50'),
        expect.any(Object)
      )
    })

    it('should support follow option', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ logs: [] }),
      })

      const service = new CoolifyService()
      await service.init()
      await service.getApplicationLogs('app-uuid', { follow: true })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('follow=true'),
        expect.any(Object)
      )
    })

    it('should return empty logs array if none', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ logs: [] }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.getApplicationLogs('app-uuid')

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.logs).toHaveLength(0)
      }
    })

    it('should handle error when app not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ message: 'Application not found' }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.getApplicationLogs('nonexistent')

      expect(isErr(result)).toBe(true)
    })
  })

  describe('getApplicationDeploymentHistory()', () => {
    it('should return deployment history', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify([
            {
              id: '1',
              uuid: 'deploy-1',
              status: 'built',
              createdAt: '2024-01-01T00:00:00Z',
              finishedAt: '2024-01-01T00:05:00Z',
              commit: 'abc123',
            },
            {
              id: '2',
              uuid: 'deploy-2',
              status: 'failed',
              createdAt: '2024-01-02T00:00:00Z',
            },
          ]),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.getApplicationDeploymentHistory('app-uuid')

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toHaveLength(2)
        expect(result.value[0].status).toBe('built')
        expect(result.value[0].commit).toBe('abc123')
        expect(result.value[1].status).toBe('failed')
      }
    })

    it('should return empty array if no deployments', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify([]),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.getApplicationDeploymentHistory('app-uuid')

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toHaveLength(0)
      }
    })

    it('should handle error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ message: 'Server error' }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.getApplicationDeploymentHistory('app-uuid')

      expect(isErr(result)).toBe(true)
    })

    it('should call correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify([]),
      })

      const service = new CoolifyService()
      await service.init()
      await service.getApplicationDeploymentHistory('app-uuid')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://coolify.test.com/api/v1/applications/app-uuid/deployments',
        expect.any(Object)
      )
    })
  })

  describe('startApplication()', () => {
    it('should start application successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            uuid: 'app-uuid',
            name: 'Test App',
            status: 'running',
          }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.startApplication('app-uuid')

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.status).toBe('running')
      }

      expect(mockFetch).toHaveBeenCalledWith(
        'https://coolify.test.com/api/v1/applications/app-uuid/start',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test_coolify_token',
          }),
        })
      )
    })

    it('should handle already running error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        text: async () => JSON.stringify({ message: 'Application is already running' }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.startApplication('app-uuid')

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('already running')
      }
    })

    it('should handle not found error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ message: 'Application not found' }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.startApplication('nonexistent')

      expect(isErr(result)).toBe(true)
    })
  })

  describe('stopApplication()', () => {
    it('should stop application successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            uuid: 'app-uuid',
            name: 'Test App',
            status: 'stopped',
          }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.stopApplication('app-uuid')

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.status).toBe('stopped')
      }

      expect(mockFetch).toHaveBeenCalledWith(
        'https://coolify.test.com/api/v1/applications/app-uuid/stop',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('should handle already stopped error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        text: async () => JSON.stringify({ message: 'Application is already stopped' }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.stopApplication('app-uuid')

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('already stopped')
      }
    })

    it('should handle not found error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ message: 'Application not found' }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.stopApplication('nonexistent')

      expect(isErr(result)).toBe(true)
    })
  })

  describe('restartApplication()', () => {
    it('should restart application successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            uuid: 'app-uuid',
            name: 'Test App',
            status: 'running',
          }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.restartApplication('app-uuid')

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.uuid).toBe('app-uuid')
      }
    })

    it('should handle error during restart', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ message: 'Restart failed' }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.restartApplication('app-uuid')

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('Restart failed')
      }
    })

    it('should verify correct endpoint called', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ uuid: 'app-uuid', name: 'Test', status: 'running' }),
      })

      const service = new CoolifyService()
      await service.init()
      await service.restartApplication('app-uuid')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://coolify.test.com/api/v1/applications/app-uuid/restart',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test_coolify_token',
          }),
        })
      )
    })

    it('should handle not found error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ message: 'Application not found' }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.restartApplication('nonexistent')

      expect(isErr(result)).toBe(true)
    })
  })

  describe('getServer()', () => {
    it('should return server details successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            uuid: 'server-uuid-123',
            name: 'Production Server',
            ip: '192.168.1.100',
            user: 'root',
            port: 22,
          }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.getServer('server-uuid-123')

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value.uuid).toBe('server-uuid-123')
        expect(result.value.name).toBe('Production Server')
      }

      expect(mockFetch).toHaveBeenCalledWith(
        'https://coolify.test.com/api/v1/servers/server-uuid-123',
        expect.any(Object)
      )
    })

    it('should handle not found error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ message: 'Server not found' }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.getServer('nonexistent')

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('Server not found')
      }
    })

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const service = new CoolifyService()
      await service.init()
      const result = await service.getServer('server-uuid')

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('Network error')
      }
    })
  })

  describe('listProjects()', () => {
    it('should return list of projects', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify([
            { uuid: 'proj-1', name: 'Project 1', description: 'First project' },
            { uuid: 'proj-2', name: 'Project 2', description: 'Second project' },
          ]),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.listProjects()

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toHaveLength(2)
        expect(result.value[0].uuid).toBe('proj-1')
        expect(result.value[0].name).toBe('Project 1')
      }

      expect(mockFetch).toHaveBeenCalledWith(
        'https://coolify.test.com/api/v1/projects',
        expect.any(Object)
      )
    })

    it('should return empty array if no projects', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify([]),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.listProjects()

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toHaveLength(0)
      }
    })

    it('should handle API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ message: 'Internal server error' }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.listProjects()

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('Internal server error')
      }
    })
  })

  describe('listTeams()', () => {
    it('should return list of teams', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify([
            { id: 1, name: 'Team Alpha', description: 'Alpha team' },
            { id: 2, name: 'Team Beta', description: 'Beta team' },
          ]),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.listTeams()

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toHaveLength(2)
        expect(result.value[0].id).toBe(1)
        expect(result.value[0].name).toBe('Team Alpha')
      }

      expect(mockFetch).toHaveBeenCalledWith(
        'https://coolify.test.com/api/v1/teams',
        expect.any(Object)
      )
    })

    it('should return empty array if no teams', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify([]),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.listTeams()

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toHaveLength(0)
      }
    })

    it('should handle API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ message: 'Internal server error' }),
      })

      const service = new CoolifyService()
      await service.init()
      const result = await service.listTeams()

      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.message).toContain('Internal server error')
      }
    })
  })
})
