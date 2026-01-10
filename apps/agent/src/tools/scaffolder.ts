/**
 * Scaffolder MCP Tools.
 *
 * Provides tools for scaffolding projects using bunspace templates
 * and validating them with the full build pipeline.
 */

import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { exec } from 'child_process'
import { promisify } from 'util'
import { readdir, readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { createToolLogger } from '../utils/tool-logger.js'

const execAsync = promisify(exec)

const VALID_TEMPLATES = ['monorepo', 'telegram-bot', 'fumadocs'] as const

interface IValidationStepResult {
  success: boolean
  duration_ms: number
  output?: string
  errorCount?: number
  warningCount?: number
  fixedCount?: number
}

export const scaffolderServer = createSdkMcpServer({
  name: 'scaffolder',
  version: '1.0.0',
  tools: [
    tool(
      'scaffold_project',
      `Scaffold a new project using bunspace templates.

Available templates:
- monorepo: Bun workspace monorepo with TypeScript, oxlint, prettier
- telegram-bot: Telegram bot with Telegraf, Docker-ready, env management
- fumadocs: Documentation site with Next.js + MDX, bilingual support

The project is created in ./workspaces/{name} by default.
After scaffolding, use validate_project to ensure everything compiles.`,
      {
        name: z.string()
          .min(1)
          .max(100)
          .regex(/^[a-z0-9-]+$/, 'Project name must be lowercase alphanumeric with dashes')
          .describe('Project name (lowercase, alphanumeric, dashes only)'),
        template: z.enum(VALID_TEMPLATES)
          .describe('Template type: monorepo | telegram-bot | fumadocs'),
        scope: z.string()
          .optional()
          .describe('npm scope (e.g., my-org) without @ prefix'),
        description: z.string()
          .max(500)
          .optional()
          .describe('Project description'),
        author: z.string()
          .optional()
          .describe('Author name'),
        targetDir: z.string()
          .optional()
          .describe('Target directory (default: ./workspaces/{name})'),
        skipGit: z.boolean()
          .default(false)
          .describe('Skip git initialization'),
        skipInstall: z.boolean()
          .default(false)
          .describe('Skip bun install after scaffolding')
      },
      async (args) => {
        const log = createToolLogger('scaffolder.scaffold_project')
        const startTime = log.start({
          name: args.name,
          template: args.template,
          scope: args.scope,
          skipGit: args.skipGit,
          skipInstall: args.skipInstall
        })

        try {
          const targetDir = args.targetDir || join(process.cwd(), 'workspaces', args.name)
          const parentDir = args.targetDir
            ? args.targetDir.replace(new RegExp(`/${args.name}$`), '')
            : join(process.cwd(), 'workspaces')

          if (existsSync(targetDir)) {
            const entries = await readdir(targetDir)
            if (entries.length > 0) {
              log.error(startTime, 'Directory not empty', { targetDir })
              return {
                content: [{
                  type: 'text' as const,
                  text: JSON.stringify({
                    success: false,
                    error: `Directory ${targetDir} already exists and is not empty`
                  }, null, 2)
                }],
                isError: true
              }
            }
          }

          await mkdir(parentDir, { recursive: true })

          const cmdParts = [
            'bunx create bunspace@latest',
            args.name,
            `--template ${args.template}`,
            '--yes'
          ]

          if (args.skipGit) {
            cmdParts.push('--no-git')
          }
          if (args.skipInstall) {
            cmdParts.push('--no-install')
          }

          const { stdout, stderr } = await execAsync(
            cmdParts.join(' '),
            {
              cwd: parentDir,
              timeout: 300000,
              maxBuffer: 10 * 1024 * 1024
            }
          )

          if (!existsSync(join(targetDir, 'package.json'))) {
            log.error(startTime, 'package.json not found after scaffold', { targetDir })
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  success: false,
                  error: 'Scaffolding completed but package.json not found',
                  stdout: stdout.slice(0, 5000),
                  stderr: stderr.slice(0, 2000)
                }, null, 2)
              }],
              isError: true
            }
          }

          const entries = await readdir(targetDir)

          log.success(startTime, {
            projectPath: targetDir,
            template: args.template,
            filesCreated: entries.length
          })

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                projectPath: targetDir,
                template: args.template,
                name: args.name,
                createdFiles: entries,
                output: stdout.slice(0, 5000),
                nextSteps: [
                  'Run validate_project to ensure TypeScript, lint, and build pass',
                  'Use update_project_files to customize README, .env.example, etc.',
                  'Use mcp__github__create_repo to publish to GitHub',
                  'Use mcp__coolify__create_application for deployment'
                ]
              }, null, 2)
            }]
          }
        } catch (error: unknown) {
          const execError = error as { message?: string; stdout?: string; stderr?: string }
          log.error(startTime, execError.message || String(error))
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: execError.message || String(error),
                stdout: execError.stdout?.slice(0, 5000) || '',
                stderr: execError.stderr?.slice(0, 2000) || ''
              }, null, 2)
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'validate_project',
      `Run full validation pipeline on a scaffolded project.

Executes these steps in order:
1. install - Install dependencies with detected package manager
2. typecheck - Run TypeScript type checking
3. lint - Run linter (with auto-fix if enabled)
4. build - Build the project

Returns detailed results for each step including duration and any errors.
Use this after scaffold_project to ensure the project is ready.`,
      {
        projectPath: z.string()
          .describe('Absolute path to the project directory'),
        fix: z.boolean()
          .default(true)
          .describe('Auto-fix lint errors when possible'),
        skipSteps: z.array(z.enum(['install', 'typecheck', 'lint', 'build']))
          .optional()
          .describe('Steps to skip during validation')
      },
      async (args) => {
        const log = createToolLogger('scaffolder.validate_project')
        const startTime = log.start({
          projectPath: args.projectPath,
          fix: args.fix,
          skipSteps: args.skipSteps
        })

        const skipSet = new Set(args.skipSteps || [])
        const steps: Record<string, IValidationStepResult> = {}
        const totalStartTime = Date.now()

        try {
          if (!existsSync(args.projectPath)) {
            log.error(startTime, 'Project path does not exist', { projectPath: args.projectPath })
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  success: false,
                  error: `Project path does not exist: ${args.projectPath}`
                }, null, 2)
              }],
              isError: true
            }
          }

          const files = await readdir(args.projectPath)
          let packageManager: 'bun' | 'npm' | 'yarn' | 'pnpm' = 'bun'

          if (files.includes('bun.lock') || files.includes('bun.lockb')) {
            packageManager = 'bun'
          } else if (files.includes('yarn.lock')) {
            packageManager = 'yarn'
          } else if (files.includes('pnpm-lock.yaml')) {
            packageManager = 'pnpm'
          } else if (files.includes('package-lock.json')) {
            packageManager = 'npm'
          }

          const runStep = async (
            stepName: string,
            command: string,
            parseOutput?: (stdout: string, stderr: string) => Partial<IValidationStepResult>
          ): Promise<IValidationStepResult> => {
            const stepStart = Date.now()
            try {
              const { stdout, stderr } = await execAsync(
                `cd "${args.projectPath}" && ${command}`,
                { timeout: 300000, maxBuffer: 10 * 1024 * 1024 }
              )
              const duration_ms = Date.now() - stepStart
              const parsed = parseOutput ? parseOutput(stdout, stderr) : {}
              return {
                success: true,
                duration_ms,
                output: (stdout + stderr).slice(0, 10000),
                ...parsed
              }
            } catch (error: unknown) {
              const execError = error as { stdout?: string; stderr?: string }
              const duration_ms = Date.now() - stepStart
              const output = (execError.stdout || '') + (execError.stderr || '')
              const parsed = parseOutput ? parseOutput(execError.stdout || '', execError.stderr || '') : {}
              return {
                success: false,
                duration_ms,
                output: output.slice(0, 10000),
                ...parsed
              }
            }
          }

          if (!skipSet.has('install')) {
            const installCmd = packageManager === 'npm' ? 'npm install' : `${packageManager} install`
            steps.install = await runStep('install', installCmd)
            if (!steps.install.success) {
              log.error(startTime, 'Install failed', { step: 'install' })
            }
          }

          if (!skipSet.has('typecheck')) {
            steps.typecheck = await runStep(
              'typecheck',
              'bun run typecheck 2>&1 || npx tsc --noEmit 2>&1',
              (stdout, stderr) => {
                const output = stdout + stderr
                const errorCount = (output.match(/error TS\d+/gi) || []).length
                return { errorCount }
              }
            )
          }

          if (!skipSet.has('lint')) {
            const lintCmd = args.fix ? 'bun run lint --fix 2>&1 || bun run lint 2>&1' : 'bun run lint 2>&1'
            steps.lint = await runStep(
              'lint',
              lintCmd,
              (stdout) => {
                const errorCount = (stdout.match(/error/gi) || []).length
                const warningCount = (stdout.match(/warning/gi) || []).length
                const fixedCount = (stdout.match(/fixed/gi) || []).length
                return { errorCount, warningCount, fixedCount }
              }
            )
          }

          if (!skipSet.has('build')) {
            const buildCmd = packageManager === 'bun' || files.includes('bun.lock')
              ? 'bun run build'
              : 'npm run build'
            steps.build = await runStep('build', buildCmd)
          }

          const passedSteps = Object.values(steps).filter(s => s.success).length
          const failedSteps = Object.values(steps).filter(s => !s.success).length
          const totalDuration_ms = Date.now() - totalStartTime
          const allPassed = failedSteps === 0

          if (allPassed) {
            log.success(startTime, {
              passedSteps,
              totalDuration_ms
            })
          } else {
            log.error(startTime, 'Validation failed', {
              passedSteps,
              failedSteps
            })
          }

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: allPassed,
                projectPath: args.projectPath,
                packageManager,
                steps,
                summary: {
                  passedSteps,
                  failedSteps,
                  totalDuration_ms
                }
              }, null, 2)
            }],
            isError: !allPassed
          }
        } catch (error: unknown) {
          log.error(startTime, String(error))
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
              }, null, 2)
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'update_project_files',
      `Update common project files after scaffolding.

Supports updating:
- readme: Update README.md with title, description, badges, sections
- gitignore: Add or remove entries from .gitignore
- envExample: Add variables to .env.example
- packageJson: Update scripts, dependencies, devDependencies

Files are merged intelligently - existing content is preserved where possible.`,
      {
        projectPath: z.string()
          .describe('Absolute path to the project directory'),
        updates: z.object({
          readme: z.object({
            title: z.string().optional(),
            description: z.string().optional(),
            badges: z.array(z.string()).optional(),
            sections: z.record(z.string()).optional()
          }).optional().describe('README.md updates'),
          gitignore: z.object({
            add: z.array(z.string()).optional(),
            remove: z.array(z.string()).optional()
          }).optional().describe('.gitignore modifications'),
          envExample: z.object({
            variables: z.record(z.string()).optional()
          }).optional().describe('.env.example updates'),
          packageJson: z.object({
            scripts: z.record(z.string()).optional(),
            dependencies: z.record(z.string()).optional(),
            devDependencies: z.record(z.string()).optional()
          }).optional().describe('package.json modifications')
        }).describe('Files to update')
      },
      async (args) => {
        const log = createToolLogger('scaffolder.update_project_files')
        const startTime = log.start({
          projectPath: args.projectPath,
          updateKeys: Object.keys(args.updates)
        })

        const updatedFiles: Array<{ file: string; changes: string[] }> = []

        try {
          if (!existsSync(args.projectPath)) {
            log.error(startTime, 'Project path does not exist')
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  success: false,
                  error: `Project path does not exist: ${args.projectPath}`
                }, null, 2)
              }],
              isError: true
            }
          }

          if (args.updates.readme) {
            const readmePath = join(args.projectPath, 'README.md')
            const changes: string[] = []
            let content = ''

            if (existsSync(readmePath)) {
              content = await readFile(readmePath, 'utf-8')
            }

            if (args.updates.readme.title) {
              const titleRegex = /^#\s+.+$/m
              if (titleRegex.test(content)) {
                content = content.replace(titleRegex, `# ${args.updates.readme.title}`)
              } else {
                content = `# ${args.updates.readme.title}\n\n${content}`
              }
              changes.push('Updated title')
            }

            if (args.updates.readme.description) {
              const descRegex = /^#[^\n]+\n+([^\n#]+)/
              const match = content.match(descRegex)
              if (match) {
                content = content.replace(match[1], args.updates.readme.description + '\n')
              } else {
                const lines = content.split('\n')
                if (lines.length > 0 && lines[0].startsWith('#')) {
                  lines.splice(1, 0, '', args.updates.readme.description, '')
                  content = lines.join('\n')
                }
              }
              changes.push('Updated description')
            }

            if (args.updates.readme.badges && args.updates.readme.badges.length > 0) {
              const badgeSection = args.updates.readme.badges.join(' ')
              const lines = content.split('\n')
              const titleIndex = lines.findIndex(l => l.startsWith('# '))
              if (titleIndex !== -1) {
                lines.splice(titleIndex + 1, 0, '', badgeSection)
                content = lines.join('\n')
              }
              changes.push(`Added ${args.updates.readme.badges.length} badges`)
            }

            if (args.updates.readme.sections) {
              for (const [heading, body] of Object.entries(args.updates.readme.sections)) {
                const sectionRegex = new RegExp(`## ${heading}\\n[\\s\\S]*?(?=\\n## |$)`, 'i')
                const newSection = `## ${heading}\n\n${body}\n`
                if (sectionRegex.test(content)) {
                  content = content.replace(sectionRegex, newSection)
                } else {
                  content += `\n${newSection}`
                }
                changes.push(`Updated section: ${heading}`)
              }
            }

            if (changes.length > 0) {
              await writeFile(readmePath, content, 'utf-8')
              updatedFiles.push({ file: 'README.md', changes })
            }
          }

          if (args.updates.gitignore) {
            const gitignorePath = join(args.projectPath, '.gitignore')
            const changes: string[] = []
            let lines: string[] = []

            if (existsSync(gitignorePath)) {
              const content = await readFile(gitignorePath, 'utf-8')
              lines = content.split('\n')
            }

            if (args.updates.gitignore.add) {
              for (const entry of args.updates.gitignore.add) {
                if (!lines.includes(entry)) {
                  lines.push(entry)
                  changes.push(`Added: ${entry}`)
                }
              }
            }

            if (args.updates.gitignore.remove) {
              for (const entry of args.updates.gitignore.remove) {
                const index = lines.indexOf(entry)
                if (index !== -1) {
                  lines.splice(index, 1)
                  changes.push(`Removed: ${entry}`)
                }
              }
            }

            if (changes.length > 0) {
              await writeFile(gitignorePath, lines.join('\n'), 'utf-8')
              updatedFiles.push({ file: '.gitignore', changes })
            }
          }

          if (args.updates.envExample) {
            const envPath = join(args.projectPath, '.env.example')
            const changes: string[] = []
            let content = ''

            if (existsSync(envPath)) {
              content = await readFile(envPath, 'utf-8')
            }

            if (args.updates.envExample.variables) {
              const lines = content ? content.split('\n') : []
              for (const [key, comment] of Object.entries(args.updates.envExample.variables)) {
                const existingLine = lines.findIndex(l => l.startsWith(`${key}=`))
                const newLine = comment ? `# ${comment}\n${key}=` : `${key}=`
                if (existingLine === -1) {
                  lines.push(newLine)
                  changes.push(`Added: ${key}`)
                }
              }
              content = lines.join('\n')
            }

            if (changes.length > 0) {
              await writeFile(envPath, content, 'utf-8')
              updatedFiles.push({ file: '.env.example', changes })
            }
          }

          if (args.updates.packageJson) {
            const pkgPath = join(args.projectPath, 'package.json')
            const changes: string[] = []

            if (existsSync(pkgPath)) {
              const pkgContent = await readFile(pkgPath, 'utf-8')
              const pkg = JSON.parse(pkgContent) as Record<string, unknown>

              if (args.updates.packageJson.scripts) {
                const existingScripts = (pkg.scripts || {}) as Record<string, string>
                pkg.scripts = { ...existingScripts, ...args.updates.packageJson.scripts }
                changes.push(`Updated scripts: ${Object.keys(args.updates.packageJson.scripts).join(', ')}`)
              }

              if (args.updates.packageJson.dependencies) {
                const existingDeps = (pkg.dependencies || {}) as Record<string, string>
                pkg.dependencies = { ...existingDeps, ...args.updates.packageJson.dependencies }
                changes.push(`Updated dependencies: ${Object.keys(args.updates.packageJson.dependencies).join(', ')}`)
              }

              if (args.updates.packageJson.devDependencies) {
                const existingDevDeps = (pkg.devDependencies || {}) as Record<string, string>
                pkg.devDependencies = { ...existingDevDeps, ...args.updates.packageJson.devDependencies }
                changes.push(`Updated devDependencies: ${Object.keys(args.updates.packageJson.devDependencies).join(', ')}`)
              }

              if (changes.length > 0) {
                await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
                updatedFiles.push({ file: 'package.json', changes })
              }
            }
          }

          log.success(startTime, { updatedFilesCount: updatedFiles.length })

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                updatedFiles
              }, null, 2)
            }]
          }
        } catch (error: unknown) {
          log.error(startTime, String(error))
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
              }, null, 2)
            }],
            isError: true
          }
        }
      }
    )
  ]
})
