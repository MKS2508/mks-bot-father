/**
 * GitHub service for mks-bot-father.
 *
 * @module
 */

import { ok, err, tryCatchAsync, isOk, isErr, type Result, type ResultError } from '@mks2508/no-throw'
import { createLogger, log as fileLog } from '../utils/index.js'
import { getConfigService } from './config.service.js'
import {
  type IGitHubRepoOptions,
  type IGitHubRepoResult,
  type IGitHubPushResult,
} from '../types/index.js'
import { AppErrorCode } from '../types/errors.js'

const log = createLogger('GitHubService')

const GITHUB_API = 'https://api.github.com'

/**
 * GitHub API response type.
 */
interface IGitHubApiResponse<T> {
  data?: T
  error?: string
  status: number
}

/**
 * GitHub service for repository operations.
 *
 * @example
 * ```typescript
 * const github = getGitHubService()
 * const initResult = await github.init()
 * if (isErr(initResult)) {
 *   console.error(initResult.error.message)
 *   return
 * }
 *
 * const repoResult = await github.createRepo({ name: 'my-bot' })
 * if (isOk(repoResult)) {
 *   console.log('Repo URL:', repoResult.value.repoUrl)
 * }
 * ```
 */
export class GitHubService {
  private token: string | undefined

  /**
   * Initializes the GitHub service by resolving the token.
   *
   * @returns Result indicating success or error
   */
  async init(): Promise<Result<void, ResultError<typeof AppErrorCode.GITHUB_ERROR>>> {
    const config = getConfigService()
    const tokenResult = await config.resolveGitHubToken()

    if (isErr(tokenResult)) {
      fileLog.error('GITHUB', 'Failed to resolve token', { error: tokenResult.error.message })
      return err({ code: AppErrorCode.GITHUB_ERROR, message: tokenResult.error.message })
    }

    this.token = tokenResult.value

    if (!this.token) {
      log.error('No GitHub token available')
      log.info('Configure with: mbf config set github.token <token>')
      log.info('Or authenticate with: gh auth login')
      fileLog.error('GITHUB', 'No GitHub token available', { reason: 'not_configured' })
      return err({ code: AppErrorCode.GITHUB_ERROR, message: 'No GitHub token available' })
    }

    log.debug('GitHub token resolved')
    fileLog.info('GITHUB', 'GitHub service initialized')
    return ok(undefined)
  }

  /**
   * Makes a request to the GitHub API.
   *
   * @param endpoint - API endpoint
   * @param options - Fetch options
   * @returns API response with data or error
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<IGitHubApiResponse<T>> {
    if (!this.token) {
      return { error: 'No GitHub token', status: 0 }
    }

    try {
      const response = await fetch(`${GITHUB_API}${endpoint}`, {
        ...options,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${this.token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage =
          (data as { message?: string }).message || `HTTP ${response.status}`
        return { error: errorMessage, status: response.status }
      }

      return { data: data as T, status: response.status }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { error: message, status: 0 }
    }
  }

  /**
   * Creates a repository from a template.
   *
   * @param options - Repository options
   * @returns Result with repository URL and clone URL
   */
  async createRepoFromTemplate(
    options: IGitHubRepoOptions
  ): Promise<Result<IGitHubRepoResult, ResultError<typeof AppErrorCode.GITHUB_ERROR>>> {
    const templateOwner = options.templateOwner || 'MKS2508'
    const templateRepo = options.templateRepo || 'mks-telegram-bot'

    const userResult = await this.getAuthenticatedUser()
    if (isErr(userResult)) {
      return err(userResult.error)
    }

    const owner = options.owner || userResult.value

    if (!owner) {
      return err({ code: AppErrorCode.GITHUB_ERROR, message: 'Could not determine repository owner' })
    }

    log.info(`Creating repo ${options.name} from template ${templateOwner}/${templateRepo}`)

    const result = await this.request<{
      html_url: string
      clone_url: string
      full_name: string
    }>(`/repos/${templateOwner}/${templateRepo}/generate`, {
      method: 'POST',
      body: JSON.stringify({
        owner,
        name: options.name,
        description: options.description || `Telegram bot created with mks-bot-father`,
        private: options.private ?? true,
        include_all_branches: false,
      }),
    })

    if (result.error) {
      log.error(`Failed to create repo: ${result.error}`)
      return err({ code: AppErrorCode.GITHUB_ERROR, message: result.error })
    }

    log.success(`Repository created: ${result.data?.html_url}`)
    return ok({
      success: true,
      repoUrl: result.data?.html_url,
      cloneUrl: result.data?.clone_url,
    })
  }

