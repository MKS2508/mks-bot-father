/**
 * Layout Manager
 *
 * Manages widget positioning, sizing, and responsive layout
 */

import type { LayoutConfig, ThemeColors } from '../types/index.js'
import type { HeaderWidget } from '../widgets/header.js'
import type { StatusBarWidget } from '../widgets/status-bar.js'
import type { LogPanelWidget } from '../widgets/log-panel.js'
import type { DetailPanelWidget } from '../widgets/detail-panel.js'
import type { DateSelectorWidget } from '../widgets/date-selector.js'

export interface LayoutWidgets {
  header: HeaderWidget
  logPanel: LogPanelWidget
  statusBar: StatusBarWidget
  detailPanel: DetailPanelWidget
  dateSelector: DateSelectorWidget
}

export class LayoutManager {
  private config: LayoutConfig
  private widgets: LayoutWidgets
  private screen: any

  constructor(
    screen: any,
    widgets: LayoutWidgets,
    config: LayoutConfig
  ) {
    this.screen = screen
    this.widgets = widgets
    this.config = config

    this.setupInitialLayout()
    this.setupResizeHandler()
  }

  /**
   * Setup initial widget positions
   */
  private setupInitialLayout(): void {
    const { headerHeight, statusBarHeight } = this.config

    // Header is already positioned (top: 0)

    // Log panel fills space between header and status bar
    this.widgets.logPanel.top = headerHeight
    this.widgets.logPanel.height = `100%-${headerHeight + statusBarHeight}`

    // Status bar at bottom
    this.widgets.statusBar.top = `100%-${statusBarHeight}`
    this.widgets.statusBar.height = statusBarHeight

    // Detail panel and date selector are popups (centered, no fixed position)
  }

  /**
   * Setup resize handler
   */
  private setupResizeHandler(): void {
    this.screen.on('resize', () => {
      this.handleResize()
    })
  }

  /**
   * Handle terminal resize
   */
  private handleResize(): void {
    const width = this.screen.width
    const height = this.screen.height

    // Update layout config if needed
    this.updateLayoutForSize(width, height)

    // Re-render all widgets
    this.screen.render()
  }

  /**
   * Adjust layout for small/large terminals
   */
  private updateLayoutForSize(width: number, height: number): void {
    // For narrow terminals, reduce header height
    if (width < 80) {
      this.widgets.header.height = 2
    } else {
      this.widgets.header.height = this.config.headerHeight
    }

    // For short terminals, adjust
    if (height < 24) {
      this.config.statusBarHeight = 1
    }
  }

  /**
   * Focus a specific widget
   */
  focusWidget(widgetName: keyof LayoutWidgets): void {
    const widget = this.widgets[widgetName]
    if (widget && 'focus' in widget) {
      ;(widget as any).focus()
    }
  }

  /**
   * Render all widgets
   */
  render(): void {
    this.screen.render()
  }

  /**
   * Update theme for all widgets
   */
  updateTheme(theme: ThemeColors): void {
    this.widgets.logPanel.updateTheme(theme)
    this.widgets.statusBar.updateTheme(theme)
    this.widgets.detailPanel.updateTheme(theme)
    this.widgets.dateSelector.updateTheme(theme)
    this.render()
  }

  /**
   * Get current terminal dimensions
   */
  getDimensions(): { width: number; height: number } {
    return {
      width: this.screen.width,
      height: this.screen.height
    }
  }

  /**
   * Show detail panel
   */
  showDetailPanel(entry: import('../types/index.js').JsonLogEntry): void {
    this.widgets.detailPanel.showEntry(entry)
    this.widgets.detailPanel.focus()
  }

  /**
   * Hide detail panel
   */
  hideDetailPanel(): void {
    this.widgets.detailPanel.hideDetail()
  }

  /**
   * Show date selector
   */
  showDateSelector(files: import('../types/index.js').LogFile[]): void {
    this.widgets.dateSelector.showSelector(files)
  }

  /**
   * Hide date selector
   */
  hideDateSelector(): void {
    this.widgets.dateSelector.hideSelector()
  }
}
