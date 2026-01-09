/**
 * Message Formatting Utilities.
 */
import type { AgentResult } from '../types.js'

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
