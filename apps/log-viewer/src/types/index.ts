/**
 * Shared types for log-viewer application
 */

export type LogLevel = 'DBG' | 'INF' | 'WRN' | 'ERR'

export interface LogMetrics {
  duration_ms?: number
  tokens?: { in: number; out: number }
  cost_usd?: number
  memory_mb?: number
  tool_count?: number
}

export interface JsonLogEntry {
  ts: string
  level: LogLevel
  src: string
  msg: string
  loc?: string
  data?: Record<string, unknown>
  metrics?: LogMetrics
}

export interface LogFile {
  name: string
  date: Date
  path: string
  entryCount?: number
}

export type LogStats = {
  total: number
  byLevel: Record<LogLevel, number>
  bySource: Record<string, number>
}

export interface FilterOptions {
  levels: LogLevel[]
  sources: string[]
  searchQuery?: string
}

export interface LayoutConfig {
  headerHeight: number
  filterBarHeight: number
  statusBarHeight: number
  showLineNumbers: boolean
  wrapLines: boolean
}

export type ThemePreset = 'synthwave84' | 'minimal' | 'monochrome'

export interface ThemeColors {
  bg: string
  fg: string
  border: string
  header: { bg: string; fg: string }
  levelBadges: Record<LogLevel, { bg: string; fg: string }>
  sourceBadges: Record<string, { bg: string; fg: string }>
}

export interface LogViewerConfig {
  logDir: string
  logFilePattern: string
  refreshInterval: number
  maxLines: number
  scrollback: number
  theme: ThemePreset
  filters: {
    defaultLevels: LogLevel[]
    defaultSources: string[]
  }
  layout: LayoutConfig
}

export interface AppState {
  logs: JsonLogEntry[]
  filteredLogs: JsonLogEntry[]
  filter: FilterOptions
  selectedLog: JsonLogEntry | null
  currentLogFile: LogFile | null
  availableLogFiles: LogFile[]
  stats: LogStats
  isWatching: boolean
  searchQuery: string
}

export type AppAction =
  | { type: 'SET_LOGS'; payload: JsonLogEntry[] }
  | { type: 'ADD_LOGS'; payload: JsonLogEntry[] }
  | { type: 'SET_FILTER'; payload: FilterOptions }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SELECT_LOG'; payload: JsonLogEntry | null }
  | { type: 'SET_LOG_FILE'; payload: LogFile }
  | { type: 'SET_LOG_FILES'; payload: LogFile[] }
  | { type: 'SET_WATCHING'; payload: boolean }
  | { type: 'CLEAR_SEARCH' }
  | { type: 'RESET_FILTERS' }
