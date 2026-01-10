import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockExecAsync = vi.fn()
const mockExistsSync = vi.fn()
const mockReaddir = vi.fn()
const mockReadFile = vi.fn()
const mockWriteFile = vi.fn()
const mockMkdir = vi.fn()

vi.mock('child_process', () => ({
  exec: vi.fn(),
}))

vi.mock('util', () => ({
  promisify: () => mockExecAsync,
}))

vi.mock('fs', () => ({
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
}))

vi.mock('fs/promises', () => ({
  readdir: (...args: unknown[]) => mockReaddir(...args),
  readFile: (...args: unknown[]) => mockReadFile(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
}))

vi.mock('../../utils/tool-logger.js', () => ({
  createToolLogger: () => ({
    start: () => Date.now(),
    success: vi.fn(),
    error: vi.fn(),
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

describe('Scaffolder Tools', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    capturedTools = []
    mockExistsSync.mockReturnValue(false)
    mockMkdir.mockResolvedValue(undefined)
    vi.resetModules()
    await import('../scaffolder.js')
  })

  describe('scaffold_project tool', () => {
    it('should scaffold a project successfully', async () => {
      mockExistsSync.mockReturnValue(false)
      mockExecAsync.mockResolvedValue({
        stdout: 'Project created successfully',
        stderr: '',
      })
      mockExistsSync.mockImplementation((path: string) => {
        if (path.includes('package.json')) return true
        return false
      })
      mockReaddir.mockResolvedValue(['package.json', 'src', 'tsconfig.json'])

      const tool = getTool('scaffold_project')
      expect(tool).toBeDefined()

      const result = await tool!.handler({
        name: 'test-bot',
        template: 'telegram-bot',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.name).toBe('test-bot')
      expect(parsed.template).toBe('telegram-bot')
      expect(parsed.createdFiles).toBeDefined()
    })

    it('should fail if directory exists and not empty', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReaddir.mockResolvedValue(['existing-file.txt'])

      const tool = getTool('scaffold_project')
      const result = await tool!.handler({
        name: 'existing-project',
        template: 'monorepo',
      })

      expect(result.isError).toBe(true)
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(false)
      expect(parsed.error).toContain('already exists and is not empty')
    })

    it('should pass skipGit flag correctly', async () => {
      mockExistsSync.mockImplementation((path: string) => {
        if (path.includes('package.json')) return true
        return false
      })
      mockExecAsync.mockResolvedValue({ stdout: 'OK', stderr: '' })
      mockReaddir.mockResolvedValue(['package.json'])

      const tool = getTool('scaffold_project')
      await tool!.handler({
        name: 'test-project',
        template: 'monorepo',
        skipGit: true,
      })

      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('--no-git'),
        expect.any(Object)
      )
    })

    it('should pass skipInstall flag correctly', async () => {
      mockExistsSync.mockImplementation((path: string) => {
        if (path.includes('package.json')) return true
        return false
      })
      mockExecAsync.mockResolvedValue({ stdout: 'OK', stderr: '' })
      mockReaddir.mockResolvedValue(['package.json'])

      const tool = getTool('scaffold_project')
      await tool!.handler({
        name: 'test-project',
        template: 'fumadocs',
        skipInstall: true,
      })

      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('--no-install'),
        expect.any(Object)
      )
    })

    it('should fail if package.json not created', async () => {
      mockExistsSync.mockReturnValue(false)
      mockExecAsync.mockResolvedValue({ stdout: 'Done', stderr: '' })

      const tool = getTool('scaffold_project')
      const result = await tool!.handler({
        name: 'failed-project',
        template: 'telegram-bot',
      })

      expect(result.isError).toBe(true)
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(false)
      expect(parsed.error).toContain('package.json not found')
    })

    it('should handle command execution errors', async () => {
      mockExistsSync.mockReturnValue(false)
      mockExecAsync.mockRejectedValue(new Error('bunx not found'))

      const tool = getTool('scaffold_project')
      const result = await tool!.handler({
        name: 'error-project',
        template: 'monorepo',
      })

      expect(result.isError).toBe(true)
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(false)
      expect(parsed.error).toContain('bunx not found')
    })

    it('should use custom targetDir when provided', async () => {
      mockExistsSync.mockImplementation((path: string) => {
        if (path.includes('package.json')) return true
        return false
      })
      mockExecAsync.mockResolvedValue({ stdout: 'OK', stderr: '' })
      mockReaddir.mockResolvedValue(['package.json'])

      const tool = getTool('scaffold_project')
      const result = await tool!.handler({
        name: 'custom-dir-project',
        template: 'telegram-bot',
        targetDir: '/custom/path/custom-dir-project',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.projectPath).toBe('/custom/path/custom-dir-project')
    })
  })

  describe('validate_project tool', () => {
    it('should validate project successfully', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReaddir.mockResolvedValue(['package.json', 'bun.lock', 'src'])
      mockExecAsync.mockResolvedValue({ stdout: 'Success', stderr: '' })

      const tool = getTool('validate_project')
      expect(tool).toBeDefined()

      const result = await tool!.handler({
        projectPath: '/path/to/project',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.packageManager).toBe('bun')
      expect(parsed.steps).toBeDefined()
    })

    it('should detect yarn package manager', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReaddir.mockResolvedValue(['package.json', 'yarn.lock'])
      mockExecAsync.mockResolvedValue({ stdout: 'Success', stderr: '' })

      const tool = getTool('validate_project')
      const result = await tool!.handler({
        projectPath: '/path/to/yarn-project',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.packageManager).toBe('yarn')
    })

    it('should detect pnpm package manager', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReaddir.mockResolvedValue(['package.json', 'pnpm-lock.yaml'])
      mockExecAsync.mockResolvedValue({ stdout: 'Success', stderr: '' })

      const tool = getTool('validate_project')
      const result = await tool!.handler({
        projectPath: '/path/to/pnpm-project',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.packageManager).toBe('pnpm')
    })

    it('should detect npm package manager', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReaddir.mockResolvedValue(['package.json', 'package-lock.json'])
      mockExecAsync.mockResolvedValue({ stdout: 'Success', stderr: '' })

      const tool = getTool('validate_project')
      const result = await tool!.handler({
        projectPath: '/path/to/npm-project',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.packageManager).toBe('npm')
    })

    it('should fail if project path does not exist', async () => {
      mockExistsSync.mockReturnValue(false)

      const tool = getTool('validate_project')
      const result = await tool!.handler({
        projectPath: '/nonexistent/path',
      })

      expect(result.isError).toBe(true)
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(false)
      expect(parsed.error).toContain('does not exist')
    })

    it('should skip specified steps', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReaddir.mockResolvedValue(['package.json', 'bun.lock'])
      mockExecAsync.mockResolvedValue({ stdout: 'Success', stderr: '' })

      const tool = getTool('validate_project')
      const result = await tool!.handler({
        projectPath: '/path/to/project',
        skipSteps: ['install', 'build'],
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.steps.install).toBeUndefined()
      expect(parsed.steps.build).toBeUndefined()
      expect(parsed.steps.typecheck).toBeDefined()
      expect(parsed.steps.lint).toBeDefined()
    })

    it('should handle step failures', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReaddir.mockResolvedValue(['package.json', 'bun.lock'])
      mockExecAsync
        .mockResolvedValueOnce({ stdout: 'installed', stderr: '' })
        .mockRejectedValueOnce({ stdout: '', stderr: 'Type error TS2304' })

      const tool = getTool('validate_project')
      const result = await tool!.handler({
        projectPath: '/path/to/project',
        skipSteps: ['lint', 'build'],
      })

      expect(result.isError).toBe(true)
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(false)
      expect(parsed.summary.failedSteps).toBeGreaterThan(0)
    })

    it('should use fix flag for lint', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReaddir.mockResolvedValue(['package.json', 'bun.lock'])
      mockExecAsync.mockResolvedValue({ stdout: 'Success', stderr: '' })

      const tool = getTool('validate_project')
      await tool!.handler({
        projectPath: '/path/to/project',
        fix: true,
        skipSteps: ['install', 'typecheck', 'build'],
      })

      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('--fix'),
        expect.any(Object)
      )
    })
  })

  describe('update_project_files tool', () => {
    it('should update README.md title', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFile.mockResolvedValue('# Old Title\n\nSome content')

      const tool = getTool('update_project_files')
      expect(tool).toBeDefined()

      const result = await tool!.handler({
        projectPath: '/path/to/project',
        updates: {
          readme: {
            title: 'New Title',
          },
        },
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.updatedFiles).toHaveLength(1)
      expect(parsed.updatedFiles[0].file).toBe('README.md')
    })

    it('should update .gitignore entries', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFile.mockResolvedValue('node_modules\n.env\ndist')

      const tool = getTool('update_project_files')
      const result = await tool!.handler({
        projectPath: '/path/to/project',
        updates: {
          gitignore: {
            add: ['.DS_Store', 'coverage'],
            remove: ['dist'],
          },
        },
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.updatedFiles.find((f: { file: string }) => f.file === '.gitignore')).toBeDefined()
    })

    it('should update .env.example variables', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFile.mockResolvedValue('EXISTING_VAR=value')

      const tool = getTool('update_project_files')
      const result = await tool!.handler({
        projectPath: '/path/to/project',
        updates: {
          envExample: {
            variables: {
              TG_BOT_TOKEN: 'Telegram bot token',
              NODE_ENV: 'Node environment',
            },
          },
        },
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
    })

    it('should update package.json scripts', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          name: 'test-project',
          scripts: { dev: 'bun run dev' },
        })
      )

      const tool = getTool('update_project_files')
      const result = await tool!.handler({
        projectPath: '/path/to/project',
        updates: {
          packageJson: {
            scripts: {
              build: 'bun run build',
              test: 'vitest',
            },
          },
        },
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.updatedFiles.find((f: { file: string }) => f.file === 'package.json')).toBeDefined()
    })

    it('should fail if project path does not exist', async () => {
      mockExistsSync.mockReturnValue(false)

      const tool = getTool('update_project_files')
      const result = await tool!.handler({
        projectPath: '/nonexistent/path',
        updates: {
          readme: { title: 'Test' },
        },
      })

      expect(result.isError).toBe(true)
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(false)
      expect(parsed.error).toContain('does not exist')
    })

    it('should handle multiple file updates', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFile
        .mockResolvedValueOnce('# Title\n\nContent')
        .mockResolvedValueOnce('node_modules')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce(JSON.stringify({ name: 'test' }))

      const tool = getTool('update_project_files')
      const result = await tool!.handler({
        projectPath: '/path/to/project',
        updates: {
          readme: { title: 'New Title', description: 'New desc' },
          gitignore: { add: ['.env.local'] },
          envExample: { variables: { API_KEY: 'API key' } },
          packageJson: { scripts: { start: 'node index.js' } },
        },
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.updatedFiles.length).toBeGreaterThan(0)
    })

    it('should add badges to README', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFile.mockResolvedValue('# Project\n\nDescription')

      const tool = getTool('update_project_files')
      const result = await tool!.handler({
        projectPath: '/path/to/project',
        updates: {
          readme: {
            badges: [
              '![Build](https://img.shields.io/badge/build-passing-green)',
              '![License](https://img.shields.io/badge/license-MIT-blue)',
            ],
          },
        },
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
    })

    it('should add sections to README', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFile.mockResolvedValue('# Project\n\n## Existing Section\n\nContent')

      const tool = getTool('update_project_files')
      const result = await tool!.handler({
        projectPath: '/path/to/project',
        updates: {
          readme: {
            sections: {
              Installation: 'Run `bun install` to install dependencies.',
              Usage: 'Run `bun run dev` to start the development server.',
            },
          },
        },
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
    })

    it('should handle errors gracefully', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFile.mockRejectedValue(new Error('Permission denied'))

      const tool = getTool('update_project_files')
      const result = await tool!.handler({
        projectPath: '/path/to/project',
        updates: {
          readme: { title: 'Test' },
        },
      })

      expect(result.isError).toBe(true)
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(false)
      expect(parsed.error).toContain('Permission denied')
    })

    it('should add dependencies to package.json', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          name: 'test-project',
          dependencies: { existing: '1.0.0' },
        })
      )

      const tool = getTool('update_project_files')
      const result = await tool!.handler({
        projectPath: '/path/to/project',
        updates: {
          packageJson: {
            dependencies: {
              telegraf: '^4.0.0',
              dotenv: '^16.0.0',
            },
          },
        },
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
    })

    it('should add devDependencies to package.json', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFile.mockResolvedValue(
        JSON.stringify({
          name: 'test-project',
          devDependencies: { typescript: '5.0.0' },
        })
      )

      const tool = getTool('update_project_files')
      const result = await tool!.handler({
        projectPath: '/path/to/project',
        updates: {
          packageJson: {
            devDependencies: {
              vitest: '^1.0.0',
              '@types/node': '^20.0.0',
            },
          },
        },
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
    })
  })
})
