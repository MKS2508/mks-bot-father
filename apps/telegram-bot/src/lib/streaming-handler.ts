/**
 * Streaming Handler for Telegram Bot.
 *
 * Provides real-time feedback during agent execution via message editing.
 * Uses debouncing to respect Telegram rate limits.
 */

import type { Telegram } from 'telegraf'

export interface IToolExecution {
  tool: string
  toolId: string
  input: unknown
  startTime: number
  endTime?: number
  duration?: number
  result?: unknown
  error?: string
  resultSummary?: string
}

interface IStreamingState {
  chatId: number
  threadId?: number
  statusMessageId?: number
  currentText: string
  toolExecutions: IToolExecution[]
  thinkingText: string
  lastUpdate: number
  pendingUpdate: boolean
  // Streaming content (accumulated from stream_event)
  streamedText: string
  streamedThinking: string
}

const UPDATE_DEBOUNCE_MS = 1500
const TOOL_UPDATE_MIN_INTERVAL_MS = 350 // Minimum time between tool updates (Telegram rate limit)
const MAX_TOOL_HISTORY = 15
const MAX_MESSAGE_LENGTH = 4000 // Telegram limit is 4096, leave some margin

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

function getToolIcon(tool: string): string {
  for (const [key, icon] of Object.entries(TOOL_ICONS)) {
    if (tool.toLowerCase().includes(key.toLowerCase())) {
      return icon
    }
  }
  return '🔧'
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function truncateToolName(tool: string): string {
  const parts = tool.split('__')
  return parts[parts.length - 1] || tool
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function formatToolInput(tool: string, input: unknown): string | null {
  if (!input || typeof input !== 'object') return null

  const params = input as Record<string, unknown>
  const toolLower = tool.toLowerCase()

  // Read tool
  if (toolLower.includes('read')) {
    const filePath = params.file_path as string
    if (filePath) {
      const fileName = filePath.split('/').pop() || filePath
      const offset = params.offset as number | undefined
      const limit = params.limit as number | undefined
      if (offset !== undefined && limit !== undefined) {
        return `📖 ${fileName} (lines ${offset}-${offset + limit})`
      }
      return `📖 ${fileName}`
    }
  }

  // Edit tool
  if (toolLower.includes('edit')) {
    const filePath = params.file_path as string
    if (filePath) {
      const fileName = filePath.split('/').pop() || filePath
      return `✏️ ${fileName}`
    }
  }

  // Write tool
  if (toolLower.includes('write')) {
    const filePath = params.file_path as string
    if (filePath) {
      const fileName = filePath.split('/').pop() || filePath
      return `📝 ${fileName}`
    }
  }

  // Bash tool
  if (toolLower.includes('bash')) {
    const command = params.command as string
    if (command) {
      const shortCmd = command.length > 50 ? command.slice(0, 50) + '...' : command
      return `💻 ${shortCmd}`
    }
  }

  // Glob tool
  if (toolLower.includes('glob')) {
    const pattern = params.pattern as string
    if (pattern) {
      return `🔍 ${pattern}`
    }
  }

  // Grep tool
  if (toolLower.includes('grep')) {
    const pattern = params.pattern as string
    const path = params.path as string | undefined
    if (pattern) {
      const pathPart = path ? ` in ${path.split('/').pop()}` : ''
      return `🔎 "${pattern}"${pathPart}`
    }
  }

  // GitHub tools
  if (toolLower.includes('github')) {
    if (toolLower.includes('create_repo')) {
      const name = params.name as string
      return name ? `📦 Creating ${name}` : null
    }
    if (toolLower.includes('commit')) {
      const message = params.message as string
      const shortMsg = message && message.length > 40 ? message.slice(0, 40) + '...' : message
      return shortMsg ? `📦 "${shortMsg}"` : null
    }
  }

  // Coolify tools
  if (toolLower.includes('coolify')) {
    if (toolLower.includes('deploy')) {
      return '🚀 Deploying...'
    }
    if (toolLower.includes('create_application')) {
      const name = params.name as string
      return name ? `🚀 Creating ${name}` : null
    }
  }

  // Bot manager tools
  if (toolLower.includes('bot-manager')) {
    if (toolLower.includes('create_bot')) {
      const name = params.name as string
      return name ? `🤖 Creating @${name}_bot` : null
    }
  }

  return null
}

/**
 * Extract text content from tool result (handles various formats)
 */
function extractResultContent(result: unknown): string | null {
  if (typeof result === 'string') {
    return result
  }
  if (result && typeof result === 'object') {
    const obj = result as Record<string, unknown>
    // SDK format: { content: [{ type: 'text', text: '...' }] }
    if (Array.isArray(obj.content)) {
      const textBlock = obj.content.find(
        (b: unknown) => (b as Record<string, unknown>)?.type === 'text'
      ) as Record<string, unknown> | undefined
      if (textBlock?.text) {
        return String(textBlock.text)
      }
    }
    // Direct text property
    if (typeof obj.text === 'string') {
      return obj.text
    }
    // Output property (common in bash results)
    if (typeof obj.output === 'string') {
      return obj.output
    }
  }
  return null
}

function formatToolResult(tool: string, result: unknown, isError: boolean): string {
  if (isError) {
    const errorMsg = typeof result === 'string' ? result : JSON.stringify(result)
    const shortError = errorMsg.slice(0, 80)
    return `→ ❌ ${shortError}${errorMsg.length > 80 ? '...' : ''}`
  }

  const toolLower = tool.toLowerCase()
  const content = extractResultContent(result)

  // Read tool - show line count
  if (toolLower.includes('read')) {
    if (content) {
      const lineCount = content.split('\n').length
      return `→ ${lineCount} líneas`
    }
    return '→ Leído'
  }

  // Edit tool - show what was changed
  if (toolLower.includes('edit')) {
    if (content?.includes('updated') || content?.includes('edited')) {
      return '→ Modificado ✓'
    }
    return '→ Editado'
  }

  // Write tool
  if (toolLower.includes('write')) {
    return '→ Escrito ✓'
  }

  // Bash tool - show output preview
  if (toolLower.includes('bash')) {
    if (content) {
      // Clean and truncate output
      const cleaned = content.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
      if (cleaned.length > 0) {
        const preview = cleaned.slice(0, 40)
        return `→ ${preview}${cleaned.length > 40 ? '...' : ''}`
      }
    }
    return '→ Ejecutado'
  }

  // Glob tool - show file count
  if (toolLower.includes('glob')) {
    if (content) {
      const lines = content.split('\n').filter(l => l.trim())
      return `→ ${lines.length} archivos`
    }
    if (Array.isArray(result)) {
      return `→ ${result.length} archivos`
    }
    return '→ Búsqueda completada'
  }

  // Grep tool - show match count
  if (toolLower.includes('grep')) {
    if (content) {
      const lines = content.split('\n').filter(l => l.trim())
      if (lines.length > 0) {
        return `→ ${lines.length} coincidencias`
      }
    }
    return '→ Sin coincidencias'
  }

  // Bot manager
  if (toolLower.includes('bot-manager')) {
    if (toolLower.includes('create_bot')) {
      const resultStr = String(result)
      const match = resultStr.match(/@(\w+_bot)/)
      if (match) return `→ Created ${match[1]}`
      return '→ Bot creado'
    }
    if (toolLower.includes('list_bots')) {
      return '→ Listado'
    }
  }

  // Env manager
  if (toolLower.includes('env-manager')) {
    if (toolLower.includes('list_configured')) {
      if (content) {
        try {
          const parsed = JSON.parse(content) as { bots?: unknown[] }
          if (parsed.bots) {
            return `→ ${parsed.bots.length} bots`
          }
        } catch { /* ignore */ }
      }
      return '→ Listado'
    }
    return '→ Completado'
  }

  // GitHub tools
  if (toolLower.includes('github')) {
    if (toolLower.includes('create_repo')) {
      return '→ Repo creado'
    }
    if (toolLower.includes('commit')) {
      return '→ Commit realizado'
    }
  }

  // Coolify tools
  if (toolLower.includes('coolify')) {
    if (toolLower.includes('deploy')) {
      return '→ Desplegado'
    }
    if (toolLower.includes('create_application')) {
      return '→ App creada'
    }
  }

  // Task tool
  if (toolLower.includes('task')) {
    return '→ Tarea completada'
  }

  // WebSearch
  if (toolLower.includes('websearch')) {
    return '→ Búsqueda web'
  }

  return '→ ✓'
}

export class StreamingHandler {
  private telegram: Telegram
  private state: IStreamingState
  private updateTimeout: ReturnType<typeof setTimeout> | null = null

  constructor(telegram: Telegram, chatId: number, threadId?: number) {
    this.telegram = telegram
    this.state = {
      chatId,
      threadId,
      currentText: '',
      toolExecutions: [],
      thinkingText: '',
      lastUpdate: 0,
      pendingUpdate: false,
      streamedText: '',
      streamedThinking: ''
    }
  }

  async start(initialStatus: string): Promise<void> {
    try {
      const msg = await this.telegram.sendMessage(
        this.state.chatId,
        `🤔 ${initialStatus}`,
        {
          message_thread_id: this.state.threadId,
          parse_mode: 'HTML'
        }
      )
      this.state.statusMessageId = msg.message_id
    } catch {
      // Ignore send errors - status messages are optional
    }
  }

  async onThinking(text: string): Promise<void> {
    this.state.thinkingText = text
    await this.scheduleUpdate()
  }

  async onToolStart(tool: string, toolId: string, input: unknown): Promise<void> {
    this.state.toolExecutions.push({
      tool,
      toolId,
      input,
      startTime: Date.now()
    })
    // Force immediate update for tool events (with rate limiting)
    await this.forceToolUpdate()
  }

  async onToolComplete(toolId: string, result: unknown, isError: boolean): Promise<void> {
    const exec = this.state.toolExecutions.find(e => e.toolId === toolId && !e.endTime)
    if (exec) {
      exec.endTime = Date.now()
      exec.duration = exec.endTime - exec.startTime
      if (isError) {
        exec.error = typeof result === 'string' ? result : JSON.stringify(result).slice(0, 100)
      } else {
        exec.result = result
      }
      exec.resultSummary = formatToolResult(exec.tool, result, isError)
    }
    // Force immediate update for tool events (with rate limiting)
    await this.forceToolUpdate()
  }

  /**
   * Force immediate update for tool events with minimal rate limiting.
   * This ensures each tool start/complete is visible to the user.
   */
  private async forceToolUpdate(): Promise<void> {
    // Cancel any pending debounced update
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout)
      this.updateTimeout = null
      this.state.pendingUpdate = false
    }

    const now = Date.now()
    const timeSinceLastUpdate = now - this.state.lastUpdate

    // Respect Telegram rate limits with minimal interval
    if (timeSinceLastUpdate < TOOL_UPDATE_MIN_INTERVAL_MS) {
      // Schedule update after the minimum interval
      const delay = TOOL_UPDATE_MIN_INTERVAL_MS - timeSinceLastUpdate
      this.updateTimeout = setTimeout(async () => {
        this.updateTimeout = null
        await this.updateStatusMessage()
      }, delay)
      return
    }

    // Update immediately
    await this.updateStatusMessage()
  }

  async onAssistantText(text: string): Promise<void> {
    this.state.currentText = text
    // Don't update status with partial text - save for final message
  }

  async onStreamText(text: string): Promise<void> {
    this.state.streamedText += text
    await this.scheduleUpdate()
  }

  async onStreamThinking(thinking: string): Promise<void> {
    this.state.streamedThinking += thinking
    await this.scheduleUpdate()
  }

  clearStreamedContent(): void {
    this.state.streamedText = ''
    this.state.streamedThinking = ''
  }

  private getAdaptiveDebounce(): number {
    const pendingTool = this.state.toolExecutions.find(e => !e.endTime)

    if (!pendingTool) return UPDATE_DEBOUNCE_MS

    const elapsed = Date.now() - pendingTool.startTime

    // Adaptive debouncing based on tool execution time
    if (elapsed < 2000) return 500   // 0.5s for first 2s
    if (elapsed < 5000) return 1000  // 1s for 2-5s
    return UPDATE_DEBOUNCE_MS         // 1.5s for >5s
  }

  private async scheduleUpdate(): Promise<void> {
    if (this.updateTimeout) {
      this.state.pendingUpdate = true
      return
    }

    const now = Date.now()
    const timeSinceLastUpdate = now - this.state.lastUpdate
    const debounceMs = this.getAdaptiveDebounce()

    if (timeSinceLastUpdate >= debounceMs) {
      await this.updateStatusMessage()
    } else {
      this.state.pendingUpdate = true
      this.updateTimeout = setTimeout(async () => {
        this.updateTimeout = null
        if (this.state.pendingUpdate) {
          this.state.pendingUpdate = false
          await this.updateStatusMessage()
        }
      }, debounceMs - timeSinceLastUpdate)
    }
  }

  private async updateStatusMessage(): Promise<void> {
    if (!this.state.statusMessageId) return

    this.state.lastUpdate = Date.now()
    const statusText = this.buildStatusText()

    try {
      await this.telegram.editMessageText(
        this.state.chatId,
        this.state.statusMessageId,
        undefined,
        statusText,
        { parse_mode: 'HTML' }
      )
    } catch {
      // Ignore edit errors (message not modified, rate limit, etc.)
    }
  }

  private buildStatusText(): string {
    const lines: string[] = []
    const pendingTool = this.state.toolExecutions.find(e => !e.endTime)
    const completed = this.state.toolExecutions.filter(e => e.endTime)

    // Header
    lines.push('⚡ <b>Progreso en vivo</b>')
    lines.push('')

    // Real thinking text (if streaming)
    if (this.state.streamedThinking && !pendingTool) {
      const thinkingPreview = this.state.streamedThinking.slice(-150).trim()
      if (thinkingPreview) {
        lines.push(`🧠 <i>${escapeHtml(thinkingPreview)}</i>`)
        lines.push('')
      }
    }

    // Streamed text preview (if not executing a tool)
    if (this.state.streamedText && !pendingTool) {
      const textPreview = this.state.streamedText.slice(-200).trim()
      if (textPreview) {
        lines.push(`💬 ${escapeHtml(textPreview)}`)
        lines.push('')
      }
    }

    // Current tool being executed
    if (pendingTool) {
      lines.push('🔄 <b>Ejecutando ahora:</b>')

      const elapsed = Date.now() - pendingTool.startTime
      const inputDetails = formatToolInput(pendingTool.tool, pendingTool.input)

      if (inputDetails) {
        lines.push(`  ⏳ ${inputDetails} — ${formatDuration(elapsed)}`)
      } else {
        const icon = getToolIcon(pendingTool.tool)
        const toolName = truncateToolName(pendingTool.tool)
        lines.push(`  ⏳ ${icon} ${toolName} — ${formatDuration(elapsed)}`)
      }
      lines.push('')
    }

    // Completed tools - show recent history
    if (completed.length > 0) {
      const totalCount = this.state.toolExecutions.length
      const completedCount = completed.length

      lines.push(`📊 <b>Historial (${completedCount} de ${totalCount} tools):</b>`)

      // Show last N tools
      const recentTools = completed.slice(-MAX_TOOL_HISTORY)
      for (const exec of recentTools) {
        const icon = exec.error ? '❌' : '✅'
        const duration = exec.duration ? formatDuration(exec.duration) : '?'
        const inputDetails = formatToolInput(exec.tool, exec.input)
        const resultSummary = exec.resultSummary || ''

        if (inputDetails) {
          lines.push(`  ${icon} ${inputDetails} ${resultSummary} <code>(${duration})</code>`)
        } else {
          const toolIcon = getToolIcon(exec.tool)
          const toolName = truncateToolName(exec.tool)
          lines.push(`  ${icon} ${toolIcon} ${toolName} ${resultSummary} <code>(${duration})</code>`)
        }
      }

      // Show count if more tools were executed
      if (completed.length > MAX_TOOL_HISTORY) {
        const hidden = completed.length - MAX_TOOL_HISTORY
        lines.push(`  <i>... y ${hidden} más</i>`)
      }

      lines.push('')

      // Total time
      const totalDuration = this.getTotalDuration()
      lines.push(`⏱️ <b>Tiempo total:</b> ${formatDuration(totalDuration)}`)
    } else if (!pendingTool && !this.state.streamedText && !this.state.streamedThinking) {
      // Show generic status only if no content
      lines.push('⚡ <i>Procesando...</i>')
    }

    // Truncate from the beginning if too long
    let statusText = lines.join('\n')
    if (statusText.length > MAX_MESSAGE_LENGTH) {
      let truncatedLines = lines
      while (truncatedLines.length > 3 && truncatedLines.join('\n').length > MAX_MESSAGE_LENGTH) {
        truncatedLines = truncatedLines.slice(1)
      }
      statusText = '<i>...</i>\n' + truncatedLines.join('\n')
    }

    return statusText
  }

  async finish(): Promise<void> {
    // Clear any pending timeout
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout)
      this.updateTimeout = null
    }

    // Update status message with final summary - retry 3 times
    if (this.state.statusMessageId) {
      const finalText = this.buildFinalSummary()

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await this.telegram.editMessageText(
            this.state.chatId,
            this.state.statusMessageId,
            undefined,
            finalText,
            { parse_mode: 'HTML' }
          )
          return // Success - exit function
        } catch (error) {
          if (attempt === 3) {
            // Last attempt failed - log error but don't throw
            console.error('[StreamingHandler] Failed to update final summary after 3 attempts:', error)
            // Leave message as-is - better than nothing
          } else {
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 500 * attempt))
          }
        }
      }
    }
  }

  private buildFinalSummary(): string {
    const lines: string[] = []
    const completed = this.state.toolExecutions.filter(e => e.endTime)
    const totalDuration = this.getTotalDuration()

    lines.push('✅ <b>Completado</b>')
    lines.push('')

    if (completed.length > 0) {
      lines.push(`📊 <b>${completed.length} tools ejecutados</b> en ${formatDuration(totalDuration)}`)
      lines.push('')

      // Show all completed tools (or last MAX_TOOL_HISTORY if too many)
      const toolsToShow = completed.length > MAX_TOOL_HISTORY
        ? completed.slice(-MAX_TOOL_HISTORY)
        : completed

      for (const exec of toolsToShow) {
        const icon = exec.error ? '❌' : '✅'
        const duration = exec.duration ? formatDuration(exec.duration) : '?'
        const inputDetails = formatToolInput(exec.tool, exec.input)
        const resultSummary = exec.resultSummary || ''

        if (inputDetails) {
          lines.push(`${icon} ${inputDetails} ${resultSummary} <code>(${duration})</code>`)
        } else {
          const toolIcon = getToolIcon(exec.tool)
          const toolName = truncateToolName(exec.tool)
          lines.push(`${icon} ${toolIcon} ${toolName} ${resultSummary} <code>(${duration})</code>`)
        }
      }

      if (completed.length > MAX_TOOL_HISTORY) {
        const hidden = completed.length - MAX_TOOL_HISTORY
        lines.push(`<i>... y ${hidden} más</i>`)
      }
    }

    // Truncate from beginning if needed
    let finalText = lines.join('\n')
    if (finalText.length > MAX_MESSAGE_LENGTH) {
      let truncatedLines = lines
      while (truncatedLines.length > 3 && truncatedLines.join('\n').length > MAX_MESSAGE_LENGTH) {
        truncatedLines = truncatedLines.slice(1)
      }
      finalText = '<i>...</i>\n' + truncatedLines.join('\n')
    }

    return finalText
  }

  getToolExecutions(): IToolExecution[] {
    return [...this.state.toolExecutions]
  }

  getCompletedToolCount(): number {
    return this.state.toolExecutions.filter(e => e.endTime).length
  }

  getTotalDuration(): number {
    return this.state.toolExecutions
      .filter(e => e.duration)
      .reduce((sum, e) => sum + (e.duration || 0), 0)
  }
}
