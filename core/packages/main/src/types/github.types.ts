/**
 * GitHub types for mks-bot-father.
 *
 * @module
 */

/**
 * Options for creating a GitHub repository.
 */
export interface IGitHubRepoOptions {
  /** Repository name */
  name: string
  /** Repository description */
  description?: string
  /** Whether the repository should be private */
  private?: boolean
  /** Owner (user or organization) */
  owner?: string
  /** Template repository owner */
  templateOwner?: string
  /** Template repository name */
  templateRepo?: string
}

/**
 * Result of a GitHub repository operation.
 */
export interface IGitHubRepoResult {
  /** Whether the operation succeeded */
  success: boolean
  /** URL of the created repository */
  repoUrl?: string
  /** Clone URL */
  cloneUrl?: string
  /** Error message if failed */
  error?: string
}

/**
 * GitHub push operation result.
 */
export interface IGitHubPushResult {
  /** Whether the push succeeded */
  success: boolean
  /** Error message if failed */
  error?: string
}
