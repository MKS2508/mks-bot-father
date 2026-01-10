/**
 * Configuration types for log-viewer
 */

import type { LogViewerConfig, ThemePreset } from '../types/index.js'

export interface ConfigManagerOptions {
  configPath?: string
  envPrefix?: string
}

export type LogLevelValue = 0 | 1 | 2 | 3 | 4

export const LOG_LEVEL_VALUES: Record<string, LogLevelValue> = {
  DBG: 0,
  INF: 1,
  WRN: 2,
  ERR: 3,
  ALL: 4
}

export interface ParsedArgs {
  file?: string
  level?: string
  source?: string
  search?: string
  watch?: boolean
  help?: boolean
}

export interface DefaultConfig extends LogViewerConfig {
  themes: Record<ThemePreset, any>
}
