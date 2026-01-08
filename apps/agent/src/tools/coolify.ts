/**
 * Coolify MCP Tools.
 *
 * Provides tools for Coolify deployment and management.
 */

import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { isOk, isErr } from '@mks2508/no-throw'
import { getCoolifyService } from '@mks2508/mks-bot-father'

export const coolifyServer = createSdkMcpServer({
  name: 'coolify',
  version: '1.0.0',
  tools: [
    tool(
      'deploy',
      `Deploy or redeploy an application to Coolify.

Triggers a new deployment for the specified application UUID.
Can force rebuild without cache if needed.`,
      {
        uuid: z.string()
          .describe('Application UUID in Coolify'),
        force: z.boolean()
          .default(false)
          .describe('Force rebuild without cache'),
        tag: z.string()
          .optional()
          .describe('Deploy specific tag/version')
      },
      async (args) => {
        try {
          const coolify = getCoolifyService()
          const initResult = await coolify.init()

          if (isErr(initResult)) {
            return {
              content: [{
                type: 'text' as const,
                text: `Coolify not configured: ${initResult.error.message}`
              }],
              isError: true
            }
          }

          const result = await coolify.deploy({
            uuid: args.uuid,
            force: args.force,
            tag: args.tag
          })

          if (isOk(result)) {
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  deploymentUuid: result.value.deploymentUuid,
                  resourceUuid: result.value.resourceUuid,
                  message: 'Deployment started'
                }, null, 2)
              }]
            }
          } else {
            return {
              content: [{
                type: 'text' as const,
                text: `Deployment failed: ${result.error.message}`
              }],
              isError: true
            }
          }
        } catch (error) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'set_env_vars',
      `Set environment variables for a Coolify application.

Updates or adds environment variables. Existing vars not in the
input are preserved. Redeploy after setting to apply changes.`,
      {
        uuid: z.string()
          .describe('Application UUID'),
        envVars: z.record(z.string())
          .describe('Key-value pairs of environment variables')
      },
      async (args) => {
        try {
          const coolify = getCoolifyService()
          await coolify.init()

          const result = await coolify.setEnvironmentVariables(args.uuid, args.envVars)

          if (isOk(result)) {
            return {
              content: [{
                type: 'text' as const,
                text: `Set ${Object.keys(args.envVars).length} environment variable(s). Use deploy tool to apply changes.`
              }]
            }
          } else {
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to set env vars: ${result.error.message}`
              }],
              isError: true
            }
          }
        } catch (error) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'get_deployment_status',
      `Get the current status of a Coolify application.

Returns deployment state, health status, and resource usage.`,
      {
        uuid: z.string()
          .describe('Application UUID')
      },
      async (args) => {
        try {
          const coolify = getCoolifyService()
          await coolify.init()

          const result = await coolify.getApplicationStatus(args.uuid)

          if (isOk(result)) {
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify(result.value, null, 2)
              }]
            }
          } else {
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to get status: ${result.error.message}`
              }],
              isError: true
            }
          }
        } catch (error) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          }
        }
      }
    )
  ]
})
