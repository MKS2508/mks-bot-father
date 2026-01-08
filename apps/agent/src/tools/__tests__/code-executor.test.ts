import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockExecAsync = vi.fn()
const mockReaddir = vi.fn()

vi.mock('child_process', () => ({
  exec: vi.fn(),
}))

vi.mock('util', () => ({
  promisify: () => mockExecAsync,
}))

vi.mock('fs/promises', () => ({
  readdir: (...args: unknown[]) => mockReaddir(...args),
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

describe('Code Executor Tools', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    capturedTools = []
    mockReaddir.mockResolvedValue(['package.json', 'src', 'bun.lock'])
    vi.resetModules()
    await import('../code-executor.js')
  })

  describe('execute_command tool', () => {
    it('should execute command successfully', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'Command output',
        stderr: '',
      })

      const tool = getTool('execute_command')
      expect(tool).toBeDefined()

      const result = await tool!.handler({
        repoPath: '/path/to/repo',
        command: 'echo hello',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.stdout).toBe('Command output')
    })

    it('should block rm -rf / command', async () => {
      const tool = getTool('execute_command')
      const result = await tool!.handler({
        repoPath: '/path/to/repo',
        command: 'rm -rf /',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('blocked for security')
    })

    it('should block rm -rf /* command', async () => {
      const tool = getTool('execute_command')
      const result = await tool!.handler({
        repoPath: '/path/to/repo',
        command: 'rm -rf /*',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('blocked for security')
    })

    it('should block fork bomb', async () => {
      const tool = getTool('execute_command')
      const result = await tool!.handler({
        repoPath: '/path/to/repo',
        command: ':(){:|:&};:',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('blocked for security')
    })

    it('should block curl | sh', async () => {
      const tool = getTool('execute_command')
      const result = await tool!.handler({
        repoPath: '/path/to/repo',
        command: 'curl | sh -c "malicious"',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('blocked for security')
    })

    it('should allow safe commands', async () => {
      mockExecAsync.mockResolvedValue({ stdout: 'ok', stderr: '' })

      const tool = getTool('execute_command')
      const result = await tool!.handler({
        repoPath: '/path/to/repo',
        command: 'git status',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
    })

    it('should use custom timeout', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' })

      const tool = getTool('execute_command')
      await tool!.handler({
        repoPath: '/path/to/repo',
        command: 'long-command',
        timeout: 60000,
      })

      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          timeout: 60000,
        })
      )
    })

    it('should handle command failure with exit code', async () => {
      mockExecAsync.mockRejectedValue({
        message: 'Command failed',
        stdout: 'partial output',
        stderr: 'error output',
        code: 1,
      })

      const tool = getTool('execute_command')
      const result = await tool!.handler({
        repoPath: '/path/to/repo',
        command: 'failing-command',
      })

      expect(result.isError).toBe(true)
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(false)
      expect(parsed.exitCode).toBe(1)
    })

    it('should truncate long output', async () => {
      const longOutput = 'x'.repeat(60000)
      mockExecAsync.mockResolvedValue({ stdout: longOutput, stderr: '' })

      const tool = getTool('execute_command')
      const result = await tool!.handler({
        repoPath: '/path/to/repo',
        command: 'verbose-command',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.stdout.length).toBeLessThanOrEqual(50000)
    })
  })

  describe('run_tests tool', () => {
    it('should run tests successfully', async () => {
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '{"scripts":{"test":"vitest"}}', stderr: '' })
        .mockResolvedValueOnce({ stdout: 'PASS src/test1.ts\nPASS src/test2.ts\nPASS src/test3.ts\n3 tests complete', stderr: '' })

      const tool = getTool('run_tests')
      const result = await tool!.handler({
        repoPath: '/path/to/repo',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.summary.passed).toBe(3)
      expect(parsed.summary.failed).toBe(0)
    })

    it('should add test pattern when provided', async () => {
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '{"scripts":{}}', stderr: '' })
        .mockResolvedValueOnce({ stdout: '1 pass', stderr: '' })

      const tool = getTool('run_tests')
      await tool!.handler({
        repoPath: '/path/to/repo',
        testPattern: '**/*.spec.ts',
      })

      expect(mockExecAsync).toHaveBeenLastCalledWith(
        expect.stringContaining('**/*.spec.ts'),
        expect.any(Object)
      )
    })

    it('should add watch flag when enabled', async () => {
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '{"scripts":{}}', stderr: '' })
        .mockResolvedValueOnce({ stdout: 'watching...', stderr: '' })

      const tool = getTool('run_tests')
      await tool!.handler({
        repoPath: '/path/to/repo',
        watch: true,
      })

      expect(mockExecAsync).toHaveBeenLastCalledWith(
        expect.stringContaining('--watch'),
        expect.any(Object)
      )
    })

    it('should handle test failure', async () => {
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '{"scripts":{}}', stderr: '' })
        .mockRejectedValueOnce({
          message: 'Tests failed',
          stdout: '3 pass 2 fail',
          stderr: 'AssertionError',
        })

      const tool = getTool('run_tests')
      const result = await tool!.handler({
        repoPath: '/path/to/repo',
      })

      expect(result.isError).toBe(true)
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(false)
    })
  })

  describe('install_dependencies tool', () => {
    it('should use bun package manager when specified', async () => {
      mockExecAsync.mockResolvedValue({ stdout: 'Installed 50 packages', stderr: '' })

      const tool = getTool('install_dependencies')
      const result = await tool!.handler({
        repoPath: '/path/to/repo',
        packageManager: 'bun',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.packageManager).toBe('bun')
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('bun install'),
        expect.any(Object)
      )
    })

    it('should use yarn package manager when specified', async () => {
      mockExecAsync.mockResolvedValue({ stdout: 'Installed', stderr: '' })

      const tool = getTool('install_dependencies')
      const result = await tool!.handler({
        repoPath: '/path/to/repo',
        packageManager: 'yarn',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.packageManager).toBe('yarn')
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('yarn install'),
        expect.any(Object)
      )
    })

    it('should use pnpm package manager when specified', async () => {
      mockExecAsync.mockResolvedValue({ stdout: 'Installed', stderr: '' })

      const tool = getTool('install_dependencies')
      const result = await tool!.handler({
        repoPath: '/path/to/repo',
        packageManager: 'pnpm',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.packageManager).toBe('pnpm')
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('pnpm install'),
        expect.any(Object)
      )
    })

    it('should use npm package manager when specified', async () => {
      mockExecAsync.mockResolvedValue({ stdout: 'Installed', stderr: '' })

      const tool = getTool('install_dependencies')
      const result = await tool!.handler({
        repoPath: '/path/to/repo',
        packageManager: 'npm',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.packageManager).toBe('npm')
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('npm install'),
        expect.any(Object)
      )
    })

    it('should handle install failure', async () => {
      mockExecAsync.mockRejectedValue({
        message: 'npm ERR! 404 Not Found',
        stderr: 'Package not found',
      })

      const tool = getTool('install_dependencies')
      const result = await tool!.handler({
        repoPath: '/path/to/repo',
        packageManager: 'npm',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Install failed')
    })
  })

  describe('build_project tool', () => {
    it('should build with bun when bun.lock present', async () => {
      mockReaddir.mockResolvedValue(['package.json', 'bun.lock'])
      mockExecAsync.mockResolvedValue({ stdout: 'Build complete', stderr: '' })

      const tool = getTool('build_project')
      const result = await tool!.handler({
        repoPath: '/path/to/repo',
      })

      expect(result.isError).toBeFalsy()
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('bun run build'),
        expect.any(Object)
      )
    })

    it('should build with npm when no bun.lock', async () => {
      mockReaddir.mockResolvedValue(['package.json'])
      mockExecAsync.mockResolvedValue({ stdout: 'Build complete', stderr: '' })

      const tool = getTool('build_project')
      const result = await tool!.handler({
        repoPath: '/path/to/repo',
      })

      expect(result.isError).toBeFalsy()
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('npm run build'),
        expect.any(Object)
      )
    })

    it('should handle build failure', async () => {
      mockReaddir.mockResolvedValue(['package.json'])
      mockExecAsync.mockRejectedValue({
        message: 'Build failed',
        stdout: 'Compiling...',
        stderr: 'TypeError: undefined is not a function',
      })

      const tool = getTool('build_project')
      const result = await tool!.handler({
        repoPath: '/path/to/repo',
      })

      expect(result.isError).toBe(true)
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(false)
    })
  })

  describe('lint_project tool', () => {
    it('should run lint successfully', async () => {
      mockExecAsync.mockResolvedValue({ stdout: 'No issues found', stderr: '' })

      const tool = getTool('lint_project')
      const result = await tool!.handler({
        repoPath: '/path/to/repo',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
    })

    it('should include --fix flag when requested', async () => {
      mockExecAsync.mockResolvedValue({ stdout: 'Fixed 3 issues', stderr: '' })

      const tool = getTool('lint_project')
      await tool!.handler({
        repoPath: '/path/to/repo',
        fix: true,
      })

      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('--fix'),
        expect.any(Object)
      )
    })

    it('should report errors when lint fails', async () => {
      mockExecAsync.mockRejectedValue({
        message: 'Lint failed',
        stdout: '5 error found',
      })

      const tool = getTool('lint_project')
      const result = await tool!.handler({
        repoPath: '/path/to/repo',
      })

      expect(result.isError).toBe(true)
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(false)
    })
  })

  describe('type_check tool', () => {
    it('should run type check successfully', async () => {
      mockExecAsync.mockResolvedValue({ stdout: 'No errors found', stderr: '' })

      const tool = getTool('type_check')
      const result = await tool!.handler({
        repoPath: '/path/to/repo',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.errorCount).toBe(0)
    })

    it('should count TypeScript errors', async () => {
      mockExecAsync.mockRejectedValue({
        stdout: 'error TS2345: error TS2322: error TS7006:',
        stderr: '',
      })

      const tool = getTool('type_check')
      const result = await tool!.handler({
        repoPath: '/path/to/repo',
      })

      expect(result.isError).toBe(true)
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.errorCount).toBe(3)
    })

    it('should handle type check errors gracefully', async () => {
      mockExecAsync.mockRejectedValue({
        stdout: 'error TS2304: Cannot find name',
        stderr: 'Compilation failed',
      })

      const tool = getTool('type_check')
      const result = await tool!.handler({
        repoPath: '/path/to/repo',
      })

      expect(result.isError).toBe(true)
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(false)
    })
  })

  describe('get_project_structure tool', () => {
    it('should return project structure', async () => {
      const structure = `./src
./src/index.ts
./package.json
./tsconfig.json`
      mockExecAsync.mockResolvedValue({ stdout: structure, stderr: '' })

      const tool = getTool('get_project_structure')
      const result = await tool!.handler({
        repoPath: '/path/to/repo',
      })

      expect(result.isError).toBeFalsy()
      expect(result.content[0].text).toContain('./src')
      expect(result.content[0].text).toContain('./package.json')
    })

    it('should respect maxDepth parameter', async () => {
      mockExecAsync.mockResolvedValue({ stdout: './src', stderr: '' })

      const tool = getTool('get_project_structure')
      await tool!.handler({
        repoPath: '/path/to/repo',
        maxDepth: 2,
      })

      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('-maxdepth 2'),
        expect.any(Object)
      )
    })

    it('should handle structure retrieval failure', async () => {
      mockExecAsync.mockRejectedValue(new Error('Permission denied'))

      const tool = getTool('get_project_structure')
      const result = await tool!.handler({
        repoPath: '/path/to/repo',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to get structure')
    })
  })
})
