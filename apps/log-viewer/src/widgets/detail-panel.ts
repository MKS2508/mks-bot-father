/**
 * Detail Panel Widget
 *
 * Popup panel showing full log entry details
 */

import { Box } from '@unblessed/node'
import chalk from 'chalk'
import type { JsonLogEntry, ThemeColors } from '../types/index.js'

export interface DetailPanelOptions {
  parent: any
  theme: ThemeColors
}

export class DetailPanelWidget extends Box {
  private entry: JsonLogEntry | null = null

  constructor(options: DetailPanelOptions) {
    super({
      parent: options.parent,
      top: 'center',
      left: 'center',
      width: '80%',
      height: '60%',
      border: { type: 'line' },
      tags: true,
      style: {
        bg: options.theme.bg,
        fg: options.theme.fg,
        border: {
          fg: options.theme.border
        }
      },
      hidden: true
    })
  }

  /**
   * Show detail for entry
   */
  showEntry(entry: JsonLogEntry): void {
    this.entry = entry
    this.renderContent()
    super.show()
    this.focus()
  }

  /**
   * Hide detail panel
   */
  hideDetail(): void {
    super.hide()
    this.entry = null
  }

  /**
   * Render detail content
   */
  private renderContent(): void {
    if (!this.entry) {
      this.setContent(chalk.dim('No entry selected'))
      return
    }

    const lines: string[] = []

    // Header
    lines.push(chalk.bold.inverse(` ${this.entry.level} ${this.entry.src} `))
    lines.push('')

    // Timestamp
    lines.push(chalk.dim('Timestamp:'), chalk.cyan(this.entry.ts))
    lines.push('')

    // Location
    if (this.entry.loc) {
      lines.push(chalk.dim('Location:'), chalk.yellow(this.entry.loc))
      lines.push('')
    }

    // Message
    lines.push(chalk.dim('Message:'))
    lines.push(this.formatMessage(this.entry.msg, this.entry.level))
    lines.push('')

    // Data
    if (this.entry.data && Object.keys(this.entry.data).length > 0) {
      lines.push(chalk.dim('Data:'))
      lines.push(this.formatData(this.entry.data))
      lines.push('')
    }

    // Metrics
    if (this.entry.metrics) {
      lines.push(chalk.dim('Metrics:'))
      lines.push(this.formatMetrics(this.entry.metrics))
      lines.push('')
    }

    // Footer
    lines.push('')
    lines.push(chalk.dim('─'.repeat((this.width as number) - 4)))
    lines.push(chalk.dim('Press {bold}Esc{/bold} or {bold}q{/bold} to close'))

    this.setContent(lines.join('\n'))
    this.screen?.render()
  }

  /**
   * Format message with color based on level
   */
  private formatMessage(msg: string, level: string): string {
    switch (level) {
      case 'ERR':
        return chalk.red(msg)
      case 'WRN':
        return chalk.yellow(msg)
      case 'DBG':
        return chalk.gray(msg)
      default:
        return msg
    }
  }

  /**
   * Format data object
   */
  private formatData(data: Record<string, unknown>): string {
    const lines: string[] = []
    for (const [key, value] of Object.entries(data)) {
      const formattedValue = this.formatValue(value)
      lines.push(`  ${chalk.magenta(key)}: ${formattedValue}`)
    }
    return lines.join('\n')
  }

  /**
   * Format a single value
   */
  private formatValue(value: unknown): string {
    if (value === null) return chalk.gray('null')
    if (value === undefined) return chalk.gray('undefined')
    if (typeof value === 'boolean') return value ? chalk.green('true') : chalk.red('false')
    if (typeof value === 'number') return chalk.cyan(String(value))
    if (typeof value === 'string') {
      if (value.length > 50) {
        return chalk.white(`"${value.slice(0, 50)}..."`)
      }
      return chalk.white(`"${value}"`)
    }
    if (Array.isArray(value)) {
      return chalk.magenta(`[Array(${value.length})]`)
    }
    if (typeof value === 'object') {
      return chalk.magenta(`{Object${Object.keys(value).length}}`)
    }
    return String(value)
  }

  /**
   * Format metrics
   */
  private formatMetrics(metrics: JsonLogEntry['metrics']): string {
    if (!metrics) return ''

    const parts: string[] = []

    if (metrics.duration_ms !== undefined) {
      const dur = metrics.duration_ms
      const durStr = dur > 1000 ? `${(dur / 1000).toFixed(1)}s` : `${dur}ms`
      const color = dur > 5000 ? chalk.red : dur > 2000 ? chalk.yellow : chalk.green
      parts.push(`${color('⏱ Duration:')} ${chalk.cyan(durStr)}`)
    }

    if (metrics.tokens) {
      parts.push(`${chalk.cyan('◆ Tokens:')} ${chalk.cyan(`${metrics.tokens.in}→${metrics.tokens.out} (${metrics.tokens.in + metrics.tokens.out})`)}`)
    }

    if (metrics.cost_usd !== undefined) {
      const cost = metrics.cost_usd
      const color = cost > 0.1 ? chalk.red : cost > 0.01 ? chalk.yellow : chalk.green
      parts.push(`${color('$ Cost:')} ${chalk.cyan(`$${cost.toFixed(4)}`)}`)
    }

    if (metrics.tool_count !== undefined && metrics.tool_count > 0) {
      parts.push(`${chalk.magenta('⚡ Tool calls:')} ${chalk.cyan(String(metrics.tool_count))}`)
    }

    if (metrics.memory_mb !== undefined) {
      parts.push(`${chalk.gray('◧ Memory:')} ${chalk.cyan(`${metrics.memory_mb}MB`)}`)
    }

    return parts.map(p => `  ${p}`).join('\n')
  }

  /**
   * Update theme
   */
  updateTheme(theme: ThemeColors): void {
    this.style = {
      bg: theme.bg,
      fg: theme.fg,
      border: {
        fg: theme.border
      }
    }
    if (this.entry) {
      this.renderContent()
    }
  }
}
