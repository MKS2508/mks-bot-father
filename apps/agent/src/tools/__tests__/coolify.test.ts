import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ok, err } from '@mks2508/no-throw'

const mockCoolifyInit = vi.fn()
const mockCoolifyDeploy = vi.fn()
const mockCoolifySetEnvVars = vi.fn()
const mockCoolifyGetStatus = vi.fn()
const mockCoolifyListApplications = vi.fn()
const mockCoolifyDeleteApplication = vi.fn()
const mockCoolifyGetLogs = vi.fn()
const mockCoolifyStartApplication = vi.fn()
const mockCoolifyStopApplication = vi.fn()
const mockCoolifyRestartApplication = vi.fn()
const mockCoolifyGetDeploymentHistory = vi.fn()
const mockCoolifyUpdateApplication = vi.fn()
const mockCoolifyListServers = vi.fn()
const mockCoolifyGetServer = vi.fn()
const mockCoolifyGetServerDestinations = vi.fn()
const mockCoolifyCreateApplication = vi.fn()
const mockCoolifyListProjects = vi.fn()
const mockCoolifyListTeams = vi.fn()

vi.mock('@mks2508/mks-bot-father', () => ({
  getCoolifyService: () => ({
    init: mockCoolifyInit,
    deploy: mockCoolifyDeploy,
    setEnvironmentVariables: mockCoolifySetEnvVars,
    getApplicationStatus: mockCoolifyGetStatus,
    listApplications: mockCoolifyListApplications,
    deleteApplication: mockCoolifyDeleteApplication,
    getApplicationLogs: mockCoolifyGetLogs,
    startApplication: mockCoolifyStartApplication,
    stopApplication: mockCoolifyStopApplication,
    restartApplication: mockCoolifyRestartApplication,
    getApplicationDeploymentHistory: mockCoolifyGetDeploymentHistory,
    updateApplication: mockCoolifyUpdateApplication,
    listServers: mockCoolifyListServers,
    getServer: mockCoolifyGetServer,
    getServerDestinations: mockCoolifyGetServerDestinations,
    createApplication: mockCoolifyCreateApplication,
    listProjects: mockCoolifyListProjects,
    listTeams: mockCoolifyListTeams,
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

describe('Coolify Tools', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    capturedTools = []
    mockCoolifyInit.mockResolvedValue(ok(undefined))
    vi.resetModules()
    await import('../coolify.js')
  })

  describe('deploy tool', () => {
    it('should trigger deployment successfully', async () => {
      mockCoolifyDeploy.mockResolvedValue(
        ok({
          deploymentUuid: 'deploy-uuid-123',
          resourceUuid: 'resource-uuid-456',
        })
      )

      const tool = getTool('deploy')
      expect(tool).toBeDefined()

      const result = await tool!.handler({
        uuid: 'app-uuid-123',
      })

      expect(result.isError).toBeFalsy()
      expect(result.content).toHaveLength(1)

      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.deploymentUuid).toBe('deploy-uuid-123')
      expect(parsed.resourceUuid).toBe('resource-uuid-456')
      expect(parsed.message).toBe('Deployment started')
    })

    it('should handle Coolify init failure', async () => {
      mockCoolifyInit.mockResolvedValue(
        err({
          code: 'COOLIFY_ERROR',
          message: 'No Coolify URL configured',
        })
      )

      vi.resetModules()
      capturedTools = []
      await import('../coolify.js')

      const tool = getTool('deploy')
      const result = await tool!.handler({
        uuid: 'app-uuid',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Coolify not configured')
      expect(result.content[0].text).toContain('No Coolify URL configured')
    })

    it('should handle deployment failure', async () => {
      mockCoolifyDeploy.mockResolvedValue(
        err({
          code: 'COOLIFY_ERROR',
          message: 'Application not found',
        })
      )

      const tool = getTool('deploy')
      const result = await tool!.handler({
        uuid: 'nonexistent-uuid',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Deployment failed')
      expect(result.content[0].text).toContain('Application not found')
    })

    it('should pass force rebuild parameter', async () => {
      mockCoolifyDeploy.mockResolvedValue(
        ok({ deploymentUuid: 'deploy-123', resourceUuid: 'res-456' })
      )

      const tool = getTool('deploy')
      await tool!.handler({
        uuid: 'app-uuid',
        force: true,
      })

      expect(mockCoolifyDeploy).toHaveBeenCalledWith(
        expect.objectContaining({
          force: true,
        })
      )
    })

    it('should pass tag parameter', async () => {
      mockCoolifyDeploy.mockResolvedValue(
        ok({ deploymentUuid: 'deploy-123', resourceUuid: 'res-456' })
      )

      const tool = getTool('deploy')
      await tool!.handler({
        uuid: 'app-uuid',
        tag: 'v1.2.3',
      })

      expect(mockCoolifyDeploy).toHaveBeenCalledWith(
        expect.objectContaining({
          tag: 'v1.2.3',
        })
      )
    })

    it('should handle unexpected errors', async () => {
      mockCoolifyInit.mockRejectedValue(new Error('Network timeout'))

      vi.resetModules()
      capturedTools = []
      await import('../coolify.js')

      const tool = getTool('deploy')
      const result = await tool!.handler({
        uuid: 'app-uuid',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Error')
      expect(result.content[0].text).toContain('Network timeout')
    })
  })

  describe('set_env_vars tool', () => {
    it('should set environment variables successfully', async () => {
      mockCoolifySetEnvVars.mockResolvedValue(ok(undefined))

      const tool = getTool('set_env_vars')
      const result = await tool!.handler({
        uuid: 'app-uuid',
        envVars: {
          TG_BOT_TOKEN: 'token123',
          TG_MODE: 'webhook',
          NODE_ENV: 'production',
        },
      })

      expect(result.isError).toBeFalsy()
      expect(result.content[0].text).toContain('3 environment variable(s)')
      expect(result.content[0].text).toContain('deploy tool to apply')
    })

    it('should call service with correct parameters', async () => {
      mockCoolifySetEnvVars.mockResolvedValue(ok(undefined))

      const tool = getTool('set_env_vars')
      await tool!.handler({
        uuid: 'app-uuid-123',
        envVars: {
          KEY1: 'value1',
          KEY2: 'value2',
        },
      })

      expect(mockCoolifySetEnvVars).toHaveBeenCalledWith('app-uuid-123', {
        KEY1: 'value1',
        KEY2: 'value2',
      })
    })

    it('should handle set env vars failure', async () => {
      mockCoolifySetEnvVars.mockResolvedValue(
        err({
          code: 'COOLIFY_ERROR',
          message: 'Invalid application UUID',
        })
      )

      const tool = getTool('set_env_vars')
      const result = await tool!.handler({
        uuid: 'invalid-uuid',
        envVars: { KEY: 'value' },
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to set env vars')
      expect(result.content[0].text).toContain('Invalid application UUID')
    })

    it('should handle empty env vars', async () => {
      mockCoolifySetEnvVars.mockResolvedValue(ok(undefined))

      const tool = getTool('set_env_vars')
      const result = await tool!.handler({
        uuid: 'app-uuid',
        envVars: {},
      })

      expect(result.isError).toBeFalsy()
      expect(result.content[0].text).toContain('0 environment variable(s)')
    })

    it('should handle unexpected errors', async () => {
      mockCoolifySetEnvVars.mockRejectedValue(new Error('API error'))

      const tool = getTool('set_env_vars')
      const result = await tool!.handler({
        uuid: 'app-uuid',
        envVars: { KEY: 'value' },
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Error')
      expect(result.content[0].text).toContain('API error')
    })
  })

  describe('get_deployment_status tool', () => {
    it('should return application status', async () => {
      mockCoolifyGetStatus.mockResolvedValue(ok('running'))

      const tool = getTool('get_deployment_status')
      const result = await tool!.handler({
        uuid: 'app-uuid',
      })

      expect(result.isError).toBeFalsy()
      expect(result.content[0].text).toContain('running')
    })

    it('should return detailed status object', async () => {
      const statusObj = {
        status: 'running',
        health: 'healthy',
        replicas: 2,
        lastDeployed: '2024-01-08T10:00:00Z',
      }
      mockCoolifyGetStatus.mockResolvedValue(ok(statusObj))

      const tool = getTool('get_deployment_status')
      const result = await tool!.handler({
        uuid: 'app-uuid',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.status).toBe('running')
      expect(parsed.health).toBe('healthy')
      expect(parsed.replicas).toBe(2)
    })

    it('should handle status not found', async () => {
      mockCoolifyGetStatus.mockResolvedValue(
        err({
          code: 'COOLIFY_ERROR',
          message: 'Application not found',
        })
      )

      const tool = getTool('get_deployment_status')
      const result = await tool!.handler({
        uuid: 'nonexistent-uuid',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to get status')
      expect(result.content[0].text).toContain('Application not found')
    })

    it('should handle unexpected errors', async () => {
      mockCoolifyGetStatus.mockRejectedValue(new Error('Connection refused'))

      const tool = getTool('get_deployment_status')
      const result = await tool!.handler({
        uuid: 'app-uuid',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Error')
      expect(result.content[0].text).toContain('Connection refused')
    })
  })

  describe('list_applications tool', () => {
    it('should list all applications', async () => {
      mockCoolifyListApplications.mockResolvedValue(
        ok([
          { uuid: 'app-1', name: 'App 1', status: 'running' },
          { uuid: 'app-2', name: 'App 2', status: 'stopped' },
        ])
      )

      const tool = getTool('list_applications')
      const result = await tool!.handler({})

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.count).toBe(2)
      expect(parsed.applications).toHaveLength(2)
    })

    it('should filter by team ID', async () => {
      mockCoolifyListApplications.mockResolvedValue(ok([]))

      const tool = getTool('list_applications')
      await tool!.handler({ teamId: 'team-123' })

      expect(mockCoolifyListApplications).toHaveBeenCalledWith('team-123', undefined)
    })

    it('should filter by project ID', async () => {
      mockCoolifyListApplications.mockResolvedValue(ok([]))

      const tool = getTool('list_applications')
      await tool!.handler({ projectId: 'project-456' })

      expect(mockCoolifyListApplications).toHaveBeenCalledWith(undefined, 'project-456')
    })

    it('should handle empty list', async () => {
      mockCoolifyListApplications.mockResolvedValue(ok([]))

      const tool = getTool('list_applications')
      const result = await tool!.handler({})

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.count).toBe(0)
    })

    it('should handle list failure', async () => {
      mockCoolifyListApplications.mockResolvedValue(
        err({ code: 'COOLIFY_ERROR', message: 'Unauthorized' })
      )

      const tool = getTool('list_applications')
      const result = await tool!.handler({})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to list applications')
    })
  })

  describe('delete_application tool', () => {
    it('should delete application successfully', async () => {
      mockCoolifyDeleteApplication.mockResolvedValue(ok(undefined))

      const tool = getTool('delete_application')
      const result = await tool!.handler({ uuid: 'app-to-delete' })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.message).toContain('deleted successfully')
    })

    it('should handle delete failure', async () => {
      mockCoolifyDeleteApplication.mockResolvedValue(
        err({ code: 'COOLIFY_ERROR', message: 'Application not found' })
      )

      const tool = getTool('delete_application')
      const result = await tool!.handler({ uuid: 'nonexistent' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to delete application')
    })
  })

  describe('get_application_logs tool', () => {
    it('should get logs successfully', async () => {
      mockCoolifyGetLogs.mockResolvedValue(
        ok({
          timestamp: '2024-01-08T10:00:00Z',
          logs: ['Log line 1', 'Log line 2', 'Log line 3'],
        })
      )

      const tool = getTool('get_application_logs')
      const result = await tool!.handler({ uuid: 'app-uuid' })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.logCount).toBe(3)
    })

    it('should pass tail parameter', async () => {
      mockCoolifyGetLogs.mockResolvedValue(ok({ timestamp: '', logs: [] }))

      const tool = getTool('get_application_logs')
      await tool!.handler({ uuid: 'app-uuid', tail: 50 })

      expect(mockCoolifyGetLogs).toHaveBeenCalledWith('app-uuid', { tail: 50 })
    })

    it('should handle logs failure', async () => {
      mockCoolifyGetLogs.mockResolvedValue(
        err({ code: 'COOLIFY_ERROR', message: 'Container not running' })
      )

      const tool = getTool('get_application_logs')
      const result = await tool!.handler({ uuid: 'app-uuid' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to get logs')
    })
  })

  describe('start_application tool', () => {
    it('should start application successfully', async () => {
      mockCoolifyStartApplication.mockResolvedValue(
        ok({ uuid: 'app-uuid', status: 'running' })
      )

      const tool = getTool('start_application')
      const result = await tool!.handler({ uuid: 'app-uuid' })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.message).toContain('started')
    })

    it('should handle start failure', async () => {
      mockCoolifyStartApplication.mockResolvedValue(
        err({ code: 'COOLIFY_ERROR', message: 'Already running' })
      )

      const tool = getTool('start_application')
      const result = await tool!.handler({ uuid: 'app-uuid' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to start application')
    })
  })

  describe('stop_application tool', () => {
    it('should stop application successfully', async () => {
      mockCoolifyStopApplication.mockResolvedValue(
        ok({ uuid: 'app-uuid', status: 'stopped' })
      )

      const tool = getTool('stop_application')
      const result = await tool!.handler({ uuid: 'app-uuid' })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.message).toContain('stopped')
    })

    it('should handle stop failure', async () => {
      mockCoolifyStopApplication.mockResolvedValue(
        err({ code: 'COOLIFY_ERROR', message: 'Already stopped' })
      )

      const tool = getTool('stop_application')
      const result = await tool!.handler({ uuid: 'app-uuid' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to stop application')
    })
  })

  describe('restart_application tool', () => {
    it('should restart application successfully', async () => {
      mockCoolifyRestartApplication.mockResolvedValue(
        ok({ uuid: 'app-uuid', status: 'running' })
      )

      const tool = getTool('restart_application')
      const result = await tool!.handler({ uuid: 'app-uuid' })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.message).toContain('restarted')
    })

    it('should handle restart failure', async () => {
      mockCoolifyRestartApplication.mockResolvedValue(
        err({ code: 'COOLIFY_ERROR', message: 'Container error' })
      )

      const tool = getTool('restart_application')
      const result = await tool!.handler({ uuid: 'app-uuid' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to restart application')
    })
  })

  describe('get_deployment_history tool', () => {
    it('should get deployment history', async () => {
      mockCoolifyGetDeploymentHistory.mockResolvedValue(
        ok([
          { uuid: 'deploy-1', status: 'finished', createdAt: '2024-01-08' },
          { uuid: 'deploy-2', status: 'finished', createdAt: '2024-01-07' },
        ])
      )

      const tool = getTool('get_deployment_history')
      const result = await tool!.handler({ uuid: 'app-uuid' })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.count).toBe(2)
    })

    it('should handle empty history', async () => {
      mockCoolifyGetDeploymentHistory.mockResolvedValue(ok([]))

      const tool = getTool('get_deployment_history')
      const result = await tool!.handler({ uuid: 'app-uuid' })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.count).toBe(0)
    })

    it('should handle history failure', async () => {
      mockCoolifyGetDeploymentHistory.mockResolvedValue(
        err({ code: 'COOLIFY_ERROR', message: 'Not found' })
      )

      const tool = getTool('get_deployment_history')
      const result = await tool!.handler({ uuid: 'app-uuid' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to get deployment history')
    })
  })

  describe('update_application tool', () => {
    it('should update application successfully', async () => {
      mockCoolifyUpdateApplication.mockResolvedValue(
        ok({ uuid: 'app-uuid', name: 'Updated App' })
      )

      const tool = getTool('update_application')
      const result = await tool!.handler({
        uuid: 'app-uuid',
        name: 'Updated App',
        description: 'New description',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.message).toContain('updated')
    })

    it('should pass build settings', async () => {
      mockCoolifyUpdateApplication.mockResolvedValue(ok({ uuid: 'app-uuid' }))

      const tool = getTool('update_application')
      await tool!.handler({
        uuid: 'app-uuid',
        buildPack: 'nixpacks',
        gitBranch: 'main',
        installCommand: 'bun install',
        buildCommand: 'bun run build',
        startCommand: 'bun run start',
      })

      expect(mockCoolifyUpdateApplication).toHaveBeenCalledWith('app-uuid', {
        name: undefined,
        description: undefined,
        buildPack: 'nixpacks',
        gitBranch: 'main',
        portsExposes: undefined,
        installCommand: 'bun install',
        buildCommand: 'bun run build',
        startCommand: 'bun run start',
      })
    })

    it('should handle update failure', async () => {
      mockCoolifyUpdateApplication.mockResolvedValue(
        err({ code: 'COOLIFY_ERROR', message: 'Invalid build pack' })
      )

      const tool = getTool('update_application')
      const result = await tool!.handler({
        uuid: 'app-uuid',
        buildPack: 'invalid' as any,
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to update application')
    })
  })

  describe('list_servers tool', () => {
    it('should list servers successfully', async () => {
      mockCoolifyListServers.mockResolvedValue(
        ok([
          { uuid: 'server-1', name: 'localhost' },
          { uuid: 'server-2', name: 'production' },
        ])
      )

      const tool = getTool('list_servers')
      const result = await tool!.handler({})

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.count).toBe(2)
      expect(parsed.servers).toHaveLength(2)
      expect(parsed.servers[0].name).toBe('localhost')
    })

    it('should handle empty server list', async () => {
      mockCoolifyListServers.mockResolvedValue(ok([]))

      const tool = getTool('list_servers')
      const result = await tool!.handler({})

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.count).toBe(0)
      expect(parsed.servers).toHaveLength(0)
    })

    it('should handle list servers failure', async () => {
      mockCoolifyListServers.mockResolvedValue(
        err({ code: 'COOLIFY_ERROR', message: 'Unauthorized' })
      )

      const tool = getTool('list_servers')
      const result = await tool!.handler({})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to list servers')
      expect(result.content[0].text).toContain('Unauthorized')
    })

    it('should handle unexpected errors', async () => {
      mockCoolifyListServers.mockRejectedValue(new Error('Network error'))

      const tool = getTool('list_servers')
      const result = await tool!.handler({})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Error')
      expect(result.content[0].text).toContain('Network error')
    })

    it('should handle init failure', async () => {
      mockCoolifyInit.mockResolvedValue(
        err({ code: 'COOLIFY_ERROR', message: 'No token configured' })
      )

      vi.resetModules()
      capturedTools = []
      await import('../coolify.js')

      const tool = getTool('list_servers')
      const result = await tool!.handler({})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Coolify not configured')
    })
  })

  describe('get_server_destinations tool', () => {
    it('should get server destinations successfully', async () => {
      mockCoolifyGetServerDestinations.mockResolvedValue(
        ok([
          { uuid: 'dest-1', name: 'coolify-network' },
          { uuid: 'dest-2', name: 'bridge' },
        ])
      )

      const tool = getTool('get_server_destinations')
      const result = await tool!.handler({ serverUuid: 'server-uuid-123' })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.serverUuid).toBe('server-uuid-123')
      expect(parsed.count).toBe(2)
      expect(parsed.destinations).toHaveLength(2)
    })

    it('should call service with correct server UUID', async () => {
      mockCoolifyGetServerDestinations.mockResolvedValue(ok([]))

      const tool = getTool('get_server_destinations')
      await tool!.handler({ serverUuid: 'my-server-uuid' })

      expect(mockCoolifyGetServerDestinations).toHaveBeenCalledWith('my-server-uuid')
    })

    it('should handle empty destinations', async () => {
      mockCoolifyGetServerDestinations.mockResolvedValue(ok([]))

      const tool = getTool('get_server_destinations')
      const result = await tool!.handler({ serverUuid: 'server-uuid' })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.count).toBe(0)
    })

    it('should handle get destinations failure', async () => {
      mockCoolifyGetServerDestinations.mockResolvedValue(
        err({ code: 'COOLIFY_ERROR', message: 'Server not found' })
      )

      const tool = getTool('get_server_destinations')
      const result = await tool!.handler({ serverUuid: 'invalid-server' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to get destinations')
      expect(result.content[0].text).toContain('Server not found')
    })

    it('should handle unexpected errors', async () => {
      mockCoolifyGetServerDestinations.mockRejectedValue(new Error('Connection timeout'))

      const tool = getTool('get_server_destinations')
      const result = await tool!.handler({ serverUuid: 'server-uuid' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Error')
      expect(result.content[0].text).toContain('Connection timeout')
    })
  })

  describe('create_application tool', () => {
    it('should create application successfully', async () => {
      mockCoolifyCreateApplication.mockResolvedValue(
        ok({ success: true, uuid: 'new-app-uuid-123' })
      )

      const tool = getTool('create_application')
      const result = await tool!.handler({
        name: 'my-new-app',
        serverUuid: 'server-uuid',
        destinationUuid: 'dest-uuid',
        githubRepoUrl: 'https://github.com/user/repo',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.uuid).toBe('new-app-uuid-123')
      expect(parsed.message).toContain('my-new-app')
      expect(parsed.nextSteps).toBeDefined()
      expect(parsed.nextSteps).toContain('Use set_env_vars to configure environment variables')
    })

    it('should pass all parameters to service', async () => {
      mockCoolifyCreateApplication.mockResolvedValue(ok({ success: true, uuid: 'app-uuid' }))

      const tool = getTool('create_application')
      await tool!.handler({
        name: 'test-app',
        serverUuid: 'srv-123',
        destinationUuid: 'dest-456',
        githubRepoUrl: 'https://github.com/org/repo',
        description: 'Test application',
        branch: 'develop',
        buildPack: 'dockerfile',
      })

      expect(mockCoolifyCreateApplication).toHaveBeenCalledWith({
        name: 'test-app',
        description: 'Test application',
        serverUuid: 'srv-123',
        destinationUuid: 'dest-456',
        githubRepoUrl: 'https://github.com/org/repo',
        branch: 'develop',
        buildPack: 'dockerfile',
      })
    })

    it('should use default branch and buildPack', async () => {
      mockCoolifyCreateApplication.mockResolvedValue(ok({ success: true, uuid: 'app-uuid' }))

      const tool = getTool('create_application')
      await tool!.handler({
        name: 'test-app',
        serverUuid: 'srv-123',
        destinationUuid: 'dest-456',
        githubRepoUrl: 'https://github.com/org/repo',
      })

      expect(mockCoolifyCreateApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          branch: 'main',
          buildPack: 'nixpacks',
        })
      )
    })

    it('should handle create application failure', async () => {
      mockCoolifyCreateApplication.mockResolvedValue(
        err({ code: 'COOLIFY_ERROR', message: 'Repository not accessible' })
      )

      const tool = getTool('create_application')
      const result = await tool!.handler({
        name: 'test-app',
        serverUuid: 'srv-123',
        destinationUuid: 'dest-456',
        githubRepoUrl: 'https://github.com/private/repo',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to create application')
      expect(result.content[0].text).toContain('Repository not accessible')
    })

    it('should handle invalid server UUID', async () => {
      mockCoolifyCreateApplication.mockResolvedValue(
        err({ code: 'COOLIFY_ERROR', message: 'Invalid server UUID' })
      )

      const tool = getTool('create_application')
      const result = await tool!.handler({
        name: 'test-app',
        serverUuid: 'invalid',
        destinationUuid: 'dest-456',
        githubRepoUrl: 'https://github.com/user/repo',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to create application')
    })

    it('should handle invalid destination UUID', async () => {
      mockCoolifyCreateApplication.mockResolvedValue(
        err({ code: 'COOLIFY_ERROR', message: 'Destination not found' })
      )

      const tool = getTool('create_application')
      const result = await tool!.handler({
        name: 'test-app',
        serverUuid: 'srv-123',
        destinationUuid: 'invalid-dest',
        githubRepoUrl: 'https://github.com/user/repo',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to create application')
      expect(result.content[0].text).toContain('Destination not found')
    })

    it('should handle unexpected errors', async () => {
      mockCoolifyCreateApplication.mockRejectedValue(new Error('API timeout'))

      const tool = getTool('create_application')
      const result = await tool!.handler({
        name: 'test-app',
        serverUuid: 'srv-123',
        destinationUuid: 'dest-456',
        githubRepoUrl: 'https://github.com/user/repo',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Error')
      expect(result.content[0].text).toContain('API timeout')
    })

    it('should handle init failure', async () => {
      mockCoolifyInit.mockResolvedValue(
        err({ code: 'COOLIFY_ERROR', message: 'No Coolify URL configured' })
      )

      vi.resetModules()
      capturedTools = []
      await import('../coolify.js')

      const tool = getTool('create_application')
      const result = await tool!.handler({
        name: 'test-app',
        serverUuid: 'srv-123',
        destinationUuid: 'dest-456',
        githubRepoUrl: 'https://github.com/user/repo',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Coolify not configured')
    })
  })

  describe('get_server tool', () => {
    it('should get server details successfully', async () => {
      mockCoolifyGetServer.mockResolvedValue(
        ok({
          uuid: 'server-uuid-123',
          name: 'Production Server',
          ip: '192.168.1.100',
        })
      )

      const tool = getTool('get_server')
      const result = await tool!.handler({ serverUuid: 'server-uuid-123' })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.server.uuid).toBe('server-uuid-123')
      expect(parsed.server.name).toBe('Production Server')
    })

    it('should call service with correct UUID', async () => {
      mockCoolifyGetServer.mockResolvedValue(ok({ uuid: 'srv-123', name: 'Test' }))

      const tool = getTool('get_server')
      await tool!.handler({ serverUuid: 'srv-123' })

      expect(mockCoolifyGetServer).toHaveBeenCalledWith('srv-123')
    })

    it('should handle server not found error', async () => {
      mockCoolifyGetServer.mockResolvedValue(
        err({ code: 'COOLIFY_ERROR', message: 'Server not found' })
      )

      const tool = getTool('get_server')
      const result = await tool!.handler({ serverUuid: 'nonexistent' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to get server')
      expect(result.content[0].text).toContain('Server not found')
    })

    it('should handle unexpected errors', async () => {
      mockCoolifyGetServer.mockRejectedValue(new Error('Connection refused'))

      const tool = getTool('get_server')
      const result = await tool!.handler({ serverUuid: 'server-uuid' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Error')
      expect(result.content[0].text).toContain('Connection refused')
    })

    it('should handle init failure', async () => {
      mockCoolifyInit.mockResolvedValue(
        err({ code: 'COOLIFY_ERROR', message: 'No token configured' })
      )

      vi.resetModules()
      capturedTools = []
      await import('../coolify.js')

      const tool = getTool('get_server')
      const result = await tool!.handler({ serverUuid: 'server-uuid' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Coolify not configured')
    })
  })

  describe('list_projects tool', () => {
    it('should list projects successfully', async () => {
      mockCoolifyListProjects.mockResolvedValue(
        ok([
          { uuid: 'proj-1', name: 'Project 1' },
          { uuid: 'proj-2', name: 'Project 2' },
        ])
      )

      const tool = getTool('list_projects')
      const result = await tool!.handler({})

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.count).toBe(2)
      expect(parsed.projects).toHaveLength(2)
      expect(parsed.projects[0].name).toBe('Project 1')
    })

    it('should handle empty project list', async () => {
      mockCoolifyListProjects.mockResolvedValue(ok([]))

      const tool = getTool('list_projects')
      const result = await tool!.handler({})

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.count).toBe(0)
      expect(parsed.projects).toHaveLength(0)
    })

    it('should handle list projects failure', async () => {
      mockCoolifyListProjects.mockResolvedValue(
        err({ code: 'COOLIFY_ERROR', message: 'Unauthorized' })
      )

      const tool = getTool('list_projects')
      const result = await tool!.handler({})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to list projects')
      expect(result.content[0].text).toContain('Unauthorized')
    })

    it('should handle unexpected errors', async () => {
      mockCoolifyListProjects.mockRejectedValue(new Error('Network error'))

      const tool = getTool('list_projects')
      const result = await tool!.handler({})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Error')
      expect(result.content[0].text).toContain('Network error')
    })

    it('should handle init failure', async () => {
      mockCoolifyInit.mockResolvedValue(
        err({ code: 'COOLIFY_ERROR', message: 'No token configured' })
      )

      vi.resetModules()
      capturedTools = []
      await import('../coolify.js')

      const tool = getTool('list_projects')
      const result = await tool!.handler({})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Coolify not configured')
    })
  })

  describe('list_teams tool', () => {
    it('should list teams successfully', async () => {
      mockCoolifyListTeams.mockResolvedValue(
        ok([
          { id: 1, name: 'Team Alpha' },
          { id: 2, name: 'Team Beta' },
        ])
      )

      const tool = getTool('list_teams')
      const result = await tool!.handler({})

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.count).toBe(2)
      expect(parsed.teams).toHaveLength(2)
      expect(parsed.teams[0].name).toBe('Team Alpha')
    })

    it('should handle empty team list', async () => {
      mockCoolifyListTeams.mockResolvedValue(ok([]))

      const tool = getTool('list_teams')
      const result = await tool!.handler({})

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.count).toBe(0)
      expect(parsed.teams).toHaveLength(0)
    })

    it('should handle list teams failure', async () => {
      mockCoolifyListTeams.mockResolvedValue(
        err({ code: 'COOLIFY_ERROR', message: 'Unauthorized' })
      )

      const tool = getTool('list_teams')
      const result = await tool!.handler({})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to list teams')
      expect(result.content[0].text).toContain('Unauthorized')
    })

    it('should handle unexpected errors', async () => {
      mockCoolifyListTeams.mockRejectedValue(new Error('Network error'))

      const tool = getTool('list_teams')
      const result = await tool!.handler({})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Error')
      expect(result.content[0].text).toContain('Network error')
    })

    it('should handle init failure', async () => {
      mockCoolifyInit.mockResolvedValue(
        err({ code: 'COOLIFY_ERROR', message: 'No token configured' })
      )

      vi.resetModules()
      capturedTools = []
      await import('../coolify.js')

      const tool = getTool('list_teams')
      const result = await tool!.handler({})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Coolify not configured')
    })
  })
})
