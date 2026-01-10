/**
 * Main TUI Application
 *
 * Orchestrates all widgets, handles keyboard input, manages state
 */

import { unlinkSync, existsSync } from 'fs'
import { getScreen } from './core/screen.js'
import { getThemeManager } from './core/theme.js'
import { LayoutManager } from './core/layout.js'
import { getStore } from './state/store.js'
import { LogParser } from './log-processing/parser.js'
import { LogFilter } from './log-processing/filter.js'
import { LogWatcher } from './log-processing/watcher.js'
import { HeaderWidget } from './widgets/header.js'
import { LogPanelWidget } from './widgets/log-panel.js'
import { StatusBarWidget } from './widgets/status-bar.js'
import { DetailPanelWidget } from './widgets/detail-panel.js'
import { DateSelectorWidget } from './widgets/date-selector.js'
import type { LogViewerConfig, LogLevel, LogFile, FilterOptions } from './types/index.js'

export class LogViewerApp {
  private config: LogViewerConfig
  private screen: any
  private themeManager: ReturnType<typeof getThemeManager>
  private store: ReturnType<typeof getStore>
  private layout: LayoutManager | null = null
  private watcher: LogWatcher | null = null

  constructor(config: Partial<LogViewerConfig> = {}) {
    const { defaultConfig } = require('./config/default.js')
    this.config = { ...defaultConfig, ...config }

    this.screen = getScreen({ title: 'Waxin Log Viewer' })
    this.themeManager = getThemeManager(this.config.theme)
    this.store = getStore(this.config.filters.defaultLevels)

    // Subscribe to state changes
    this.store.subscribe(() => this.onStateChange())
  }

  /**
   * Start the application
   */
  async start(filePath?: string): Promise<void> {
    try {
      console.error('[DEBUG] Starting log viewer app...')

      // Discover log files
      console.error('[DEBUG] Discovering log files...')
      const logFiles = LogParser.discoverLogFiles(this.config.logDir, this.config.logFilePattern)
      this.store.setLogFiles(logFiles)
      console.error('[DEBUG] Found log files:', logFiles.length)

      // Determine which file to load
      const targetFile = filePath || LogParser.getDefaultLogFile(this.config.logDir)
      const logFile = logFiles.find((f) => f.path === targetFile) || logFiles[0] || null
      console.error('[DEBUG] Target log file:', logFile?.name || 'none')

      if (logFile) {
        this.store.setLogFile(logFile)
      }

      // Create widgets
      console.error('[DEBUG] Creating widgets...')
      const widgets = this.createWidgets()
      console.error('[DEBUG] Widgets created')

      // Create layout
      console.error('[DEBUG] Creating layout...')
      this.layout = new LayoutManager(
        this.screen,
        widgets,
        this.config.layout
      )
      console.error('[DEBUG] Layout created')

      // Setup keyboard handlers
      console.error('[DEBUG] Setting up key handlers...')
      this.setupKeyHandlers(widgets)
      console.error('[DEBUG] Key handlers set up')

      // Load initial logs
      if (logFile) {
        console.error('[DEBUG] Loading log file...')
        await this.loadLogFile(logFile.path)
        console.error('[DEBUG] Log file loaded')
      }

      // Start watching if enabled
      if (logFile && this.config.refreshInterval > 0) {
        console.error('[DEBUG] Starting file watcher...')
        this.startWatching(logFile.path)
        console.error('[DEBUG] File watcher started')
      }

      // Initial render
      console.error('[DEBUG] Updating widgets...')
      this.updateWidgets()
      console.error('[DEBUG] Widgets updated')
      console.error('[DEBUG] Rendering screen...')
      this.screen.render()
      console.error('[DEBUG] Screen rendered - app started successfully!')
    } catch (error) {
      console.error('[ERROR] Failed to start app:', error)
      throw error
    }
  }

