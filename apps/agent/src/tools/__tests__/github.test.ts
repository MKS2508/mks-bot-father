import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { ok, err } from '@mks2508/no-throw'

const mockGitHubInit = vi.fn()
const mockGitHubCreateRepo = vi.fn()
const mockExecAsync = vi.fn()

vi.mock('@mks2508/mks-bot-father', () => ({
  getGitHubService: () => ({
    init: mockGitHubInit,
    createRepo: mockGitHubCreateRepo,
  }),
}))

vi.mock('child_process', () => ({
  exec: vi.fn(),
}))

vi.mock('util', () => ({
  promisify: () => mockExecAsync,
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

describe('GitHub Tools', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    capturedTools = []
    vi.resetModules()
    await import('../github.js')
  })

  describe('create_repo tool', () => {
    it('should create repository successfully', async () => {
      mockGitHubInit.mockResolvedValue(ok(undefined))
      mockGitHubCreateRepo.mockResolvedValue(
        ok({
          repoUrl: 'https://github.com/test/repo',
          cloneUrl: 'https://github.com/test/repo.git',
        })
      )

      const tool = getTool('create_repo')
      expect(tool).toBeDefined()

      const result = await tool!.handler({
        name: 'test-repo',
        description: 'Test repository',
        private: false,
      })

      expect(result.isError).toBeFalsy()
      expect(result.content).toHaveLength(1)

      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.repoUrl).toBe('https://github.com/test/repo')
      expect(parsed.cloneUrl).toBe('https://github.com/test/repo.git')
    })

    it('should handle GitHub init failure', async () => {
      mockGitHubInit.mockResolvedValue(
        err({
          code: 'GITHUB_ERROR',
          message: 'No GitHub token configured',
        })
      )

      const tool = getTool('create_repo')
      const result = await tool!.handler({ name: 'test-repo' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('GitHub init failed')
      expect(result.content[0].text).toContain('No GitHub token configured')
    })

    it('should handle repo creation failure', async () => {
      mockGitHubInit.mockResolvedValue(ok(undefined))
      mockGitHubCreateRepo.mockResolvedValue(
        err({
          code: 'GITHUB_ERROR',
          message: 'Repository already exists',
        })
      )

      const tool = getTool('create_repo')
      const result = await tool!.handler({ name: 'existing-repo' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to create repo')
      expect(result.content[0].text).toContain('Repository already exists')
    })

    it('should pass org parameter when provided', async () => {
      mockGitHubInit.mockResolvedValue(ok(undefined))
      mockGitHubCreateRepo.mockResolvedValue(
        ok({ repoUrl: 'https://github.com/myorg/repo', cloneUrl: 'https://github.com/myorg/repo.git' })
      )

      const tool = getTool('create_repo')
      await tool!.handler({
        name: 'test-repo',
        org: 'myorg',
      })

      expect(mockGitHubCreateRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'myorg',
        }),
        expect.any(Function)
      )
    })

    it('should handle template repo parameters', async () => {
      mockGitHubInit.mockResolvedValue(ok(undefined))
      mockGitHubCreateRepo.mockResolvedValue(
        ok({ repoUrl: 'https://github.com/test/repo', cloneUrl: 'https://github.com/test/repo.git' })
      )

      const tool = getTool('create_repo')
      await tool!.handler({
        name: 'from-template',
        templateOwner: 'MKS2508',
        templateRepo: 'mks-telegram-bot',
      })

      expect(mockGitHubCreateRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          templateOwner: 'MKS2508',
          templateRepo: 'mks-telegram-bot',
        }),
        expect.any(Function)
      )
    })

    it('should handle unexpected errors', async () => {
      mockGitHubInit.mockRejectedValue(new Error('Network error'))

      const tool = getTool('create_repo')
      const result = await tool!.handler({ name: 'test-repo' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Error')
      expect(result.content[0].text).toContain('Network error')
    })
  })

  describe('clone_repo tool', () => {
    it('should clone repository successfully', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'Cloning into...',
        stderr: '',
      })

      const tool = getTool('clone_repo')
      const result = await tool!.handler({
        repoUrl: 'https://github.com/test/repo',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.path).toContain('workspaces/repo')
    })

    it('should use custom target directory', async () => {
      mockExecAsync.mockResolvedValue({ stdout: 'Cloning...', stderr: '' })

      const tool = getTool('clone_repo')
      const result = await tool!.handler({
        repoUrl: 'test/repo',
        targetDir: 'custom-dir',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.path).toContain('custom-dir')
    })

    it('should handle clone failure', async () => {
      mockExecAsync.mockRejectedValue(new Error('Repository not found'))

      const tool = getTool('clone_repo')
      const result = await tool!.handler({
        repoUrl: 'invalid/repo',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Clone failed')
    })
  })

  describe('create_pr tool', () => {
    it('should create pull request successfully', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'https://github.com/test/repo/pull/1',
        stderr: '',
      })

      const tool = getTool('create_pr')
      const result = await tool!.handler({
        repoPath: '/path/to/repo',
        title: 'Add new feature',
        body: 'This PR adds...',
        baseBranch: 'main',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.prUrl).toBe('https://github.com/test/repo/pull/1')
      expect(parsed.title).toBe('Add new feature')
    })

    it('should handle draft PR flag', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'https://github.com/test/repo/pull/2',
        stderr: '',
      })

      const tool = getTool('create_pr')
      await tool!.handler({
        repoPath: '/path/to/repo',
        title: 'Draft PR',
        body: 'Work in progress',
        baseBranch: 'main',
        draft: true,
      })

      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('--draft'),
        expect.any(Object)
      )
    })

    it('should escape quotes in body', async () => {
      mockExecAsync.mockResolvedValue({ stdout: 'https://github.com/pr/1', stderr: '' })

      const tool = getTool('create_pr')
      await tool!.handler({
        repoPath: '/path/to/repo',
        title: 'Test',
        body: 'Has "quotes" inside',
        baseBranch: 'main',
      })

      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('\\"quotes\\"'),
        expect.any(Object)
      )
    })

    it('should handle PR creation failure', async () => {
      mockExecAsync.mockRejectedValue(new Error('No commits to merge'))

      const tool = getTool('create_pr')
      const result = await tool!.handler({
        repoPath: '/path/to/repo',
        title: 'Test',
        body: 'Body',
        baseBranch: 'main',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('PR creation failed')
    })
  })

  describe('commit_and_push tool', () => {
    it('should commit and push successfully', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'Pushed to origin/main',
        stderr: '',
      })

      const tool = getTool('commit_and_push')
      const result = await tool!.handler({
        repoPath: '/path/to/repo',
        message: 'Initial commit',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.message).toBe('Initial commit')
    })

    it('should create new branch when specified', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' })

      const tool = getTool('commit_and_push')
      await tool!.handler({
        repoPath: '/path/to/repo',
        message: 'Feature commit',
        newBranch: 'feature-branch',
      })

      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('git checkout -b feature-branch'),
        expect.any(Object)
      )
    })

    it('should escape quotes in commit message', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' })

      const tool = getTool('commit_and_push')
      await tool!.handler({
        repoPath: '/path/to/repo',
        message: 'Fix "bug" in parser',
      })

      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('\\"bug\\"'),
        expect.any(Object)
      )
    })

    it('should handle push failure', async () => {
      mockExecAsync.mockRejectedValue(new Error('Permission denied'))

      const tool = getTool('commit_and_push')
      const result = await tool!.handler({
        repoPath: '/path/to/repo',
        message: 'Commit',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Commit/push failed')
    })
  })

  describe('get_repo_info tool', () => {
    it('should return repository info', async () => {
      const repoInfo = {
        name: 'test-repo',
        description: 'Test repository',
        url: 'https://github.com/test/repo',
        isPrivate: false,
        defaultBranchRef: { name: 'main' },
      }

      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify(repoInfo, null, 2),
        stderr: '',
      })

      const tool = getTool('get_repo_info')
      const result = await tool!.handler({
        repo: 'test/repo',
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.name).toBe('test-repo')
      expect(parsed.url).toBe('https://github.com/test/repo')
    })

    it('should handle repo not found', async () => {
      mockExecAsync.mockRejectedValue(new Error('Could not resolve to a Repository'))

      const tool = getTool('get_repo_info')
      const result = await tool!.handler({
        repo: 'nonexistent/repo',
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Failed to get repo info')
    })
  })
})
