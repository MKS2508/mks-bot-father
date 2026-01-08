/**
 * Code Executor MCP Tools.
 *
 * Provides tools for executing code, running tests, and managing projects.
 */

import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { exec } from 'child_process'
import { promisify } from 'util'
import { readdir } from 'fs/promises'

const execAsync = promisify(exec)

const BLOCKED_COMMANDS = [
  'rm -rf /',
  'rm -rf /*',
  'mkfs',
  'dd if=',
  ':(){',
  'fork bomb',
  '> /dev/sda',
  'chmod -R 777 /',
  'curl | sh',
  'wget | sh'
]

function isCommandSafe(command: string): boolean {
  const lowerCmd = command.toLowerCase()
  return !BLOCKED_COMMANDS.some(blocked => lowerCmd.includes(blocked.toLowerCase()))
}

export const codeExecutorServer = createSdkMcpServer({
  name: 'code-executor',
  version: '1.0.0',
  tools: [
    tool(
      'execute_command',
      `Execute a shell command in a repository directory.

SAFETY: Dangerous commands are blocked. The command runs with
a timeout of 5 minutes by default.

Common uses:
- Run build commands (bun build, npm run build)
- Run scripts (bun run dev, npm start)
- Git operations (git status, git log)
- Package management (bun install, npm install)`,
      {
        repoPath: z.string()
          .describe('Path to the repository'),
        command: z.string()
          .describe('Shell command to execute'),
        timeout: z.number()
          .default(300000)
          .describe('Timeout in milliseconds (default 5 min)')
      },
      async (args) => {
        if (!isCommandSafe(args.command)) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Command blocked for security reasons'
            }],
            isError: true
          }
        }

        try {
          const { stdout, stderr } = await execAsync(
            `cd "${args.repoPath}" && ${args.command}`,
            {
              timeout: args.timeout,
              maxBuffer: 10 * 1024 * 1024
            }
          )

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                stdout: stdout.slice(0, 50000),
                stderr: stderr.slice(0, 10000),
                command: args.command
              }, null, 2)
            }]
          }
        } catch (error: unknown) {
          const execError = error as { message?: string; stdout?: string; stderr?: string; code?: number }
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: execError.message || String(error),
                stdout: execError.stdout?.slice(0, 50000) || '',
                stderr: execError.stderr?.slice(0, 10000) || '',
                exitCode: execError.code
              }, null, 2)
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'run_tests',
      `Run the test suite for a repository.

Automatically detects the test runner (bun test, npm test, etc.)
based on package.json scripts.`,
      {
        repoPath: z.string()
          .describe('Path to the repository'),
        testPattern: z.string()
          .optional()
          .describe('Specific test file pattern to run'),
        watch: z.boolean()
          .default(false)
          .describe('Run in watch mode')
      },
      async (args) => {
        try {
          const { stdout: pkgJson } = await execAsync(
            `cat "${args.repoPath}/package.json"`,
            { timeout: 5000 }
          )
          const pkg = JSON.parse(pkgJson)

          let testCmd = 'bun test'
          if (pkg.scripts?.test) {
            testCmd = 'bun run test'
          }

          if (args.testPattern) {
            testCmd += ` ${args.testPattern}`
          }
          if (args.watch) {
            testCmd += ' --watch'
          }

          const { stdout, stderr } = await execAsync(
            `cd "${args.repoPath}" && ${testCmd}`,
            { timeout: 600000 }
          )

          const passed = (stdout.match(/pass/gi) || []).length
          const failed = (stdout.match(/fail/gi) || []).length

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: failed === 0,
                summary: {
                  passed,
                  failed,
                  total: passed + failed
                },
                output: stdout.slice(0, 30000),
                errors: stderr.slice(0, 5000)
              }, null, 2)
            }]
          }
        } catch (error: unknown) {
          const execError = error as { message?: string; stdout?: string; stderr?: string }
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: execError.message || String(error),
                output: execError.stdout?.slice(0, 30000) || '',
                errors: execError.stderr?.slice(0, 5000) || ''
              }, null, 2)
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'install_dependencies',
      `Install project dependencies using the detected package manager.

Detects bun.lock, package-lock.json, yarn.lock, or pnpm-lock.yaml
to determine the correct package manager.`,
      {
        repoPath: z.string()
          .describe('Path to the repository'),
        packageManager: z.enum(['auto', 'bun', 'npm', 'yarn', 'pnpm'])
          .default('auto')
          .describe('Package manager to use (auto-detects by default)')
      },
      async (args) => {
        try {
          let pm = args.packageManager

          if (pm === 'auto') {
            const files = await readdir(args.repoPath)
            if (files.includes('bun.lock') || files.includes('bun.lockb')) {
              pm = 'bun'
            } else if (files.includes('yarn.lock')) {
              pm = 'yarn'
            } else if (files.includes('pnpm-lock.yaml')) {
              pm = 'pnpm'
            } else {
              pm = 'npm'
            }
          }

          const installCmd = pm === 'npm' ? 'npm install' : `${pm} install`

          const { stdout } = await execAsync(
            `cd "${args.repoPath}" && ${installCmd}`,
            { timeout: 300000 }
          )

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                packageManager: pm,
                output: stdout.slice(0, 20000)
              }, null, 2)
            }]
          }
        } catch (error: unknown) {
          const execError = error as { message?: string; stderr?: string }
          return {
            content: [{
              type: 'text' as const,
              text: `Install failed: ${execError.message || String(error)}\n${execError.stderr || ''}`
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'build_project',
      `Build the project using the build script from package.json.

Runs 'bun run build' or 'npm run build' depending on the package manager.`,
      {
        repoPath: z.string()
          .describe('Path to the repository')
      },
      async (args) => {
        try {
          const files = await readdir(args.repoPath)
          const useBun = files.includes('bun.lock') || files.includes('bun.lockb')
          const buildCmd = useBun ? 'bun run build' : 'npm run build'

          const { stdout, stderr } = await execAsync(
            `cd "${args.repoPath}" && ${buildCmd}`,
            { timeout: 600000 }
          )

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                output: stdout.slice(0, 30000),
                warnings: stderr.slice(0, 5000)
              }, null, 2)
            }]
          }
        } catch (error: unknown) {
          const execError = error as { message?: string; stdout?: string; stderr?: string }
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: execError.message || String(error),
                output: execError.stdout?.slice(0, 30000) || '',
                errors: execError.stderr?.slice(0, 10000) || ''
              }, null, 2)
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'lint_project',
      `Run linting on the project.

Detects and runs eslint, oxlint, or the lint script from package.json.
Optionally auto-fixes issues.`,
      {
        repoPath: z.string()
          .describe('Path to the repository'),
        fix: z.boolean()
          .default(false)
          .describe('Auto-fix fixable issues')
      },
      async (args) => {
        try {
          const fixFlag = args.fix ? ' --fix' : ''
          const lintCmd = `bun run lint${fixFlag}`

          const { stdout } = await execAsync(
            `cd "${args.repoPath}" && ${lintCmd}`,
            { timeout: 120000 }
          )

          const errorCount = (stdout.match(/error/gi) || []).length
          const warningCount = (stdout.match(/warning/gi) || []).length

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: errorCount === 0,
                summary: {
                  errors: errorCount,
                  warnings: warningCount
                },
                output: stdout.slice(0, 20000)
              }, null, 2)
            }]
          }
        } catch (error: unknown) {
          const execError = error as { message?: string; stdout?: string }
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: execError.message || String(error),
                output: execError.stdout?.slice(0, 20000) || ''
              }, null, 2)
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'type_check',
      `Run TypeScript type checking on the project.

Uses tsc --noEmit or tsgo --noEmit to check for type errors
without generating output files.`,
      {
        repoPath: z.string()
          .describe('Path to the repository')
      },
      async (args) => {
        try {
          const checkCmd = 'bun run typecheck 2>&1 || npx tsc --noEmit 2>&1'

          const { stdout, stderr } = await execAsync(
            `cd "${args.repoPath}" && ${checkCmd}`,
            { timeout: 300000 }
          )

          const output = stdout + stderr
          const errorCount = (output.match(/error TS\d+/gi) || []).length

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: errorCount === 0,
                errorCount,
                output: output.slice(0, 30000)
              }, null, 2)
            }]
          }
        } catch (error: unknown) {
          const execError = error as { stdout?: string; stderr?: string }
          const output = (execError.stdout || '') + (execError.stderr || '')
          const errorCount = (output.match(/error TS\d+/gi) || []).length

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                errorCount,
                output: output.slice(0, 30000)
              }, null, 2)
            }],
            isError: errorCount > 0
          }
        }
      }
    ),

    tool(
      'get_project_structure',
      `Get the file structure of a project.

Returns a tree view of the project files, excluding node_modules,
.git, and other common ignore patterns.`,
      {
        repoPath: z.string()
          .describe('Path to the repository'),
        maxDepth: z.number()
          .default(4)
          .describe('Maximum directory depth to traverse')
      },
      async (args) => {
        try {
          const { stdout } = await execAsync(
            `cd "${args.repoPath}" && find . -maxdepth ${args.maxDepth} -type f -o -type d | grep -v node_modules | grep -v .git | grep -v dist | sort`,
            { timeout: 30000 }
          )

          return {
            content: [{
              type: 'text' as const,
              text: stdout.slice(0, 30000)
            }]
          }
        } catch (error: unknown) {
          const execError = error as { message?: string }
          return {
            content: [{
              type: 'text' as const,
              text: `Failed to get structure: ${execError.message || String(error)}`
            }],
            isError: true
          }
        }
      }
    )
  ]
})
