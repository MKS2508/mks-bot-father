/**
 * Log Panel Widget
 *
 * Main scrollable log display widget
 */

import { Box } from '@unblessed/node'
import type { JsonLogEntry, ThemeColors } from '../types/index.js'
import { LogFormatter } from '../log-processing/formatter.js'

export interface LogPanelOptions {
  parent: any
  top: number | string
  left: number | string
  width: number | string
  height: number | string
  theme: ThemeColors
  showLineNumbers?: boolean
  wrapLines?: boolean
}

export class LogPanelWidget extends Box {
  private formatter: LogFormatter
  private entries: JsonLogEntry[] = []
  private selectedIndex: number = -1

  constructor(options: LogPanelOptions) {
    super({
      parent: options.parent,
      top: options.top,
      left: options.left,
      width: options.width,
      height: options.height,
      scrollable: true,
      alwaysScroll: true,
      mouse: true,
      keys: true,
      vi: true,
      tags: true,
      style: {
        bg: options.theme.bg,
        fg: options.theme.fg
      }
    })

    const maxWidth = typeof options.width === 'number' ? options.width : 80
    this.formatter = new LogFormatter({
      maxWidth,
      showLineNumbers: options.showLineNumbers ?? true,
      wrapLines: options.wrapLines ?? false,
      theme: options.theme
    })
  }

  /**
   * Update log entries
   */
  setEntries(entries: JsonLogEntry[]): void {
    console.error('[DEBUG] LogPanel.setEntries - entries:', entries.length)
    this.entries = entries
    this.selectedIndex = -1
    this.renderContent()
  }

  /**
   * Get currently selected entry
   */
  getSelectedEntry(): JsonLogEntry | null {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.entries.length) {
      return this.entries[this.selectedIndex]
    }
    return null
  }

  /**
   * Select entry at index
   */
  selectEntry(index: number): void {
    if (index >= 0 && index < this.entries.length) {
      this.selectedIndex = index
      this.highlightSelected()
    }
  }

  /**
   * Select next entry
   */
  selectNext(): void {
    if (this.selectedIndex < this.entries.length - 1) {
      this.selectEntry(this.selectedIndex + 1)
    }
  }

  /**
   * Select previous entry
   */
  selectPrevious(): void {
    if (this.selectedIndex > 0) {
      this.selectEntry(this.selectedIndex - 1)
    }
  }

  /**
   * Render all entries
   */
  private renderContent(): void {
    console.error('[DEBUG] LogPanel.renderContent - entries:', this.entries.length)
    const lines = this.entries.map((entry, index) => {
      const formatted = this.formatter.formatEntry(entry, index + 1)
      if (index === this.selectedIndex) {
        return this.addSelectionMarker(formatted.text)
      }
      return formatted.text
    })

    console.error('[DEBUG] LogPanel.renderContent - formatted lines:', lines.length)
    this.setContent(lines.join('\n'))
    console.error('[DEBUG] LogPanel.renderContent - content set')
    this.screen?.render()
    console.error('[DEBUG] LogPanel.renderContent - rendered')
  }

  /**
   * Highlight selected entry
   */
  private highlightSelected(): void {
    this.renderContent()
  }

  /**
   * Add selection marker/highlight to formatted line
   */
  private addSelectionMarker(text: string): string {
    return `{inverse}${text}{/inverse}`
  }

  /**
   * Scroll to bottom
   */
  scrollToBottom(): void {
    if (typeof this.setScrollPerc === 'function') {
      this.setScrollPerc(100)
    }
    this.screen?.render()
  }

  /**
   * Go to end (select last entry and scroll to it)
   */
  goToEnd(): void {
    if (this.entries.length > 0) {
      this.selectEntry(this.entries.length - 1)
      this.scrollToBottom()
    }
  }

  /**
   * Go to home (select first entry and scroll to it)
   */
  goToHome(): void {
    if (this.entries.length > 0) {
      this.selectEntry(0)
      this.scrollToTop()
    }
  }

  /**
   * Scroll to top
   */
  scrollToTop(): void {
    if (typeof this.setScrollPerc === 'function') {
      this.setScrollPerc(0)
    }
    this.screen?.render()
  }

  /**
   * Get visible range
   */
  getVisibleRange(): { start: number; end: number } {
    const height = this.height as number
    const childBase = this.childBase || 0
    return {
      start: childBase,
      end: Math.min(childBase + height, this.entries.length)
    }
  }

  /**
   * Clear panel
   */
  clear(): void {
    this.entries = []
    this.selectedIndex = -1
    this.setContent('')
    this.screen?.render()
  }

  /**
   * Update theme
   */
  updateTheme(theme: ThemeColors): void {
    this.formatter = new LogFormatter({
      maxWidth: this.width as number,
      showLineNumbers: true,
      wrapLines: false,
      theme
    })
    this.style = {
      bg: theme.bg,
      fg: theme.fg
    }
    this.renderContent()
  }
}
