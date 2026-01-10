/**
 * Status Bar Widget
 *
 * Displays log count, filter status, current file info, and level stats
 */

import { Box } from '@unblessed/node'
import chalk from 'chalk'
import type { LogStats, FilterOptions, LogFile } from '../types/index.js'
import type { ThemeColors } from '../types/index.js'

export interface StatusBarOptions {
  parent: any
  top: number | string
  left: number | string
  width: number | string
  height: number | string
  theme: ThemeColors
}

export class StatusBarWidget extends Box {
  private stats: LogStats = { total: 0, byLevel: { DBG: 0, INF: 0, WRN: 0, ERR: 0 }, bySource: {} }
  private filter: FilterOptions = { levels: [], sources: [] }
  private currentFile: LogFile | null = null
  private searchQuery: string = ''
  private theme: ThemeColors

  constructor(options: StatusBarOptions) {
    super({
      parent: options.parent,
      top: options.top,
      left: options.left,
      width: options.width,
      height: 2,
      tags: true,
      style: {
        bg: options.theme.header.bg,
        fg: options.theme.header.fg
      }
    })
    this.theme = options.theme
  }

  /**
   * Update status bar content
   */
  update(options: {
    stats?: LogStats
    filter?: FilterOptions
    currentFile?: LogFile | null
    searchQuery?: string
  }): void {
    if (options.stats) this.stats = options.stats
    if (options.filter) this.filter = options.filter
    if (options.currentFile !== undefined) this.currentFile = options.currentFile
    if (options.searchQuery !== undefined) this.searchQuery = options.searchQuery

    this.renderContent()
  }

  /**
   * Render status bar
   */
  private renderContent(): void {
    const width = this.width as number

    // Line 1: Bottom border
    const line1 = chalk.hex(this.theme.border)('═'.repeat(width))

    // Line 2: Status information
    const parts: string[] = []

    // File name
    if (this.currentFile) {
      parts.push(chalk.hex(this.theme.header.fg).dim(`📄 ${this.currentFile.name}`))
    } else {
      parts.push(chalk.hex(this.theme.header.fg).dim('📄 No file'))
    }

    // Separator
    parts.push(chalk.hex(this.theme.border).dim('║'))

    // Entry count
    const totalCount = this.stats.total
    const filteredCount = this.getFilteredCount()
    if (filteredCount < totalCount) {
      parts.push(chalk.yellow(`Showing ${filteredCount}/${totalCount} entries`))
    } else {
      parts.push(chalk.hex(this.theme.header.fg).dim(`${totalCount} entries`))
    }

    // Separator
    parts.push(chalk.hex(this.theme.border).dim('║'))

    // Level stats
    const levelStats = [
      this.stats.byLevel.DBG > 0 ? chalk.gray(`DBG:${this.stats.byLevel.DBG}`) : null,
      this.stats.byLevel.INF > 0 ? chalk.blue(`INF:${this.stats.byLevel.INF}`) : null,
      this.stats.byLevel.WRN > 0 ? chalk.yellow(`WRN:${this.stats.byLevel.WRN}`) : null,
      this.stats.byLevel.ERR > 0 ? chalk.red(`ERR:${this.stats.byLevel.ERR}`) : null,
    ].filter(Boolean).join(' ')

    if (levelStats) {
      parts.push(levelStats)
    }

    // Separator
    parts.push(chalk.hex(this.theme.border).dim('║'))

    // Filter status
    const filterParts: string[] = []
    if (this.filter.levels.length > 0) {
      filterParts.push(chalk.cyan(`L:${this.filter.levels.join(',')}`))
    }
    if (this.filter.sources.length > 0) {
      filterParts.push(chalk.magenta(`S:${this.filter.sources.join(',')}`))
    }
    if (this.searchQuery) {
      filterParts.push(chalk.green(`"${this.searchQuery}"`))
    }

    if (filterParts.length > 0) {
      parts.push(filterParts.join(' '))
    } else {
      parts.push(chalk.hex(this.theme.header.fg).dim('All'))
    }

    // Build final line with borders
    let content = parts.join(' ')
    const visibleLen = stripLen(content)

    if (visibleLen > width - 2) {
      content = truncateToWidth(content, width - 5) + '...'
    }

    const line2 = `${chalk.hex(this.theme.border).dim('║')} ${content}${' '.repeat(Math.max(0, width - visibleLen - 4))}${chalk.hex(this.theme.border).dim('║')}`

    this.setContent(`${line1}\n${line2}`)
    this.screen?.render()
  }

  /**
   * Estimate filtered count (approximate)
   */
  private getFilteredCount(): number {
    let count = this.stats.total

    if (this.filter.levels.length > 0) {
      const levelCount = this.filter.levels.reduce(
        (sum, level) => sum + (this.stats.byLevel[level] || 0),
        0
      )
      count = Math.min(count, levelCount)
    }

    if (this.filter.sources.length > 0) {
      const sourceCount = this.filter.sources.reduce(
        (sum, source) => sum + (this.stats.bySource[source] || 0),
        0
      )
      count = Math.min(count, sourceCount)
    }

    if (this.searchQuery) {
      // Can't easily estimate search, use approximation
      count = Math.floor(count * 0.5)
    }

    return count
  }

  /**
   * Update theme
   */
  updateTheme(theme: ThemeColors): void {
    this.theme = theme
    this.style = {
      bg: theme.header.bg,
      fg: theme.header.fg
    }
    this.renderContent()
  }
}

function stripLen(str: string): number {
  return str.replace(/\x1b\[[0-9;]*m/g, '').length
}

function truncateToWidth(str: string, maxWidth: number): string {
  let result = str
  while (stripLen(result) > maxWidth) {
    result = result.slice(0, -1)
  }
  return result
}
