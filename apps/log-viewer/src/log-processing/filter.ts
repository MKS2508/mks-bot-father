/**
 * Log Filtering
 *
 * Filter logs by level, source, and search query
 */

import type { JsonLogEntry, LogLevel, FilterOptions, LogStats } from '../types/index.js'

export class LogFilter {
  /**
   * Apply filters to log entries
   */
  static applyFilters(entries: JsonLogEntry[], filter: FilterOptions): JsonLogEntry[] {
    return entries.filter((log) => LogFilter.matchesFilter(log, filter))
  }

  /**
   * Check if a single log entry matches the filter
   */
  static matchesFilter(log: JsonLogEntry, filter: FilterOptions): boolean {
    // Level filter
    if (filter.levels.length > 0 && !filter.levels.includes(log.level)) {
      return false
    }

    // Source filter
    if (filter.sources.length > 0 && !filter.sources.includes(log.src)) {
      return false
    }

    // Search query filter
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase()
      const msgMatch = log.msg.toLowerCase().includes(query)
      const dataMatch = log.data
        ? JSON.stringify(log.data).toLowerCase().includes(query)
        : false
      const locMatch = log.loc?.toLowerCase().includes(query) || false

      if (!msgMatch && !dataMatch && !locMatch) {
        return false
      }
    }

    return true
  }

  /**
   * Calculate statistics from log entries
   */
  static calculateStats(entries: JsonLogEntry[]): LogStats {
    const stats: LogStats = {
      total: entries.length,
      byLevel: { DBG: 0, INF: 0, WRN: 0, ERR: 0 },
      bySource: {}
    }

    for (const entry of entries) {
      // Count by level
      stats.byLevel[entry.level]++

      // Count by source
      stats.bySource[entry.src] = (stats.bySource[entry.src] || 0) + 1
    }

    return stats
  }

  /**
   * Get unique sources from log entries
   */
  static getUniqueSources(entries: JsonLogEntry[]): string[] {
    const sources = new Set<string>()
    for (const entry of entries) {
      sources.add(entry.src)
    }
    return Array.from(sources).sort()
  }

  /**
   * Create default filter options
   */
  static defaultFilter(defaultLevels: LogLevel[] = ['DBG', 'INF', 'WRN', 'ERR']): FilterOptions {
    return {
      levels: [...defaultLevels],
      sources: [],
      searchQuery: undefined
    }
  }

  /**
   * Create a level-only filter
   */
  static levelFilter(levels: LogLevel[]): FilterOptions {
    return {
      levels,
      sources: [],
      searchQuery: undefined
    }
  }

  /**
   * Create a source-only filter
   */
  static sourceFilter(sources: string[]): FilterOptions {
    return {
      levels: [],
      sources,
      searchQuery: undefined
    }
  }

  /**
   * Create a search-only filter
   */
  static searchFilter(query: string): FilterOptions {
    return {
      levels: [],
      sources: [],
      searchQuery: query
    }
  }

  /**
   * Check if filter is active (has any restrictions)
   */
  static isFilterActive(filter: FilterOptions): boolean {
    return (
      filter.levels.length > 0 ||
      filter.sources.length > 0 ||
      (filter.searchQuery !== undefined && filter.searchQuery.length > 0)
    )
  }

  /**
   * Reset filter to defaults
   */
  static resetFilter(defaultLevels: LogLevel[]): FilterOptions {
    return LogFilter.defaultFilter(defaultLevels)
  }
}
