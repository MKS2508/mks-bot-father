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
})