  /**
   * Create all widgets
   */
  private createWidgets() {
    const theme = this.themeManager.getTheme()

    const header = new HeaderWidget({
      parent: this.screen,
      theme
    })

    const logPanel = new LogPanelWidget({
      parent: this.screen,
      top: this.config.layout.headerHeight,
      left: 0,
      width: '100%',
      height: `100%-${this.config.layout.headerHeight + this.config.layout.statusBarHeight}`,
      theme
    })

    const statusBar = new StatusBarWidget({
      parent: this.screen,
      top: `100%-${this.config.layout.statusBarHeight}`,
      left: 0,
      width: '100%',
      height: this.config.layout.statusBarHeight,
      theme
    })

    const detailPanel = new DetailPanelWidget({
      parent: this.screen,
      theme
    })

    const dateSelector = new DateSelectorWidget({
      parent: this.screen,
      theme,
      onSelect: (file) => this.handleFileSelect(file)
    })

    return { header, logPanel, statusBar, detailPanel, dateSelector }
  }

  /**
   * Setup keyboard handlers
   */
  private setupKeyHandlers(widgets: ReturnType<typeof this.createWidgets>): void {
    this.screen.key(['q'], () => {
      if (widgets.detailPanel.visible) {
        widgets.detailPanel.hideDetail()
      } else if (widgets.dateSelector.visible) {
        widgets.dateSelector.hideSelector()
      } else {
        this.quit()
      }
    })

    this.screen.key(['d'], () => {
      const state = this.store.getState()
      if (!widgets.detailPanel.visible && !widgets.dateSelector.visible) {
        widgets.dateSelector.showSelector(state.availableLogFiles)
      }
    })

    // Level filters: F1-F5
    this.screen.key(['f1', '1 f1'], () => this.setLevelFilter(['DBG']))
    this.screen.key(['f2', '2 f1'], () => this.setLevelFilter(['INF']))
    this.screen.key(['f3', '3 f1'], () => this.setLevelFilter(['WRN']))
    this.screen.key(['f4', '4 f1'], () => this.setLevelFilter(['ERR']))
    this.screen.key(['f5', '5 f1'], () => this.setLevelFilter(this.config.filters.defaultLevels))

    // Source filter
    this.screen.key(['s'], () => {
      const state = this.store.getState()
      const sources = LogFilter.getUniqueSources(state.logs)
      // Could show a popup menu here
      console.log('Available sources:', sources.join(', '))
    })

    // Search
    this.screen.key(['/'], () => {
      // Could show a search prompt here
      console.log('Search feature - type query')
    })

    // Navigation
    this.screen.key(['up'], () => {
      if (!widgets.detailPanel.visible && !widgets.dateSelector.visible) {
        widgets.logPanel.selectPrevious()
      }
    })

    this.screen.key(['down'], () => {
      if (!widgets.detailPanel.visible && !widgets.dateSelector.visible) {
        widgets.logPanel.selectNext()
      }
    })

    // Go to home (first entry)
    this.screen.key(['g'], () => {
      if (!widgets.detailPanel.visible && !widgets.dateSelector.visible) {
        widgets.logPanel.goToHome()
      }
    })

    // Go to end (last entry)
    this.screen.key(['G'], () => {
      if (!widgets.detailPanel.visible && !widgets.dateSelector.visible) {
        widgets.logPanel.goToEnd()
      }
    })

    // Copy selected line
    this.screen.key(['c'], () => {
      if (!widgets.detailPanel.visible && !widgets.dateSelector.visible) {
        const entry = widgets.logPanel.getSelectedEntry()
        if (entry) {
          this.copyToClipboard(JSON.stringify(entry, null, 2))
        }
      }
    })

    this.screen.key(['enter'], () => {
      if (!widgets.detailPanel.visible && !widgets.dateSelector.visible) {
        const entry = widgets.logPanel.getSelectedEntry()
        if (entry) {
          widgets.detailPanel.showEntry(entry)
        }
      }
    })

    this.screen.key(['escape'], () => {
      if (widgets.detailPanel.visible) {
        widgets.detailPanel.hideDetail()
      } else if (widgets.dateSelector.visible) {
        widgets.dateSelector.hideSelector()
      }
    })

    // Reload
    this.screen.key(['r'], async () => {
      const state = this.store.getState()
      if (state.currentLogFile) {
        await this.loadLogFile(state.currentLogFile.path)
      }
    })

    // Clear screen
    this.screen.key(['C-l'], () => {
      this.screen.clear()
      this.screen.render()
    })

    // Clear logs from memory (key: 1)
    this.screen.key(['1'], () => {
      if (!widgets.detailPanel.visible && !widgets.dateSelector.visible) {
        this.store.setLogs([])
      }
    })

    // Delete log file (key: 2)
    this.screen.key(['2'], async () => {
      if (!widgets.detailPanel.visible && !widgets.dateSelector.visible) {
        const state = this.store.getState()
        if (state.currentLogFile) {
          await this.deleteLogFile(state.currentLogFile.path)
        }
      }
    })
  }

