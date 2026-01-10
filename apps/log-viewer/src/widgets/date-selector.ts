/**
 * Date Selector Widget
 *
 * Popup list widget for selecting log files by date
 */

import { List } from '@unblessed/node'
import chalk from 'chalk'
import type { LogFile, ThemeColors } from '../types/index.js'

export interface DateSelectorOptions {
  parent: any
  theme: ThemeColors
  onSelect: (file: LogFile) => void
}

export class DateSelectorWidget extends List {
  private files: LogFile[] = []
  private onSelect: (file: LogFile) => void

  constructor(options: DateSelectorOptions) {
    super({
      parent: options.parent,
      top: 'center',
      left: 'center',
      width: 40,
      height: 15,
      border: { type: 'line' },
      label: ' {bold}Select Log File{/bold} ',
      tags: true,
      keys: true,
      vi: true,
      mouse: true,
      style: {
        bg: options.theme.bg,
        fg: options.theme.fg,
        border: {
          fg: options.theme.border
        },
        selected: {
          bg: options.theme.header.bg,
          fg: options.theme.header.fg
        },
        item: {
          fg: options.theme.fg
        }
      },
      hidden: true
    })

    this.onSelect = options.onSelect

    // Handle selection
    this.on('select', (item: any) => {
      const index = this.items.indexOf(item)
      if (index >= 0 && index < this.files.length) {
        this.onSelect(this.files[index])
        this.hide()
      }
    })

    // Handle cancel
    this.key(['escape', 'q'], () => {
      this.hide()
    })
  }

  /**
   * Show selector with files
   */
  showSelector(files: LogFile[]): void {
    this.files = files

    // Format list items
    const today = new Date().toISOString().split('T')[0]
    const items = files.map((file) => {
      const isToday = file.name.includes(today)
      const dateStr = isToday
        ? chalk.green(`${file.date.toLocaleDateString()} (hoy)`)
        : chalk.dim(file.date.toLocaleDateString())
      const countStr = file.entryCount
        ? chalk.dim(`${file.entryCount.toLocaleString()} entries`)
        : ''
      return `${dateStr} ${countStr}`
    })

    this.setItems(items)
    this.show()
    this.focus()
    this.select(0)
    this.screen?.render()
  }

  /**
   * Hide selector
   */
  hideSelector(): void {
    this.hide()
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
      },
      selected: {
        bg: theme.header.bg,
        fg: theme.header.fg
      },
      item: {
        fg: theme.fg
      }
    }
    this.screen?.render()
  }
}
