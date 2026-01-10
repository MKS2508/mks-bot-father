/**
 * Default configuration for log-viewer
 */

import type { DefaultConfig } from './types.js'
import type { ThemeColors } from '../types/index.js'

const synthwave84Colors: ThemeColors = {
  bg: '#262335',
  fg: 'white',
  border: '#b381c5',
  header: { bg: '#1a1524', fg: '#b381c5' },
  levelBadges: {
    DBG: { bg: '#585858', fg: 'white' },
    INF: { bg: '#1e3a5f', fg: 'white' },
    WRN: { bg: '#876500', fg: '#ffff87' },
    ERR: { bg: '#8b0000', fg: '#ff5f5f' }
  },
  sourceBadges: {
    TUI: { bg: '#5f2387', fg: 'white' },
    AGENT: { bg: '#005f5f', fg: '#afffff' },
    TOOL: { bg: '#87005f', fg: '#ffafff' },
    STATS: { bg: '#005f00', fg: '#afff00' },
    CONFIG: { bg: '#af5f00', fg: '#ffff87' }
  }
}

const minimalColors: ThemeColors = {
  bg: 'black',
  fg: 'white',
  border: 'gray',
  header: { bg: 'blue', fg: 'white' },
  levelBadges: {
    DBG: { bg: '#444', fg: '#ccc' },
    INF: { bg: '#00f', fg: 'white' },
    WRN: { bg: '#800', fg: '#ff0' },
    ERR: { bg: '#f00', fg: 'white' }
  },
  sourceBadges: {
    TUI: { bg: '#608', fg: 'white' },
    AGENT: { bg: '#066', fg: '#0ff' },
    TOOL: { bg: '#806', fg: '#f0f' },
    STATS: { bg: '#060', fg: '#0f0' },
    CONFIG: { bg: '#840', fg: '#ff0' }
  }
}

const monochromeColors: ThemeColors = {
  bg: 'black',
  fg: 'white',
  border: '#666',
  header: { bg: '#333', fg: 'white' },
  levelBadges: {
    DBG: { bg: '#444', fg: '#aaa' },
    INF: { bg: '#666', fg: 'white' },
    WRN: { bg: '#888', fg: 'white' },
    ERR: { bg: '#aaa', fg: 'black' }
  },
  sourceBadges: {
    TUI: { bg: '#444', fg: '#ccc' },
    AGENT: { bg: '#555', fg: '#fff' },
    TOOL: { bg: '#666', fg: '#fff' },
    STATS: { bg: '#777', fg: '#fff' },
    CONFIG: { bg: '#888', fg: '#fff' }
  }
}

export const defaultConfig: DefaultConfig = {
  logDir: './logs',
  logFilePattern: 'waxin-*.jsonl',
  refreshInterval: 100,
  maxLines: 10000,
  scrollback: 1000,
  theme: 'synthwave84',
  filters: {
    defaultLevels: ['DBG', 'INF', 'WRN', 'ERR'],
    defaultSources: []
  },
  layout: {
    headerHeight: 5,
    filterBarHeight: 2,
    statusBarHeight: 2,
    showLineNumbers: true,
    wrapLines: false
  },
  themes: {
    synthwave84: synthwave84Colors,
    minimal: minimalColors,
    monochrome: monochromeColors
  }
}

export function getThemeColors(preset: string): ThemeColors {
  const config = defaultConfig.themes[preset as keyof typeof defaultConfig.themes]
  return config || synthwave84Colors
}

export const HELP_TEXT = `
Waxin Log Viewer v0.1.0
========================

Keybindings:
  q, C-c      Quit
  d           Open date selector
  1-5         Filter by level (1=DBG, 2=INF, 3=WRN, 4=ERR, 5=ALL)
  s           Filter by source
  /           Search
  ↑↓          Navigate logs
  Enter       View log detail
  Esc         Close popup/detail
  r           Reload file
  Ctrl+L      Clear screen

Usage:
  waxin-logs [options]
  waxin-logs [file] [options]

Options:
  --file, -f       Log file to view
  --level, -l      Filter by level (DBG,INF,WRN,ERR,ALL)
  --source, -s     Filter by source (TUI,AGENT,TOOL,STATS,CONFIG)
  --search         Search query
  --watch, -w      Watch file for changes
  --help, -h       Show this help
`