  /**
   * Creates a new repository.
   *
   * @param options - Repository options
   * @returns Result with repository URL and clone URL
   */
  async createRepo(
    options: IGitHubRepoOptions
  ): Promise<Result<IGitHubRepoResult, ResultError<typeof AppErrorCode.GITHUB_ERROR>>> {
    const userResult = await this.getAuthenticatedUser()
    if (isErr(userResult)) {
      return err(userResult.error)
    }

    const owner = options.owner || userResult.value

    if (!owner) {
      return err({ code: AppErrorCode.GITHUB_ERROR, message: 'Could not determine repository owner' })
    }

    log.info(`Creating repo ${options.name}`)
    fileLog.info('GITHUB', 'Creating repository', {
      name: options.name,
      owner,
      private: options.private
    })

    const isOrgResult = await this.isOrganization(owner)
    const isOrg = isOk(isOrgResult) && isOrgResult.value
    const endpoint = isOrg ? `/orgs/${owner}/repos` : '/user/repos'

    const result = await this.request<{
      html_url: string
      clone_url: string
      full_name: string
    }>(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        name: options.name,
        description: options.description || `Telegram bot created with mks-bot-father`,
        private: options.private ?? true,
        auto_init: false,
      }),
    })

    if (result.error) {
      log.error(`Failed to create repo: ${result.error}`)
      fileLog.error('GITHUB', 'Failed to create repository', {
        name: options.name,
        error: result.error,
        status: result.status
      })
      return err({ code: AppErrorCode.GITHUB_ERROR, message: result.error })
    }

    log.success(`Repository created: ${result.data?.html_url}`)
    fileLog.info('GITHUB', 'Repository created', {
      name: options.name,
      fullName: result.data?.full_name,
      url: result.data?.html_url
    })
    return ok({
      success: true,
      repoUrl: result.data?.html_url,
      cloneUrl: result.data?.clone_url,
    })
  }

  /**
   * Gets the authenticated GitHub username.
   *
   * @returns Result with the username or error
   */
  async getAuthenticatedUser(): Promise<Result<string | undefined, ResultError<typeof AppErrorCode.GITHUB_ERROR>>> {
    const result = await this.request<{ login: string }>('/user')
    if (result.error) {
      return err({ code: AppErrorCode.GITHUB_ERROR, message: result.error })
    }
    return ok(result.data?.login)
  }

  /**
   * Checks if a name belongs to an organization.
   *
   * @param name - The username or organization name
   * @returns Result with true if it's an organization
   */
  async isOrganization(name: string): Promise<Result<boolean, ResultError<typeof AppErrorCode.GITHUB_ERROR>>> {
    const result = await this.request<{ type: string }>(`/users/${name}`)
    if (result.error) {
      return err({ code: AppErrorCode.GITHUB_ERROR, message: result.error })
    }
    return ok(result.data?.type === 'Organization')
  }

  /**
   * Checks if a repository exists.
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @returns Result with true if the repository exists
   */
  async repoExists(owner: string, repo: string): Promise<Result<boolean, ResultError<typeof AppErrorCode.GITHUB_ERROR>>> {
    const result = await this.request(`/repos/${owner}/${repo}`)
    return ok(result.status === 200)
  }

  /**
   * Pushes local code to a GitHub repository.
   *
   * @param repoUrl - The repository clone URL
   * @param localPath - Path to the local project
   * @param branch - Branch name to push to
   * @returns Result indicating success or error
   */
  async pushToRepo(
    repoUrl: string,
    localPath: string,
    branch = 'main'
  ): Promise<Result<IGitHubPushResult, ResultError<typeof AppErrorCode.GITHUB_ERROR>>> {
    fileLog.info('GITHUB', 'Pushing to repository', { localPath, branch })

    const result = await tryCatchAsync(async () => {
      const gitInit = Bun.spawn(['git', 'init'], {
        cwd: localPath,
        stdout: 'pipe',
        stderr: 'pipe',
      })
      await gitInit.exited

      const gitAdd = Bun.spawn(['git', 'add', '.'], {
        cwd: localPath,
        stdout: 'pipe',
        stderr: 'pipe',
      })
      await gitAdd.exited

      const gitCommit = Bun.spawn(
        ['git', 'commit', '-m', 'Initial commit from mks-bot-father'],
        {
          cwd: localPath,
          stdout: 'pipe',
          stderr: 'pipe',
        }
      )
      await gitCommit.exited

      const gitBranch = Bun.spawn(['git', 'branch', '-M', branch], {
        cwd: localPath,
        stdout: 'pipe',
        stderr: 'pipe',
      })
      await gitBranch.exited

      const gitRemote = Bun.spawn(['git', 'remote', 'add', 'origin', repoUrl], {
        cwd: localPath,
        stdout: 'pipe',
        stderr: 'pipe',
      })
      await gitRemote.exited

      const gitPush = Bun.spawn(['git', 'push', '-u', 'origin', branch], {
        cwd: localPath,
        stdout: 'pipe',
        stderr: 'pipe',
      })
      const pushExitCode = await gitPush.exited

      if (pushExitCode !== 0) {
        const stderr = await new Response(gitPush.stderr).text()
        throw new Error(stderr || 'Failed to push')
      }

      log.success('Code pushed to GitHub')
      fileLog.info('GITHUB', 'Code pushed successfully', { localPath, branch })
      return { success: true } as IGitHubPushResult
    }, AppErrorCode.GITHUB_ERROR)

    if (isErr(result)) {
      fileLog.error('GITHUB', 'Failed to push to repository', {
        localPath,
        branch,
        error: result.error.message
      })
    }

    return result
  }
}

let instance: GitHubService | null = null

/**
 * Gets the singleton GitHubService instance.
 *
 * @returns The GitHubService instance
 */
export function getGitHubService(): GitHubService {
  if (!instance) {
    instance = new GitHubService()
  }
  return instance
}
