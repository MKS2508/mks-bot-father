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
        try {
          const github = getGitHubService()
          const initResult = await github.init()

          if (isErr(initResult)) {
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
          })

          if (isOk(result)) {
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  success: true,
                  repoUrl: result.value.repoUrl,
                  cloneUrl: result.value.cloneUrl
                }, null, 2)
              }]
            }
          } else {
            return {
              content: [{
                type: 'text' as const,
                text: `Failed to create repo: ${result.error.message}`
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
        try {
          const repoName = args.repoUrl.split('/').pop()?.replace('.git', '') || 'repo'
          const targetDir = args.targetDir || repoName
          const fullPath = `${process.cwd()}/workspaces/${targetDir}`

          const { stdout } = await execAsync(
            `gh repo clone ${args.repoUrl} ${fullPath}`,
            { timeout: 60000 }
          )

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
        try {
          const draftFlag = args.draft ? '--draft' : ''
          const branchFlag = args.branch ? `--head ${args.branch}` : ''

          const escapedBody = args.body.replace(/"/g, '\\"')
          const { stdout } = await execAsync(
            `cd "${args.repoPath}" && gh pr create --title "${args.title}" --body "${escapedBody}" --base ${args.baseBranch} ${branchFlag} ${draftFlag}`,
            { timeout: 30000 }
          )

          const prUrl = stdout.trim()

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
        try {
          const { stdout } = await execAsync(
            `gh repo view ${args.repo} --json name,description,url,defaultBranchRef,isPrivate,issues,pullRequests`,
            { timeout: 15000 }
          )

          return {
            content: [{
              type: 'text' as const,
              text: stdout
            }]
          }
        } catch (error) {
          return {
            content: [{
              type: 'text' as const,
              text: `Failed to get repo info: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          }
        }
      }
    )
  ]
})
