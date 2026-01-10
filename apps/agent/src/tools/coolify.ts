/**
 * Coolify MCP Tools.
 *
 * Provides tools for Coolify deployment and management.
 */

import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { isOk, isErr } from '@mks2508/no-throw'
import { getCoolifyService } from '@mks2508/mks-bot-father'
import { createToolLogger } from '../utils/tool-logger.js'

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
        uuid: z.string().uuid('Invalid application UUID format')
          .describe('Application UUID in Coolify'),
        force: z.boolean()
          .default(false)
          .describe('Force rebuild without cache'),
        tag: z.string()
          .optional()
          .describe('Deploy specific tag/version')
      },
      async (args) => {
        const log = createToolLogger('coolify.deploy')
        const startTime = log.start({ uuid: args.uuid, force: args.force, tag: args.tag })

        // Collect progress events
        const progressEvents: Array<{ pct: number; msg: string; step?: string }> = []

        try {
          const coolify = getCoolifyService()
          const initResult = await coolify.init()

          if (isErr(initResult)) {
            log.error(startTime, initResult.error.message, { phase: 'init' })
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
            tag: args.tag,
            onProgress: (pct, msg, step) => {
              progressEvents.push({ pct, msg, step })
            }
          })

          if (isOk(result)) {
            log.success(startTime, { deploymentUuid: result.value.deploymentUuid, resourceUuid: result.value.resourceUuid })
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  deploymentUuid: result.value.deploymentUuid,
                  resourceUuid: result.value.resourceUuid,
                  message: 'Deployment started',
                  progress: progressEvents
                }, null, 2)
              }]
            }
          } else {
            log.error(startTime, result.error.message, { phase: 'deploy' })
            return {
              content: [{
                type: 'text' as const,
                text: `Deployment failed: ${result.error.message}`
              }],
              isError: true
            }
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'exception' })
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
        uuid: z.string().uuid('Invalid application UUID format')
          .describe('Application UUID'),
        envVars: z.record(z.string())
          .describe('Key-value pairs of environment variables')
      },
      async (args) => {
        const log = createToolLogger('coolify.set_env_vars')
        const startTime = log.start({ uuid: args.uuid, envVarsCount: Object.keys(args.envVars).length })

        try {
          const coolify = getCoolifyService()
          const initResult = await coolify.init()

          if (isErr(initResult)) {
            log.error(startTime, initResult.error.message, { phase: 'init' })
            return {
              content: [{
                type: 'text' as const,
                text: `Coolify not configured: ${initResult.error.message}`
              }],
              isError: true
            }
          }

          const result = await coolify.setEnvironmentVariables(args.uuid, args.envVars)

          if (isOk(result)) {
            log.success(startTime, { envVarsCount: Object.keys(args.envVars).length })
            return {
              content: [{
                type: 'text' as const,
                text: `Set ${Object.keys(args.envVars).length} environment variable(s). Use deploy tool to apply changes.`
              }]
            }
          } else {
            log.error(startTime, result.error.message, { phase: 'setEnvVars' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to set env vars: ${result.error.message}`
              }],
              isError: true
            }
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'exception' })
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
        uuid: z.string().uuid('Invalid application UUID format')
          .describe('Application UUID')
      },
      async (args) => {
        const log = createToolLogger('coolify.get_deployment_status')
        const startTime = log.start({ uuid: args.uuid })

        try {
          const coolify = getCoolifyService()
          const initResult = await coolify.init()

          if (isErr(initResult)) {
            log.error(startTime, initResult.error.message, { phase: 'init' })
            return {
              content: [{
                type: 'text' as const,
                text: `Coolify not configured: ${initResult.error.message}`
              }],
              isError: true
            }
          }

          const result = await coolify.getApplicationStatus(args.uuid)

          if (isOk(result)) {
            log.success(startTime, { status: result.value })
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify(result.value, null, 2)
              }]
            }
          } else {
            log.error(startTime, result.error.message, { phase: 'getStatus' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to get status: ${result.error.message}`
              }],
              isError: true
            }
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'exception' })
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
        const log = createToolLogger('coolify.list_applications')
        const startTime = log.start({ teamId: args.teamId, projectId: args.projectId })

        try {
          const coolify = getCoolifyService()
          const initResult = await coolify.init()

          if (isErr(initResult)) {
            log.error(startTime, initResult.error.message, { phase: 'init' })
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
            log.success(startTime, { count: result.value.length })
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
            log.error(startTime, result.error.message, { phase: 'listApplications' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to list applications: ${result.error.message}`
              }],
              isError: true
            }
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'exception' })
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
        uuid: z.string().uuid('Invalid application UUID format')
          .describe('Application UUID to delete')
      },
      async (args) => {
        const log = createToolLogger('coolify.delete_application')
        const startTime = log.start({ uuid: args.uuid })

        try {
          const coolify = getCoolifyService()
          const initResult = await coolify.init()

          if (isErr(initResult)) {
            log.error(startTime, initResult.error.message, { phase: 'init' })
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
            log.success(startTime, { deleted: true })
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
            log.error(startTime, result.error.message, { phase: 'deleteApplication' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to delete application: ${result.error.message}`
              }],
              isError: true
            }
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'exception' })
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
        uuid: z.string().uuid('Invalid application UUID format')
          .describe('Application UUID'),
        tail: z.number()
          .optional()
          .describe('Number of log lines to retrieve')
      },
      async (args) => {
        const log = createToolLogger('coolify.get_application_logs')
        const startTime = log.start({ uuid: args.uuid, tail: args.tail })

        try {
          const coolify = getCoolifyService()
          const initResult = await coolify.init()

          if (isErr(initResult)) {
            log.error(startTime, initResult.error.message, { phase: 'init' })
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
            log.success(startTime, { logCount: result.value.logs.length })
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
            log.error(startTime, result.error.message, { phase: 'getLogs' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to get logs: ${result.error.message}`
              }],
              isError: true
            }
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'exception' })
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
        uuid: z.string().uuid('Invalid application UUID format')
          .describe('Application UUID to start')
      },
      async (args) => {
        const log = createToolLogger('coolify.start_application')
        const startTime = log.start({ uuid: args.uuid })

        try {
          const coolify = getCoolifyService()
          const initResult = await coolify.init()

          if (isErr(initResult)) {
            log.error(startTime, initResult.error.message, { phase: 'init' })
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
            log.success(startTime, { status: result.value.status })
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
            log.error(startTime, result.error.message, { phase: 'startApplication' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to start application: ${result.error.message}`
              }],
              isError: true
            }
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'exception' })
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
        uuid: z.string().uuid('Invalid application UUID format')
          .describe('Application UUID to stop')
      },
      async (args) => {
        const log = createToolLogger('coolify.stop_application')
        const startTime = log.start({ uuid: args.uuid })

        try {
          const coolify = getCoolifyService()
          const initResult = await coolify.init()

          if (isErr(initResult)) {
            log.error(startTime, initResult.error.message, { phase: 'init' })
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
            log.success(startTime, { status: result.value.status })
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
            log.error(startTime, result.error.message, { phase: 'stopApplication' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to stop application: ${result.error.message}`
              }],
              isError: true
            }
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'exception' })
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
        uuid: z.string().uuid('Invalid application UUID format')
          .describe('Application UUID to restart')
      },
      async (args) => {
        const log = createToolLogger('coolify.restart_application')
        const startTime = log.start({ uuid: args.uuid })

        try {
          const coolify = getCoolifyService()
          const initResult = await coolify.init()

          if (isErr(initResult)) {
            log.error(startTime, initResult.error.message, { phase: 'init' })
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
            log.success(startTime, { status: result.value.status })
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
            log.error(startTime, result.error.message, { phase: 'restartApplication' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to restart application: ${result.error.message}`
              }],
              isError: true
            }
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'exception' })
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
        uuid: z.string().uuid('Invalid application UUID format')
          .describe('Application UUID')
      },
      async (args) => {
        const log = createToolLogger('coolify.get_deployment_history')
        const startTime = log.start({ uuid: args.uuid })

        try {
          const coolify = getCoolifyService()
          const initResult = await coolify.init()

          if (isErr(initResult)) {
            log.error(startTime, initResult.error.message, { phase: 'init' })
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
            log.success(startTime, { count: result.value.length })
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
            log.error(startTime, result.error.message, { phase: 'getDeploymentHistory' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to get deployment history: ${result.error.message}`
              }],
              isError: true
            }
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'exception' })
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
        uuid: z.string().uuid('Invalid application UUID format')
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
        const log = createToolLogger('coolify.update_application')
        const startTime = log.start({
          uuid: args.uuid,
          fields: Object.keys(args).filter(k => k !== 'uuid' && args[k as keyof typeof args] !== undefined)
        })

        try {
          const coolify = getCoolifyService()
          const initResult = await coolify.init()

          if (isErr(initResult)) {
            log.error(startTime, initResult.error.message, { phase: 'init' })
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
            log.success(startTime, { updated: true })
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
            log.error(startTime, result.error.message, { phase: 'updateApplication' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to update application: ${result.error.message}`
              }],
              isError: true
            }
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'exception' })
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
      'list_servers',
      `List all available servers in Coolify.

Returns server UUIDs, names, and IPs. Use server UUID when creating applications.`,
      {},
      async () => {
        const log = createToolLogger('coolify.list_servers')
        const startTime = log.start({})

        try {
          const coolify = getCoolifyService()
          const initResult = await coolify.init()

          if (isErr(initResult)) {
            log.error(startTime, initResult.error.message, { phase: 'init' })
            return {
              content: [{
                type: 'text' as const,
                text: `Coolify not configured: ${initResult.error.message}`
              }],
              isError: true
            }
          }

          const result = await coolify.listServers()

          if (isOk(result)) {
            log.success(startTime, { count: result.value.length })
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  count: result.value.length,
                  servers: result.value
                }, null, 2)
              }]
            }
          } else {
            log.error(startTime, result.error.message, { phase: 'listServers' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to list servers: ${result.error.message}`
              }],
              isError: true
            }
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'exception' })
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
      'get_server',
      `Get details of a specific Coolify server.

Returns server information including name, IP, status, and configuration.`,
      {
        serverUuid: z.string().uuid('Invalid server UUID format')
          .describe('Server UUID to get details for')
      },
      async (args) => {
        const log = createToolLogger('coolify.get_server')
        const startTime = log.start({ serverUuid: args.serverUuid })

        try {
          const coolify = getCoolifyService()
          const initResult = await coolify.init()

          if (isErr(initResult)) {
            log.error(startTime, initResult.error.message, { phase: 'init' })
            return {
              content: [{
                type: 'text' as const,
                text: `Coolify not configured: ${initResult.error.message}`
              }],
              isError: true
            }
          }

          const result = await coolify.getServer(args.serverUuid)

          if (isOk(result)) {
            log.success(startTime, { serverUuid: args.serverUuid, name: result.value.name })
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  server: result.value
                }, null, 2)
              }]
            }
          } else {
            log.error(startTime, result.error.message, { phase: 'getServer' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to get server: ${result.error.message}`
              }],
              isError: true
            }
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'exception' })
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
      'list_projects',
      `List all projects in Coolify.

Returns project UUIDs, names, and associated environments.`,
      {},
      async () => {
        const log = createToolLogger('coolify.list_projects')
        const startTime = log.start({})

        try {
          const coolify = getCoolifyService()
          const initResult = await coolify.init()

          if (isErr(initResult)) {
            log.error(startTime, initResult.error.message, { phase: 'init' })
            return {
              content: [{
                type: 'text' as const,
                text: `Coolify not configured: ${initResult.error.message}`
              }],
              isError: true
            }
          }

          const result = await coolify.listProjects()

          if (isOk(result)) {
            log.success(startTime, { count: result.value.length })
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  count: result.value.length,
                  projects: result.value
                }, null, 2)
              }]
            }
          } else {
            log.error(startTime, result.error.message, { phase: 'listProjects' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to list projects: ${result.error.message}`
              }],
              isError: true
            }
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'exception' })
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
      'list_teams',
      `List all teams in Coolify.

Returns team IDs, names, and configuration.`,
      {},
      async () => {
        const log = createToolLogger('coolify.list_teams')
        const startTime = log.start({})

        try {
          const coolify = getCoolifyService()
          const initResult = await coolify.init()

          if (isErr(initResult)) {
            log.error(startTime, initResult.error.message, { phase: 'init' })
            return {
              content: [{
                type: 'text' as const,
                text: `Coolify not configured: ${initResult.error.message}`
              }],
              isError: true
            }
          }

          const result = await coolify.listTeams()

          if (isOk(result)) {
            log.success(startTime, { count: result.value.length })
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  count: result.value.length,
                  teams: result.value
                }, null, 2)
              }]
            }
          } else {
            log.error(startTime, result.error.message, { phase: 'listTeams' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to list teams: ${result.error.message}`
              }],
              isError: true
            }
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'exception' })
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
      'get_server_destinations',
      `Get available destinations for a Coolify server.

Returns destination UUIDs needed when creating applications.
Each destination represents a Docker network/environment on the server.`,
      {
        serverUuid: z.string().uuid('Invalid server UUID format')
          .describe('Server UUID to get destinations for')
      },
      async (args) => {
        const log = createToolLogger('coolify.get_server_destinations')
        const startTime = log.start({ serverUuid: args.serverUuid })

        try {
          const coolify = getCoolifyService()
          const initResult = await coolify.init()

          if (isErr(initResult)) {
            log.error(startTime, initResult.error.message, { phase: 'init' })
            return {
              content: [{
                type: 'text' as const,
                text: `Coolify not configured: ${initResult.error.message}`
              }],
              isError: true
            }
          }

          const result = await coolify.getServerDestinations(args.serverUuid)

          if (isOk(result)) {
            log.success(startTime, { count: result.value.length })
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  serverUuid: args.serverUuid,
                  count: result.value.length,
                  destinations: result.value
                }, null, 2)
              }]
            }
          } else {
            log.error(startTime, result.error.message, { phase: 'getServerDestinations' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to get destinations: ${result.error.message}`
              }],
              isError: true
            }
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'exception' })
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
      'create_application',
      `Create a new application in Coolify from a GitHub repository.

Requires server UUID and destination UUID (get them from list_servers and get_server_destinations).
The GitHub repository must be accessible via the configured GitHub App.`,
      {
        name: z.string()
          .describe('Application name'),
        serverUuid: z.string().uuid('Invalid server UUID format')
          .describe('Server UUID to deploy to'),
        destinationUuid: z.string().uuid('Invalid destination UUID format')
          .describe('Destination UUID (Docker network)'),
        githubRepoUrl: z.string()
          .describe('GitHub repository URL (e.g., https://github.com/user/repo)'),
        description: z.string()
          .optional()
          .describe('Application description'),
        branch: z.string()
          .default('main')
          .describe('Git branch to deploy'),
        buildPack: z.enum(['dockerfile', 'nixpacks', 'static'])
          .default('nixpacks')
          .describe('Build pack type')
      },
      async (args) => {
        const log = createToolLogger('coolify.create_application')
        const startTime = log.start({
          name: args.name,
          serverUuid: args.serverUuid,
          destinationUuid: args.destinationUuid,
          repoUrl: args.githubRepoUrl,
          branch: args.branch,
          buildPack: args.buildPack
        })

        try {
          const coolify = getCoolifyService()
          const initResult = await coolify.init()

          if (isErr(initResult)) {
            log.error(startTime, initResult.error.message, { phase: 'init' })
            return {
              content: [{
                type: 'text' as const,
                text: `Coolify not configured: ${initResult.error.message}`
              }],
              isError: true
            }
          }

          const result = await coolify.createApplication({
            name: args.name,
            description: args.description,
            serverUuid: args.serverUuid,
            destinationUuid: args.destinationUuid,
            githubRepoUrl: args.githubRepoUrl,
            branch: args.branch || 'main',
            buildPack: args.buildPack || 'nixpacks'
          })

          if (isOk(result)) {
            log.success(startTime, { uuid: result.value.uuid })
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  message: `Application "${args.name}" created successfully`,
                  uuid: result.value.uuid,
                  nextSteps: [
                    'Use set_env_vars to configure environment variables',
                    'Use deploy to start the first deployment'
                  ]
                }, null, 2)
              }]
            }
          } else {
            log.error(startTime, result.error.message, { phase: 'createApplication' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to create application: ${result.error.message}`
              }],
              isError: true
            }
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'exception' })
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
