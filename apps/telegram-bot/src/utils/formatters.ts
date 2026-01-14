/**
 * Message Formatting Utilities.
 * Includes both legacy Markdown formatters and new TelegramMessageBuilder-based formatters.
 */
import type { AgentResult } from '@mks2508/bot-manager-agent'
import { TelegramMessageBuilder, fmt, type TelegramMessage } from '@mks2508/telegram-message-builder'
import type { IRunningOperation, DangerousOperation, StepStatus } from '../types/agent.js'
import { parseAgentResponse, containsMarkdown } from '../lib/markdown-parser.js'

/** Escape Markdown special characters for MarkdownV2 */
export function escapeMarkdownV2(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1')
}

/** Format code block */
export function codeBlock(code: string, language = ''): string {
  return `\`\`\`${language}\n${code}\n\`\`\``
}

/** Format inline code */
export function inlineCode(text: string): string {
  return `\`${text}\``
}

/** Format bot token (partially hidden) */
export function formatToken(token: string): string {
  if (token.length < 20) return '***hidden***'
  return `${token.slice(0, 10)}...${token.slice(-5)}`
}

/** Format stats message - compact version */
export function formatStatsCompact(result: AgentResult): string {
  const { usage, durationMs } = result
  return `📊 _${usage.inputTokens}/${usage.outputTokens} tokens | $${usage.totalCostUsd.toFixed(4)} | ${(durationMs / 1000).toFixed(1)}s_`
}

/** Format stats message - expanded version */
export function formatStatsExpanded(result: AgentResult): string {
  const { usage, durationMs, toolCalls } = result
  const lines = [
    '📊 *Execution Statistics*',
    '',
    `• *Tokens*: ${usage.inputTokens.toLocaleString()} in / ${usage.outputTokens.toLocaleString()} out`,
    `• *Cost*: $${usage.totalCostUsd.toFixed(4)}`,
    `• *Duration*: ${(durationMs / 1000).toFixed(2)}s`,
    `• *Tools Used*: ${toolCalls.length}`
  ]

  if (toolCalls.length > 0) {
    lines.push('')
    lines.push('*Tool Calls:*')
    const uniqueTools = [...new Set(toolCalls.map((t) => t.tool))]
    for (const tool of uniqueTools.slice(0, 5)) {
      const count = toolCalls.filter((t) => t.tool === tool).length
      lines.push(`  • ${tool}${count > 1 ? ` (x${count})` : ''}`)
    }
    if (uniqueTools.length > 5) {
      lines.push(`  _...and ${uniqueTools.length - 5} more_`)
    }
  }

  return lines.join('\n')
}

/** Determine if stats should be shown expanded */
export function shouldShowExpandedStats(result: AgentResult): boolean {
  return result.durationMs > 5000 || result.toolCalls.length > 3 || result.errors.length > 0
}

/** Format long response with proper chunking */
export function formatLongResponse(text: string, maxLength = 4000): string[] {
  if (text.length <= maxLength) {
    return [text]
  }

  const chunks: string[] = []
  let remaining = text

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining)
      break
    }

    let breakPoint = maxLength

    // Try to break at paragraph
    const paragraphBreak = remaining.lastIndexOf('\n\n', maxLength)
    if (paragraphBreak > maxLength * 0.5) {
      breakPoint = paragraphBreak
    } else {
      // Try to break at line
      const lineBreak = remaining.lastIndexOf('\n', maxLength)
      if (lineBreak > maxLength * 0.5) {
        breakPoint = lineBreak
      } else {
        // Try to break at sentence
        const sentenceBreak = remaining.lastIndexOf('. ', maxLength)
        if (sentenceBreak > maxLength * 0.5) {
          breakPoint = sentenceBreak + 1
        }
      }
    }

    chunks.push(remaining.slice(0, breakPoint))
    remaining = remaining.slice(breakPoint).trimStart()
  }

  // Add part indicators for multiple chunks
  if (chunks.length > 1) {
    return chunks.map((chunk, i) => `_Part ${i + 1}/${chunks.length}_\n\n${chunk}`)
  }

  return chunks
}

