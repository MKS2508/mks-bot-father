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
    ),

    tool(
      'list_applications',
      `List all applications in Coolify.

Optionally filter by team or project ID.`,
      {
        teamId: z.string()
          .optional()
          .describe('Filter by Team ID'),
        projectId: z.string()
          .optional()
          .describe('Filter by Project ID')
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

          const result = await coolify.listApplications(args.teamId, args.projectId)

          if (isOk(result)) {
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  count: result.value.length,
                  applications: result.value
                }, null, 2)
              }]
            }
          } else {
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to list applications: ${result.error.message}`
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
      'delete_application',
      `Delete an application from Coolify.

WARNING: This action is irreversible. All deployments, environment
variables, domains, and history will be permanently deleted.`,
      {
        uuid: z.string()
          .describe('Application UUID to delete')
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

          const result = await coolify.deleteApplication(args.uuid)

          if (isOk(result)) {
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  message: `Application ${args.uuid} deleted successfully`
                }, null, 2)
              }]
            }
          } else {
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to delete application: ${result.error.message}`
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
      'get_application_logs',
      `Get logs for a Coolify application.

Retrieve recent logs with optional tail limit.`,
      {
        uuid: z.string()
          .describe('Application UUID'),
        tail: z.number()
          .optional()
          .describe('Number of log lines to retrieve')
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

          const result = await coolify.getApplicationLogs(args.uuid, {
            tail: args.tail
          })

          if (isOk(result)) {
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  timestamp: result.value.timestamp,
                  logCount: result.value.logs.length,
                  logs: result.value.logs
                }, null, 2)
              }]
            }
          } else {
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to get logs: ${result.error.message}`
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
      'start_application',
      `Start a stopped Coolify application.

Use this to start applications that were previously stopped.`,
      {
        uuid: z.string()
          .describe('Application UUID to start')
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

          const result = await coolify.startApplication(args.uuid)

          if (isOk(result)) {
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  message: `Application ${args.uuid} started`,
                  application: result.value
                }, null, 2)
              }]
            }
          } else {
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to start application: ${result.error.message}`
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
      'stop_application',
      `Stop a running Coolify application.

WARNING: This will make the application temporarily unavailable.
Containers will be stopped but not deleted.`,
      {
        uuid: z.string()
          .describe('Application UUID to stop')
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

          const result = await coolify.stopApplication(args.uuid)

          if (isOk(result)) {
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  message: `Application ${args.uuid} stopped`,
                  application: result.value
                }, null, 2)
              }]
            }
          } else {
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to stop application: ${result.error.message}`
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
      'restart_application',
      `Restart a Coolify application.

Equivalent to stopping and then starting the application.
Useful to apply configuration changes or recover from errors.`,
      {
        uuid: z.string()
          .describe('Application UUID to restart')
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

          const result = await coolify.restartApplication(args.uuid)

          if (isOk(result)) {
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  message: `Application ${args.uuid} restarted`,
                  application: result.value
                }, null, 2)
              }]
            }
          } else {
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to restart application: ${result.error.message}`
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
      'get_deployment_history',
      `Get deployment history for a Coolify application.

Returns list of all deployments with status, timestamps, and commit info.`,
      {
        uuid: z.string()
          .describe('Application UUID')
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

          const result = await coolify.getApplicationDeploymentHistory(args.uuid)

          if (isOk(result)) {
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  count: result.value.length,
                  deployments: result.value
                }, null, 2)
              }]
            }
          } else {
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to get deployment history: ${result.error.message}`
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
      'update_application',
      `Update configuration for a Coolify application.

Can modify name, description, build settings, and commands.
Redeploy after updating to apply changes.`,
      {
        uuid: z.string()
          .describe('Application UUID'),
        name: z.string()
          .optional()
          .describe('New application name'),
        description: z.string()
          .optional()
          .describe('New description'),
        buildPack: z.enum(['dockerfile', 'nixpacks', 'static'])
          .optional()
          .describe('Build pack type'),
        gitBranch: z.string()
          .optional()
          .describe('Git branch to deploy'),
        portsExposes: z.string()
          .optional()
          .describe('Ports to expose (comma-separated)'),
        installCommand: z.string()
          .optional()
          .describe('Install command (nixpacks)'),
        buildCommand: z.string()
          .optional()
          .describe('Build command'),
        startCommand: z.string()
          .optional()
          .describe('Start command')
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

          const result = await coolify.updateApplication(args.uuid, {
            name: args.name,
            description: args.description,
            buildPack: args.buildPack,
            gitBranch: args.gitBranch,
            portsExposes: args.portsExposes,
            installCommand: args.installCommand,
            buildCommand: args.buildCommand,
            startCommand: args.startCommand
          })

          if (isOk(result)) {
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  message: `Application ${args.uuid} updated. Use deploy tool to apply changes.`,
                  application: result.value
                }, null, 2)
              }]
            }
          } else {
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to update application: ${result.error.message}`
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
