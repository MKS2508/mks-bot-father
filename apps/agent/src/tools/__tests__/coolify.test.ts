import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ok, err } from '@mks2508/no-throw'

const mockCoolifyInit = vi.fn()
const mockCoolifyDeploy = vi.fn()
const mockCoolifySetEnvVars = vi.fn()
const mockCoolifyGetStatus = vi.fn()

vi.mock('@mks2508/mks-bot-father', () => ({
  getCoolifyService: () => ({
    init: mockCoolifyInit,
    deploy: mockCoolifyDeploy,
    setEnvironmentVariables: mockCoolifySetEnvVars,
    getApplicationStatus: mockCoolifyGetStatus,
  }),
}))

describe('Coolify Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCoolifyInit.mockResolvedValue(ok(undefined))
  })

  describe('deploy tool', () => {
    it('should trigger deployment successfully', async () => {
      mockCoolifyDeploy.mockResolvedValue(
        ok({
          deploymentUuid: 'deploy-uuid-123',
          resourceUuid: 'resource-uuid-456',
        })
      )

      const { coolifyServer } = await import('../coolify.js')
      const tools = coolifyServer.listTools()
      const deployTool = tools.find((t) => t.name === 'deploy')

      expect(deployTool).toBeDefined()

      const result = await coolifyServer.callTool('deploy', {
        uuid: 'app-uuid-123',
      })

      expect(result.isError).toBeFalsy()
      expect(result.content).toHaveLength(1)

      if (result.content[0].type === 'text') {
        const parsed = JSON.parse(result.content[0].text)
        expect(parsed.success).toBe(true)
        expect(parsed.deploymentUuid).toBe('deploy-uuid-123')
        expect(parsed.resourceUuid).toBe('resource-uuid-456')
        expect(parsed.message).toBe('Deployment started')
      }
    })

    it('should handle Coolify init failure', async () => {
      mockCoolifyInit.mockResolvedValue(
        err({
          code: 'COOLIFY_ERROR',
          message: 'No Coolify URL configured',
        })
      )

      vi.resetModules()
      const { coolifyServer } = await import('../coolify.js')
      const result = await coolifyServer.callTool('deploy', {
        uuid: 'app-uuid',
      })

      expect(result.isError).toBe(true)
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('Coolify not configured')
        expect(result.content[0].text).toContain('No Coolify URL configured')
      }
    })

    it('should handle deployment failure', async () => {
      mockCoolifyDeploy.mockResolvedValue(
        err({
          code: 'COOLIFY_ERROR',
          message: 'Application not found',
        })
      )

      vi.resetModules()
      const { coolifyServer } = await import('../coolify.js')
      const result = await coolifyServer.callTool('deploy', {
        uuid: 'nonexistent-uuid',
      })

      expect(result.isError).toBe(true)
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('Deployment failed')
        expect(result.content[0].text).toContain('Application not found')
      }
    })

    it('should pass force rebuild parameter', async () => {
      mockCoolifyDeploy.mockResolvedValue(
        ok({ deploymentUuid: 'deploy-123', resourceUuid: 'res-456' })
      )

      vi.resetModules()
      const { coolifyServer } = await import('../coolify.js')
      await coolifyServer.callTool('deploy', {
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

      vi.resetModules()
      const { coolifyServer } = await import('../coolify.js')
      await coolifyServer.callTool('deploy', {
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
      const { coolifyServer } = await import('../coolify.js')
      const result = await coolifyServer.callTool('deploy', {
        uuid: 'app-uuid',
      })

      expect(result.isError).toBe(true)
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('Error')
        expect(result.content[0].text).toContain('Network timeout')
      }
    })
  })

  describe('set_env_vars tool', () => {
    it('should set environment variables successfully', async () => {
      mockCoolifySetEnvVars.mockResolvedValue(ok(undefined))

      vi.resetModules()
      const { coolifyServer } = await import('../coolify.js')
      const result = await coolifyServer.callTool('set_env_vars', {
        uuid: 'app-uuid',
        envVars: {
          TG_BOT_TOKEN: 'token123',
          TG_MODE: 'webhook',
          NODE_ENV: 'production',
        },
      })

      expect(result.isError).toBeFalsy()
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('3 environment variable(s)')
        expect(result.content[0].text).toContain('deploy tool to apply')
      }
    })

    it('should call service with correct parameters', async () => {
      mockCoolifySetEnvVars.mockResolvedValue(ok(undefined))

      vi.resetModules()
      const { coolifyServer } = await import('../coolify.js')
      await coolifyServer.callTool('set_env_vars', {
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

      vi.resetModules()
      const { coolifyServer } = await import('../coolify.js')
      const result = await coolifyServer.callTool('set_env_vars', {
        uuid: 'invalid-uuid',
        envVars: { KEY: 'value' },
      })

      expect(result.isError).toBe(true)
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('Failed to set env vars')
        expect(result.content[0].text).toContain('Invalid application UUID')
      }
    })

    it('should handle empty env vars', async () => {
      mockCoolifySetEnvVars.mockResolvedValue(ok(undefined))

      vi.resetModules()
      const { coolifyServer } = await import('../coolify.js')
      const result = await coolifyServer.callTool('set_env_vars', {
        uuid: 'app-uuid',
        envVars: {},
      })

      expect(result.isError).toBeFalsy()
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('0 environment variable(s)')
      }
    })

    it('should handle unexpected errors', async () => {
      mockCoolifySetEnvVars.mockRejectedValue(new Error('API error'))

      vi.resetModules()
      const { coolifyServer } = await import('../coolify.js')
      const result = await coolifyServer.callTool('set_env_vars', {
        uuid: 'app-uuid',
        envVars: { KEY: 'value' },
      })

      expect(result.isError).toBe(true)
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('Error')
        expect(result.content[0].text).toContain('API error')
      }
    })
  })

  describe('get_deployment_status tool', () => {
    it('should return application status', async () => {
      mockCoolifyGetStatus.mockResolvedValue(ok('running'))

      vi.resetModules()
      const { coolifyServer } = await import('../coolify.js')
      const result = await coolifyServer.callTool('get_deployment_status', {
        uuid: 'app-uuid',
      })

      expect(result.isError).toBeFalsy()
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('running')
      }
    })

    it('should return detailed status object', async () => {
      const statusObj = {
        status: 'running',
        health: 'healthy',
        replicas: 2,
        lastDeployed: '2024-01-08T10:00:00Z',
      }
      mockCoolifyGetStatus.mockResolvedValue(ok(statusObj))

      vi.resetModules()
      const { coolifyServer } = await import('../coolify.js')
      const result = await coolifyServer.callTool('get_deployment_status', {
        uuid: 'app-uuid',
      })

      expect(result.isError).toBeFalsy()
      if (result.content[0].type === 'text') {
        const parsed = JSON.parse(result.content[0].text)
        expect(parsed.status).toBe('running')
        expect(parsed.health).toBe('healthy')
        expect(parsed.replicas).toBe(2)
      }
    })

    it('should handle status not found', async () => {
      mockCoolifyGetStatus.mockResolvedValue(
        err({
          code: 'COOLIFY_ERROR',
          message: 'Application not found',
        })
      )

      vi.resetModules()
      const { coolifyServer } = await import('../coolify.js')
      const result = await coolifyServer.callTool('get_deployment_status', {
        uuid: 'nonexistent-uuid',
      })

      expect(result.isError).toBe(true)
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('Failed to get status')
        expect(result.content[0].text).toContain('Application not found')
      }
    })

    it('should handle unexpected errors', async () => {
      mockCoolifyGetStatus.mockRejectedValue(new Error('Connection refused'))

      vi.resetModules()
      const { coolifyServer } = await import('../coolify.js')
      const result = await coolifyServer.callTool('get_deployment_status', {
        uuid: 'app-uuid',
      })

      expect(result.isError).toBe(true)
      if (result.content[0].type === 'text') {
        expect(result.content[0].text).toContain('Error')
        expect(result.content[0].text).toContain('Connection refused')
      }
    })
  })
})
