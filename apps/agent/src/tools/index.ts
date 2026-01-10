/**
 * MCP Tools Index.
 *
 * Exports all custom MCP servers for the Bot Manager Agent.
 */

export { botManagerServer } from './bot-manager.js'
export { githubServer } from './github.js'
export { coolifyServer } from './coolify.js'
export { codeExecutorServer } from './code-executor.js'

import { botManagerServer } from './bot-manager.js'
import { githubServer } from './github.js'
import { coolifyServer } from './coolify.js'
import { codeExecutorServer } from './code-executor.js'

export const mcpServers = {
  'bot-manager': botManagerServer,
  'github': githubServer,
  'coolify': coolifyServer,
  'code-executor': codeExecutorServer
}

export const allAllowedTools = [
  'Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob', 'WebSearch', 'Task',

  'mcp__bot-manager__create_bot',
  'mcp__bot-manager__list_bots',
  'mcp__bot-manager__configure_bot',
  'mcp__bot-manager__get_bot_token',

  'mcp__github__create_repo',
  'mcp__github__clone_repo',
  'mcp__github__create_pr',
  'mcp__github__commit_and_push',
  'mcp__github__get_repo_info',
  'mcp__github__get_authenticated_user',
  'mcp__github__is_organization',
  'mcp__github__repo_exists',

  'mcp__coolify__deploy',
  'mcp__coolify__set_env_vars',
  'mcp__coolify__get_deployment_status',
  'mcp__coolify__list_applications',
  'mcp__coolify__delete_application',
  'mcp__coolify__get_application_logs',
  'mcp__coolify__start_application',
  'mcp__coolify__stop_application',
  'mcp__coolify__restart_application',
  'mcp__coolify__get_deployment_history',
  'mcp__coolify__update_application',
  'mcp__coolify__list_servers',
  'mcp__coolify__get_server',
  'mcp__coolify__list_projects',
  'mcp__coolify__list_teams',
  'mcp__coolify__get_server_destinations',
  'mcp__coolify__create_application',

  'mcp__code-executor__execute_command',
  'mcp__code-executor__run_tests',
  'mcp__code-executor__install_dependencies',
  'mcp__code-executor__build_project',
  'mcp__code-executor__lint_project',
  'mcp__code-executor__type_check',
  'mcp__code-executor__get_project_structure'
]
