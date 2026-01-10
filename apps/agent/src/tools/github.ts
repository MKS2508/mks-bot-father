/**
 * GitHub MCP Tools.
 *
 * Provides tools for GitHub operations via gh CLI and GitHub API.
 */

import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { isOk, isErr } from '@mks2508/no-throw'
import { getGitHubService } from '@mks2508/mks-bot-father'
import { exec } from 'child_process'
import { promisify } from 'util'
import { createToolLogger } from '../utils/tool-logger.js'

const execAsync = promisify(exec)

export const githubServer = createSdkMcpServer({
  name: 'github',
  version: '1.0.0',
  tools: [
    tool(
      'create_repo',
      `Create a new GitHub repository.

Can create from scratch or from a template repository.
Supports both personal repos and organization repos.`,
      {
        name: z.string()
          .min(1)
          .max(100)
          .describe('Repository name'),
        description: z.string()
          .max(350)
          .optional()
          .describe('Repository description'),
        private: z.boolean()
          .default(false)
          .describe('Make repository private'),
        org: z.string()
          .optional()
          .describe('Organization name (omit for personal repo)'),
        templateOwner: z.string()
          .optional()
          .describe('Template repo owner (for creating from template)'),
        templateRepo: z.string()
          .optional()
          .describe('Template repo name')
      },
      async (args) => {
        const log = createToolLogger('github.create_repo')
        const startTime = log.start({
          name: args.name,
          private: args.private,
          org: args.org,
          hasTemplate: !!(args.templateOwner && args.templateRepo)
        })
        const progressEvents: Array<{ pct: number; msg: string; step?: string }> = []

        try {
          const github = getGitHubService()
          const initResult = await github.init()

          if (isErr(initResult)) {
            log.error(startTime, initResult.error.message, { phase: 'init' })
            return {
              content: [{
                type: 'text' as const,
                text: `GitHub init failed: ${initResult.error.message}`
              }],
              isError: true
            }
          }

          const result = await github.createRepo({
            name: args.name,
            description: args.description,
            private: args.private,
            owner: args.org,
            templateOwner: args.templateOwner,
            templateRepo: args.templateRepo
          }, (pct, msg, step) => {
            progressEvents.push({ pct, msg, step })
          })

          if (isOk(result)) {
            log.success(startTime, {
              repoUrl: result.value.repoUrl,
              cloneUrl: result.value.cloneUrl,
              progressSteps: progressEvents.length
            })
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  repoUrl: result.value.repoUrl,
                  cloneUrl: result.value.cloneUrl,
                  progress: progressEvents
                }, null, 2)
              }]
            }
          } else {
            log.error(startTime, result.error.message, { phase: 'create' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to create repo: ${result.error.message}`
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
      'clone_repo',
      `Clone a GitHub repository to the local workspace.

Clones to apps/agent/workspaces/{repo-name} by default.
Uses gh CLI for authentication.`,
      {
        repoUrl: z.string()
          .describe('Repository URL or owner/repo format'),
        targetDir: z.string()
          .optional()
          .describe('Target directory name (defaults to repo name)')
      },
      async (args) => {
        const log = createToolLogger('github.clone_repo')
        const startTime = log.start({
          repoUrl: args.repoUrl,
          targetDir: args.targetDir
        })

        try {
          const repoName = args.repoUrl.split('/').pop()?.replace('.git', '') || 'repo'
          const targetDir = args.targetDir || repoName
          const fullPath = `${process.cwd()}/workspaces/${targetDir}`

          const { stdout } = await execAsync(
            `gh repo clone ${args.repoUrl} ${fullPath}`,
            { timeout: 60000 }
          )

          log.success(startTime, {
            path: fullPath,
            repoName
          })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                path: fullPath,
                output: stdout || 'Cloned successfully'
              }, null, 2)
            }]
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'clone' })
          return {
            content: [{
              type: 'text' as const,
              text: `Clone failed: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'create_pr',
      `Create a pull request in a GitHub repository.

Must be run from within a git repository directory.
Commits and pushes changes before creating the PR.`,
      {
        repoPath: z.string()
          .describe('Path to the local repository'),
        title: z.string()
          .describe('PR title'),
        body: z.string()
          .describe('PR description (markdown supported)'),
        branch: z.string()
          .optional()
          .describe('Source branch (defaults to current branch)'),
        baseBranch: z.string()
          .default('main')
          .describe('Target branch to merge into'),
        draft: z.boolean()
          .default(false)
          .describe('Create as draft PR')
      },
      async (args) => {
        const log = createToolLogger('github.create_pr')
        const startTime = log.start({
          repoPath: args.repoPath,
          title: args.title,
          baseBranch: args.baseBranch,
          draft: args.draft
        })

        try {
          const draftFlag = args.draft ? '--draft' : ''
          const branchFlag = args.branch ? `--head ${args.branch}` : ''

          const escapedBody = args.body.replace(/"/g, '\\"')
          const { stdout } = await execAsync(
            `cd "${args.repoPath}" && gh pr create --title "${args.title}" --body "${escapedBody}" --base ${args.baseBranch} ${branchFlag} ${draftFlag}`,
            { timeout: 30000 }
          )

          const prUrl = stdout.trim()

          log.success(startTime, {
            prUrl,
            title: args.title,
            baseBranch: args.baseBranch
          })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                prUrl,
                title: args.title
              }, null, 2)
            }]
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'create_pr' })
          return {
            content: [{
              type: 'text' as const,
              text: `PR creation failed: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'commit_and_push',
      `Stage all changes, commit, and push to remote.

Creates a new branch if specified, otherwise pushes to current branch.`,
      {
        repoPath: z.string()
          .describe('Path to the local repository'),
        message: z.string()
          .describe('Commit message'),
        newBranch: z.string()
          .optional()
          .describe('Create and switch to new branch before committing')
      },
      async (args) => {
        const log = createToolLogger('github.commit_and_push')
        const startTime = log.start({
          repoPath: args.repoPath,
          newBranch: args.newBranch,
          messageLength: args.message.length
        })

        try {
          const commands = [`cd "${args.repoPath}"`]

          if (args.newBranch) {
            commands.push(`git checkout -b ${args.newBranch}`)
          }

          const escapedMessage = args.message.replace(/"/g, '\\"')
          commands.push(
            'git add -A',
            `git commit -m "${escapedMessage}"`,
            'git push -u origin HEAD'
          )

          const { stdout } = await execAsync(
            commands.join(' && '),
            { timeout: 60000 }
          )

          log.success(startTime, {
            branch: args.newBranch || 'current',
            messageLength: args.message.length
          })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                message: args.message,
                branch: args.newBranch || 'current',
                output: stdout
              }, null, 2)
            }]
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'commit_push' })
          return {
            content: [{
              type: 'text' as const,
              text: `Commit/push failed: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'get_repo_info',
      `Get information about a GitHub repository.

Returns repo details, default branch, open issues/PRs count, etc.`,
      {
        repo: z.string()
          .describe('Repository in owner/repo format')
      },
      async (args) => {
        const log = createToolLogger('github.get_repo_info')
        const startTime = log.start({ repo: args.repo })

        try {
          const { stdout } = await execAsync(
            `gh repo view ${args.repo} --json name,description,url,defaultBranchRef,isPrivate,issues,pullRequests`,
            { timeout: 15000 }
          )

          log.success(startTime, { repo: args.repo })
          return {
            content: [{
              type: 'text' as const,
              text: stdout
            }]
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'get_info' })
          return {
            content: [{
              type: 'text' as const,
              text: `Failed to get repo info: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'get_authenticated_user',
      `Get the currently authenticated GitHub username.

Useful for determining the default repository owner before creating repos.`,
      {
        empty: z.object({}).describe('No parameters required')
      },
      async (args) => {
        const log = createToolLogger('github.get_authenticated_user')
        const startTime = log.start({})

        try {
          const github = getGitHubService()
          const initResult = await github.init()

          if (isErr(initResult)) {
            log.error(startTime, initResult.error.message, { phase: 'init' })
            return {
              content: [{
                type: 'text' as const,
                text: `GitHub init failed: ${initResult.error.message}`
              }],
              isError: true
            }
          }

          const result = await github.getAuthenticatedUser()

          if (isOk(result)) {
            log.success(startTime, { username: result.value })
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  username: result.value
                }, null, 2)
              }]
            }
          } else {
            log.error(startTime, result.error.message, { phase: 'get_user' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to get authenticated user: ${result.error.message}`
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
      'is_organization',
      `Check if a GitHub account name is an organization.

Returns true if the name belongs to an organization, false if it's a personal account.`,
      {
        name: z.string()
          .describe('Account name to check')
      },
      async (args) => {
        const log = createToolLogger('github.is_organization')
        const startTime = log.start({ name: args.name })

        try {
          const github = getGitHubService()
          const initResult = await github.init()

          if (isErr(initResult)) {
            log.error(startTime, initResult.error.message, { phase: 'init' })
            return {
              content: [{
                type: 'text' as const,
                text: `GitHub init failed: ${initResult.error.message}`
              }],
              isError: true
            }
          }

          const result = await github.isOrganization(args.name)

          if (isOk(result)) {
            log.success(startTime, { name: args.name, isOrganization: result.value })
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  name: args.name,
                  isOrganization: result.value
                }, null, 2)
              }]
            }
          } else {
            log.error(startTime, result.error.message, { phase: 'check' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to check organization: ${result.error.message}`
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
      'repo_exists',
      `Check if a GitHub repository exists.

Useful for validating before creating or cloning repositories.`,
      {
        owner: z.string()
          .describe('Repository owner'),
        repo: z.string()
          .describe('Repository name')
      },
      async (args) => {
        const log = createToolLogger('github.repo_exists')
        const startTime = log.start({ owner: args.owner, repo: args.repo })

        try {
          const github = getGitHubService()
          const initResult = await github.init()

          if (isErr(initResult)) {
            log.error(startTime, initResult.error.message, { phase: 'init' })
            return {
              content: [{
                type: 'text' as const,
                text: `GitHub init failed: ${initResult.error.message}`
              }],
              isError: true
            }
          }

          const result = await github.repoExists(args.owner, args.repo)

          if (isOk(result)) {
            log.success(startTime, {
              repo: `${args.owner}/${args.repo}`,
              exists: result.value
            })
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  repo: `${args.owner}/${args.repo}`,
                  exists: result.value
                }, null, 2)
              }]
            }
          } else {
            log.error(startTime, result.error.message, { phase: 'check' })
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to check repo existence: ${result.error.message}`
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
