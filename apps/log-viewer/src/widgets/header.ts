/**
 * Header Widget
 *
 * Displays app title, file info, and keybindings
 */

import { Box } from '@unblessed/node'
import chalk from 'chalk'
import type { LogFile } from '../types/index.js'
import type { ThemeColors } from '../types/index.js'

export class HeaderWidget extends Box {
  private theme: ThemeColors

  constructor(options: { parent: any; theme: ThemeColors }) {
    super({
      parent: options.parent,
      top: 0,
      left: 0,
      width: '100%',
      height: 5,
      tags: true,
      style: {
        bg: options.theme.header.bg,
        fg: options.theme.header.fg
      }
    })
    this.theme = options.theme
  }

  /**
   * Update header content
   */
  update(file: LogFile | null, isWatching: boolean): void {
    const width = this.width as number

    // Line 1: Top border
    const line1 = chalk.hex(this.theme.border)('═'.repeat(width))

    // Line 2: Title centered
    const title = chalk.hex(this.theme.header.fg).bold('🤖 WAXIN LOG VIEWER')
    const titleLine = this.centerText(title, width)

    // Line 3: File info and watch status
    const fileName = file ? chalk.dim(file.name) : chalk.dim('No file selected')
    const watchStatus = isWatching ? chalk.green('● Watching') : chalk.dim('○ Paused')
    const fileInfoLine = this.buildInfoLine(fileName, watchStatus, width)

    // Line 4: Shortcuts row 1 (without borders for space)
    const shortcutsRow1 = [
      chalk.hex(this.theme.header.fg).dim('q:Quit'),
      chalk.hex(this.theme.header.fg).dim('↑↓'),
      chalk.hex(this.theme.header.fg).dim('G'),
      chalk.hex(this.theme.header.fg).dim('g'),
      chalk.hex(this.theme.header.fg).dim('c'),
      chalk.hex(this.theme.header.fg).dim('Enter'),
    ].join(chalk.hex(this.theme.header.fg).dim(' • '))

    // Line 5: Shortcuts row 2
    const shortcutsRow2 = [
      chalk.hex(this.theme.header.fg).dim('r:Reload'),
      chalk.hex(this.theme.header.fg).dim('C-l'),
      chalk.hex(this.theme.header.fg).dim('1:Mem'),
      chalk.hex(this.theme.header.fg).dim('2:File'),
      chalk.hex(this.theme.header.fg).dim('d'),
      chalk.hex(this.theme.header.fg).dim('F1-5'),
    ].join(chalk.hex(this.theme.header.fg).dim(' • '))

    this.setContent(`${line1}\n${titleLine}\n${fileInfoLine}\n${this.centerText(shortcutsRow1, width)}\n${this.centerText(shortcutsRow2, width)}`)
    this.screen?.render()
  }

  /**
   * Build info line with left and right content
   */
  private buildInfoLine(leftText: string, rightText: string, width: number): string {
    const sideChar = chalk.hex(this.theme.border).dim('║')
    const leftLen = stripLen(leftText)
    const rightLen = stripLen(rightText)
    const middlePadding = width - leftLen - rightLen - 4
    return `${sideChar} ${leftText} ${chalk.hex(this.theme.border).dim('─').repeat(Math.max(1, middlePadding))} ${rightText} ${sideChar}`
  }

  /**
   * Center text within width
   */
  private centerText(text: string, width: number): string {
    const visibleLen = stripLen(text)
    const padding = Math.max(0, Math.floor((width - visibleLen) / 2))
    return `${' '.repeat(padding)}${text}`
  }
}

function stripLen(str: string): number {
  return str.replace(/\x1b\[[0-9;]*m/g, '').length
}