/** Format history entry */
export function formatHistoryEntry(
  prompt: string,
  result: string | null,
  timestamp: string,
  index: number
): string {
  const date = new Date(timestamp)
  const formattedDate = date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const truncatedPrompt = prompt.length > 50 ? prompt.slice(0, 47) + '...' : prompt

  const truncatedResult = result
    ? result.length > 100
      ? result.slice(0, 97) + '...'
      : result
    : '_No result_'

  return [`*${index + 1}. ${formattedDate}*`, `> ${truncatedPrompt}`, `${truncatedResult}`].join(
    '\n'
  )
}

/** Format elapsed time */
export function formatElapsedTime(startedAt: Date): string {
  const elapsed = Date.now() - startedAt.getTime()
  const seconds = Math.floor(elapsed / 1000)
  const minutes = Math.floor(seconds / 60)

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

/** Format duration in milliseconds to human readable */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }
  const seconds = ms / 1000
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}m ${remainingSeconds}s`
}

/** Format number with locale separators */
export function formatNumber(num: number): string {
  return num.toLocaleString()
}

/** Truncate text with ellipsis */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

// ============================================================================
// TelegramMessageBuilder-based formatters (HTML mode)
// ============================================================================

/**
 * Build a status message using TelegramMessageBuilder.
 * Returns HTML-formatted message.
 */
export function buildStatusMessage(status: Record<string, string>): TelegramMessage {
  const builder = TelegramMessageBuilder.text()
    .title('Service Status')
    .newline()

  for (const [key, value] of Object.entries(status)) {
    builder.line(key, value)
  }

  return builder.build()
}

/**
 * Build stats message using TelegramMessageBuilder.
 * Supports both compact and expanded modes.
 */
export function buildStatsMessage(result: AgentResult, expanded: boolean): TelegramMessage {
  const builder = TelegramMessageBuilder.text()

  if (expanded) {
    builder
      .title('Execution Statistics')
      .newline()
      .line('Tokens', `${result.usage.inputTokens.toLocaleString()} in / ${result.usage.outputTokens.toLocaleString()} out`)
      .line('Cost', `$${result.usage.totalCostUsd.toFixed(4)}`)
      .line('Duration', `${(result.durationMs / 1000).toFixed(2)}s`)
      .line('Tools Used', `${result.toolCalls.length}`)

    if (result.toolCalls.length > 0) {
      builder.newline().section('Tool Calls')
      const uniqueTools = [...new Set(result.toolCalls.map((t) => t.tool))]
      for (const tool of uniqueTools.slice(0, 5)) {
        const count = result.toolCalls.filter((t) => t.tool === tool).length
        builder.listItem(`${tool}${count > 1 ? ` (x${count})` : ''}`)
      }
      if (uniqueTools.length > 5) {
        builder.text(`\n${fmt.italic(`...and ${uniqueTools.length - 5} more`)}`)
      }
    }
  } else {
    // Compact stats
    const statsLine = `${result.usage.inputTokens}/${result.usage.outputTokens} tokens | $${result.usage.totalCostUsd.toFixed(4)} | ${(result.durationMs / 1000).toFixed(1)}s`
    builder.text(`📊 ${fmt.italic(statsLine)}`)
  }

  return builder.build()
}

/**
 * Build agent response messages using TelegramMessageBuilder.
 * Handles chunking for long responses.
 */
export function buildAgentResponse(text: string, maxLength = 4000): TelegramMessage[] {
  // Use tokenizer + builder for proper HTML construction
  if (containsMarkdown(text)) {
    return parseAgentResponse(text, maxLength)
  }

  // Plain text - just chunk and wrap
  const chunks = formatLongResponse(text, maxLength)
  return chunks.map((chunk) =>
    TelegramMessageBuilder.text().text(chunk).build()
  )
}

/**
 * Build an error message using TelegramMessageBuilder.
 */
export function buildErrorMessage(error: string, details?: string): TelegramMessage {
  const builder = TelegramMessageBuilder.text()
    .text(`❌ ${fmt.bold('Error')}: ${error}`)

  if (details) {
    builder.newline().codeBlock(details)
  }

  return builder.build()
}

/**
 * Build a success message using TelegramMessageBuilder.
 */
export function buildSuccessMessage(message: string, details?: Record<string, string>): TelegramMessage {
  const builder = TelegramMessageBuilder.text()
    .text(`✅ ${fmt.bold(message)}`)

  if (details) {
    builder.newline()
    for (const [key, value] of Object.entries(details)) {
      builder.line(key, value)
    }
  }

  return builder.build()
}

/**
 * Build a progress message using TelegramMessageBuilder.
 */
export function buildProgressMessage(
  status: string,
  currentStep: number,
  totalSteps: number,
  toolName?: string
): TelegramMessage {
  const percentage = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0
  const progressBar = buildProgressBar(percentage)

  const builder = TelegramMessageBuilder.text()
    .text(`🔄 ${fmt.bold(status)}`)
    .newline()
    .text(progressBar)
    .text(` ${percentage}%`)

  if (toolName) {
    builder.newline().text(`🔧 ${fmt.code(toolName)}`)
  }

  return builder.build()
}

/**
 * Build a visual progress bar.
 */
function buildProgressBar(percentage: number, width = 10): string {
  const filled = Math.round((percentage / 100) * width)
  const empty = width - filled
  return '█'.repeat(filled) + '░'.repeat(empty)
}

/**
 * Build history entry using TelegramMessageBuilder.
 */
export function buildHistoryEntry(
  prompt: string,
  result: string | null,
  timestamp: string,
  index: number
): TelegramMessage {
  const date = new Date(timestamp)
  const formattedDate = date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const truncatedPrompt = prompt.length > 50 ? prompt.slice(0, 47) + '...' : prompt
  const truncatedResult = result
    ? result.length > 100 ? result.slice(0, 97) + '...' : result
    : 'No result'

  return TelegramMessageBuilder.text()
    .text(`${fmt.bold(`${index + 1}. ${formattedDate}`)}`)
    .newline()
    .text(`> ${truncatedPrompt}`)
    .newline()
    .text(fmt.italic(truncatedResult))
    .build()
}

// ============================================================================
// Command Messages (HTML mode)
// ============================================================================

/**
 * Build welcome message for /start command.
 */
export function buildWelcomeMessage(): TelegramMessage {
  return TelegramMessageBuilder.text()
    .text(`🤖 ${fmt.bold('Bot Manager Agent')}`)
    .newline().newline()
    .text('I can help you manage Telegram bots, GitHub repos, and Coolify deployments.')
    .newline().newline()
    .text(fmt.bold('Commands:'))
    .newline()
    .text('/menu - Interactive menu').newline()
    .text('/help - Show all commands').newline()
    .text('/status - Check service status').newline()
    .text('/bots - List your bots').newline()
    .text('/history - Recent actions').newline()
    .text('/cancel - Cancel running operation').newline()
    .text('/clear - Clear conversation')
    .newline().newline()
    .text('Just send me a message describing what you want to do!')
    .build()
}

/**
 * Build help message for /help command.
 */
export function buildHelpMessage(): TelegramMessage {
  return TelegramMessageBuilder.text()
    .text(`📚 ${fmt.bold('Available Commands')}`)
    .newline().newline()
    .text('/start - Welcome message').newline()
    .text('/menu - Interactive menu with buttons').newline()
    .text('/help - This help message').newline()
    .text('/status - Check configured services').newline()
    .text('/bots - List all your bots').newline()
    .text('/history - View recent actions').newline()
    .text('/cancel - Cancel current operation').newline()
    .text('/clear - Clear conversation history')
    .newline().newline()
    .text(fmt.bold('Example requests:'))
    .newline()
    .text('• "Create a bot called my-bot"').newline()
    .text('• "Deploy my-bot to Coolify"').newline()
    .text('• "List my bots"').newline()
    .text('• "Clone repo and run tests"')
    .newline().newline()
    .text(`💡 ${fmt.italic('Tip: Dangerous operations will ask for confirmation')}`)
    .build()
}

/**
 * Build menu header message for /menu command.
 */
export function buildMenuMessage(): TelegramMessage {
  return TelegramMessageBuilder.text()
    .text(`🎛️ ${fmt.bold('Main Menu')}`)
    .newline().newline()
    .text('Select an action:')
    .build()
}

/**
 * Build cancellation message for /cancel command.
 */
export function buildCancellationMessage(count: number): TelegramMessage {
  if (count === 0) {
    return TelegramMessageBuilder.text()
      .text('ℹ️ No operations are currently running.')
      .build()
  }

  return TelegramMessageBuilder.text()
    .text(`🛑 Cancelled ${count} operation(s).`)
    .build()
}

/**
 * Build history page message.
 */
export function buildHistoryPageMessage(
  total: number,
  startIndex: number,
  endIndex: number
): TelegramMessage {
  return TelegramMessageBuilder.text()
    .text(`📜 ${fmt.bold('Recent Actions')} (${startIndex + 1}-${endIndex} of ${total})`)
    .build()
}

/**
 * Build no history message.
 */
export function buildNoHistoryMessage(): TelegramMessage {
  return TelegramMessageBuilder.text()
    .text('📜 No history yet. Start by sending me a message!')
    .build()
}

// ============================================================================
// Confirmation Messages (HTML mode)
// ============================================================================

const CONFIRMATION_TITLES: Record<DangerousOperation, string> = {
  create_bot: 'Confirm Bot Creation',
  create_repo: 'Confirm Repository Creation',
  deploy: 'Confirm Deployment',
  commit_push: 'Confirm Push',
  delete_bot: 'Confirm Deletion'
}

const CONFIRMATION_DESCRIPTIONS: Record<DangerousOperation, string[]> = {
  create_bot: [
    "You're about to create a new Telegram bot.",
    '',
    'This will:',
    '• Connect to @BotFather',
    '• Create a new bot',
    '• Generate a bot token'
  ],
  create_repo: ["You're about to create a new GitHub repository."],
  deploy: ["You're about to deploy to Coolify."],
  commit_push: ["You're about to commit and push changes to GitHub."],
  delete_bot: ['⚠️ This action is irreversible!']
}

/**
 * Build confirmation dialog message.
 */
export function buildConfirmationMessage(
  operation: DangerousOperation,
  prompt: string
): TelegramMessage {
  const promptPreview = prompt.length > 100 ? prompt.slice(0, 97) + '...' : prompt
  const isDelete = operation === 'delete_bot'
  const icon = isDelete ? '🚨' : '⚠️'

  const builder = TelegramMessageBuilder.text()
    .text(`${icon} ${fmt.bold(CONFIRMATION_TITLES[operation])}`)
    .newline().newline()

  for (const line of CONFIRMATION_DESCRIPTIONS[operation]) {
    builder.text(line).newline()
  }

  builder
    .newline()
    .text(fmt.italic(`"${promptPreview}"`))
    .newline().newline()
    .text(`⏰ ${fmt.italic('Expires in 60 seconds')}`)

  return builder.build()
}

/**
 * Build confirmation result message (confirmed or cancelled).
 */
export function buildConfirmationResultMessage(
  confirmed: boolean,
  prompt: string
): TelegramMessage {
  const promptPreview = prompt.length > 100 ? prompt.slice(0, 97) + '...' : prompt

  if (confirmed) {
    return TelegramMessageBuilder.text()
      .text(`✅ ${fmt.bold('Confirmed')}`)
      .newline().newline()
      .text(`Executing: ${fmt.italic(`"${promptPreview}"`)}`)
      .build()
  }

  return TelegramMessageBuilder.text()
    .text(`❌ ${fmt.bold('Cancelled')}`)
    .newline().newline()
    .text(fmt.italic(`"${promptPreview}"`))
    .build()
}

/**
 * Build expiration message when confirmation times out.
 */
export function buildExpirationMessage(prompt: string): TelegramMessage {
  const promptPreview = prompt.length > 100 ? prompt.slice(0, 97) + '...' : prompt

  return TelegramMessageBuilder.text()
    .text(`⌛ ${fmt.bold('Confirmation Expired')}`)
    .newline().newline()
    .text(fmt.italic(`"${promptPreview}"`))
    .newline().newline()
    .text('Please try again.')
    .build()
}

// ============================================================================
// Operation Progress Messages (HTML mode)
// ============================================================================

function getStepIcon(status: StepStatus): string {
  switch (status) {
    case 'completed':
      return '✅'
    case 'running':
      return '🔄'
    case 'failed':
      return '❌'
    case 'pending':
      return '⬜'
  }
}

/**
 * Build operation progress message with steps.
 */
export function buildOperationProgressMessage(operation: IRunningOperation): TelegramMessage {
  const elapsed = formatElapsedTime(operation.startedAt)
  const promptPreview = operation.prompt.length > 40
    ? operation.prompt.slice(0, 37) + '...'
    : operation.prompt

  const builder = TelegramMessageBuilder.text()
    .text(`⏳ ${fmt.bold(promptPreview)}`)
    .newline()
    .text(fmt.italic(`Elapsed: ${elapsed}`))
    .newline()

  for (const step of operation.steps) {
    const icon = getStepIcon(step.status)
    let stepLine = `${icon} Step ${step.index}/${step.total}: ${step.name}`

    if (step.status === 'completed' && step.startedAt && step.completedAt) {
      const duration = step.completedAt.getTime() - step.startedAt.getTime()
      stepLine += ` (${(duration / 1000).toFixed(1)}s)`
    } else if (step.status === 'running') {
      stepLine += ' ...'
    } else if (step.status === 'failed' && step.error) {
      stepLine += ` - ${step.error}`
    }

    builder.newline().text(stepLine)
  }

  return builder.build()
}

/**
 * Build operation cancelled message.
 */
export function buildOperationCancelledMessage(byUser = false): TelegramMessage {
  const builder = TelegramMessageBuilder.text()
    .text(`🛑 ${fmt.bold('Operation Cancelled')}`)

  if (byUser) {
    builder.newline().newline().text('The operation was cancelled by user.')
  }

  return builder.build()
}

/**
 * Build bot created success message.
 */
export function buildBotCreatedMessage(): TelegramMessage {
  return TelegramMessageBuilder.text()
    .text(`🎉 ${fmt.bold('Bot Created Successfully!')}`)
    .newline().newline()
    .text('What would you like to do next?')
    .build()
}

// ============================================================================
// Tool Execution Summary (HTML mode)
// ============================================================================

interface IToolExecutionSummary {
  tool: string
  startTime: number
  endTime?: number
  duration?: number
  error?: string
}

const TOOL_ICONS: Record<string, string> = {
  'bot-manager': '🤖',
  'github': '📦',
  'coolify': '🚀',
  'code-executor': '⚙️',
  'telegram-messenger': '📱',
  'Read': '📖',
  'Edit': '✏️',
  'Write': '📝',
  'Bash': '💻',
  'Glob': '🔍',
  'Grep': '🔎',
  'WebSearch': '🌐',
  'Task': '📋',
}

function getToolIconForSummary(tool: string): string {
  for (const [key, icon] of Object.entries(TOOL_ICONS)) {
    if (tool.toLowerCase().includes(key.toLowerCase())) {
      return icon
    }
  }
  return '🔧'
}

function truncateToolNameForSummary(tool: string): string {
  const parts = tool.split('__')
  return parts[parts.length - 1] || tool
}

/**
 * Build a summary of tool executions for display after agent completes.
 */
export function buildToolExecutionSummary(executions: IToolExecutionSummary[]): TelegramMessage {
  const builder = TelegramMessageBuilder.text()
    .text(`📊 ${fmt.bold('Tools Ejecutados')}`)
    .newline()

  if (executions.length === 0) {
    builder.newline().text(fmt.italic('No tools executed'))
    return builder.build()
  }

  // Group tools by name and count
  const toolCounts = new Map<string, { count: number; totalDuration: number; errors: number }>()

  for (const exec of executions) {
    const toolName = truncateToolNameForSummary(exec.tool)
    const existing = toolCounts.get(toolName) || { count: 0, totalDuration: 0, errors: 0 }
    existing.count++
    existing.totalDuration += exec.duration || 0
    if (exec.error) existing.errors++
    toolCounts.set(toolName, existing)
  }

  builder.newline()

  for (const [toolName, stats] of toolCounts) {
    const icon = getToolIconForSummary(toolName)
    const avgDuration = stats.count > 0 ? Math.round(stats.totalDuration / stats.count) : 0
    const statusIcon = stats.errors > 0 ? '⚠️' : '✅'

    let line = `${statusIcon} ${icon} ${toolName}`
    if (stats.count > 1) {
      line += ` (x${stats.count})`
    }
    line += ` ${fmt.code(`${avgDuration}ms`)}`

    builder.text(line).newline()
  }

  // Total summary
  const totalDuration = executions.reduce((sum, e) => sum + (e.duration || 0), 0)
  const totalErrors = executions.filter(e => e.error).length

  builder.newline()
  builder.text(fmt.italic(`Total: ${executions.length} tools | ${formatDuration(totalDuration)}`))

  if (totalErrors > 0) {
    builder.newline().text(`⚠️ ${fmt.italic(`${totalErrors} error(s)`)}`)
  }

  return builder.build()
}

// ============================================================================
// Session Management Messages (HTML mode)
// ============================================================================

import type { SessionMetadata, CompactResult } from '@mks2508/bot-manager-agent'

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'ahora'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString()
}

/**
 * Build session list message for /sessions command.
 */
export function buildSessionListMessage(sessions: SessionMetadata[]): TelegramMessage {
  const builder = TelegramMessageBuilder.text()
    .text(`📂 ${fmt.bold('Sesiones Disponibles')}`)
    .newline().newline()

  for (const session of sessions.slice(0, 10)) {
    const name = session.name || session.sessionId.slice(0, 20)
    const time = formatRelativeTime(session.lastMessageAt)
    const msgs = session.messageCount

    let line = `• ${fmt.code(name)}`
    line += ` - ${msgs} msg`
    if (session.gitBranch) {
      line += ` - 🌿 ${session.gitBranch}`
    }
    line += ` - ${time}`

    builder.text(line).newline()
  }

  builder
    .newline()
    .text(fmt.italic('Selecciona una sesión para restaurarla'))

  return builder.build()
}

/**
 * Build context stats message for /context command.
 */
export function buildContextStatsMessage(stats: {
  sessionId: string
  messageCount: number
  estimatedTokens: number
  threshold: number
  percentUsed: number
  shouldCompact: boolean
}): TelegramMessage {
  const progressBar = buildProgressBarSession(stats.percentUsed)
  const statusIcon = stats.shouldCompact ? '⚠️' : '✅'

  const builder = TelegramMessageBuilder.text()
    .text(`📊 ${fmt.bold('Context Stats')}`)
    .newline().newline()
    .line('Session', fmt.code(stats.sessionId.slice(0, 20)))
    .line('Messages', `${stats.messageCount}`)
    .line('Tokens', `${stats.estimatedTokens.toLocaleString()} / ${stats.threshold.toLocaleString()}`)
    .newline()
    .text(progressBar)
    .text(` ${stats.percentUsed.toFixed(1)}%`)
    .newline().newline()

  if (stats.shouldCompact) {
    builder.text(`${statusIcon} ${fmt.italic('Recomendado: /compact para reducir contexto')}`)
  } else {
    builder.text(`${statusIcon} ${fmt.italic('Contexto dentro de límites normales')}`)
  }

  return builder.build()
}

function buildProgressBarSession(percentage: number, width = 10): string {
  const filled = Math.min(width, Math.round((percentage / 100) * width))
  const empty = width - filled
  return '█'.repeat(filled) + '░'.repeat(empty)
}

/**
 * Build compaction result message for /compact command.
 */
export function buildCompactResultMessage(result: CompactResult): TelegramMessage {
  const builder = TelegramMessageBuilder.text()

  if (result.success) {
    const reduction = result.previousTokens > 0
      ? ((1 - result.newTokens / result.previousTokens) * 100).toFixed(1)
      : '0'

    builder
      .text(`✅ ${fmt.bold('Compactación Completada')}`)
      .newline().newline()
      .line('Tokens antes', `${result.previousTokens.toLocaleString()}`)
      .line('Tokens después', `${result.newTokens.toLocaleString()}`)
      .line('Reducción', `${reduction}%`)
      .newline()
      .text(fmt.italic('El resumen de la sesión ha sido guardado.'))
  } else {
    builder
      .text(`❌ ${fmt.bold('Error en Compactación')}`)
      .newline().newline()
      .text(result.summary)
  }

  return builder.build()
}