  /**
   * Copy text to clipboard
   */
  private copyToClipboard(text: string): void {
    const { execSync } = require('child_process')
    try {
      if (process.platform === 'darwin') {
        execSync(`echo ${JSON.stringify(text)} | pbcopy`)
      } else if (process.platform === 'linux') {
        try {
          execSync(`echo ${JSON.stringify(text)} | wl-copy`)
        } catch {
          execSync(`echo ${JSON.stringify(text)} | xclip -selection clipboard`)
        }
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  /**
   * Handle file selection from date selector
   */
  private async handleFileSelect(file: LogFile): Promise<void> {
    this.store.setLogFile(file)
    await this.loadLogFile(file.path)
  }

  /**
   * Set level filter
   */
  private setLevelFilter(levels: LogLevel[]): void {
    const state = this.store.getState()
    const newFilter: FilterOptions = {
      ...state.filter,
      levels
    }
    this.store.setFilter(newFilter)
  }

  /**
   * Load log file
   */
  private async loadLogFile(filePath: string): Promise<void> {
    const result = await LogParser.parseFile(filePath)
    if (result.error) {
      console.error('Failed to parse log file:', result.error)
      return
    }
    this.store.setLogs(result.entries)
  }

  /**
   * Start watching log file for changes
   */
  private startWatching(filePath: string): void {
    if (this.watcher) {
      this.watcher.stop()
    }

    this.watcher = new LogWatcher(
      filePath,
      (newEntries) => {
        this.store.addLogs(newEntries)
      },
      {
        stabilityThreshold: this.config.refreshInterval
      },
      (error) => {
        console.error('Watcher error:', error)
      }
    )

    this.watcher.start()
    this.store.setWatching(true)
  }

  /**
   * Handle state changes
   */
  private onStateChange(): void {
    this.updateWidgets()
    this.screen.render()
  }

  /**
   * Update widgets with current state
   */
  private updateWidgets(): void {
    const state = this.store.getState()
    const widgets = this.layout ? this.getWidgetRefs() : null

    if (!widgets) return

    // Update header
    widgets.header.update(state.currentLogFile, state.isWatching)

    // Update log panel
    widgets.logPanel.setEntries(state.filteredLogs)

    // Update status bar
    widgets.statusBar.update({
      stats: state.stats,
      filter: state.filter,
      currentFile: state.currentLogFile,
      searchQuery: state.searchQuery
    })
  }

  /**
   * Get widget references (helper)
   */
  private getWidgetRefs() {
    return (this.layout as any)?.widgets
  }

  /**
   * Delete log file from disk
   */
  private async deleteLogFile(filePath: string): Promise<void> {
    try {
      if (existsSync(filePath)) {
        // Stop watching first
        if (this.watcher) {
          this.watcher.stop()
          this.watcher = null
        }
        // Delete file
        unlinkSync(filePath)
        // Clear logs from memory
        this.store.setLogs([])
        this.store.setWatching(false)
      }
    } catch (error) {
      console.error('Failed to delete log file:', error)
    }
  }

  /**
   * Quit the application
   */
  quit(): void {
    if (this.watcher) {
      this.watcher.stop()
    }
    this.screen.destroy()
    process.exit(0)
  }
}
