/**
 * GitHub repository management for mks-bot-father.
 *
 * @module
 */

import { component } from '@mks2508/better-logger'
import { getConfigManager } from '../config/index.js'
import type { IGitHubRepoOptions, IGitHubRepoResult } from '../types.js'

const log = component('GitHub')

const GITHUB_API = 'https://api.github.com'

/**
 * Manages GitHub repository operations.
 *
 * @example
 * ```typescript
 * const github = getGitHubManager()
 * await github.init()
 * const result = await github.createRepo({ name: 'my-bot' })
 * ```
 */
export class GitHubManager {
  private token: string | undefined

  /**
   * Initializes the GitHub manager by resolving the token.
   *
   * @returns True if initialization succeeded
   */
  async init(): Promise<boolean> {
    const config = getConfigManager()
    this.token = await config.resolveGitHubToken()

    if (!this.token) {
      log.error('No GitHub token available')
      log.info('Configure with: mbf config set github.token <token>')
      log.info('Or authenticate with: gh auth login')
      return false
    }

    log.debug('GitHub token resolved')
    return true
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data?: T; error?: string; status: number }> {
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
  ): Promise<IGitHubRepoResult> {
    const templateOwner = options.templateOwner || 'MKS2508'
    const templateRepo = options.templateRepo || 'mks-telegram-bot'
    const owner = options.owner || (await this.getAuthenticatedUser())

    if (!owner) {
      return { success: false, error: 'Could not determine repository owner' }
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
      return { success: false, error: result.error }
    }

    log.success(`Repository created: ${result.data?.html_url}`)
    return {
      success: true,
      repoUrl: result.data?.html_url,
      cloneUrl: result.data?.clone_url,
    }
  }

  /**
   * Creates a new repository.
   *
   * @param options - Repository options
   * @returns Result with repository URL and clone URL
   */
  async createRepo(options: IGitHubRepoOptions): Promise<IGitHubRepoResult> {
    const owner = options.owner || (await this.getAuthenticatedUser())

    if (!owner) {
      return { success: false, error: 'Could not determine repository owner' }
    }

    log.info(`Creating repo ${options.name}`)

    const isOrg = await this.isOrganization(owner)
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
      return { success: false, error: result.error }
    }

    log.success(`Repository created: ${result.data?.html_url}`)
    return {
      success: true,
      repoUrl: result.data?.html_url,
      cloneUrl: result.data?.clone_url,
    }
  }

  /**
   * Gets the authenticated GitHub username.
   *
   * @returns The username or undefined if not authenticated
   */
  async getAuthenticatedUser(): Promise<string | undefined> {
    const result = await this.request<{ login: string }>('/user')
    return result.data?.login
  }

  /**
   * Checks if a name belongs to an organization.
   *
   * @param name - The username or organization name
   * @returns True if it's an organization
   */
  async isOrganization(name: string): Promise<boolean> {
    const result = await this.request<{ type: string }>(`/users/${name}`)
    return result.data?.type === 'Organization'
  }

  /**
   * Checks if a repository exists.
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @returns True if the repository exists
   */
  async repoExists(owner: string, repo: string): Promise<boolean> {
    const result = await this.request(`/repos/${owner}/${repo}`)
    return result.status === 200
  }

  /**
   * Pushes local code to a GitHub repository.
   *
   * @param repoUrl - The repository clone URL
   * @param localPath - Path to the local project
   * @param branch - Branch name to push to
   * @returns Result indicating success or failure
   */
  async pushToRepo(
    repoUrl: string,
    localPath: string,
    branch = 'main'
  ): Promise<{ success: boolean; error?: string }> {
    try {
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
        return { success: false, error: stderr || 'Failed to push' }
      }

      log.success('Code pushed to GitHub')
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }
}

let instance: GitHubManager | null = null

/**
 * Gets the singleton GitHubManager instance.
 *
 * @returns The GitHubManager instance
 */
export function getGitHubManager(): GitHubManager {
  if (!instance) {
    instance = new GitHubManager()
  }
  return instance
}
