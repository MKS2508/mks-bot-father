/**
 * State Store
 *
 * Central reactive store with Zustand-like pattern for managing application state
 */

import type {
  AppState,
  AppAction,
  JsonLogEntry,
  FilterOptions,
  LogFile,
  LogLevel
} from '../types/index.js'

type Listener = (state: AppState) => void

export class Store {
  private state: AppState
  private listeners: Set<Listener> = new Set()
  private defaultLevels: LogLevel[]

  constructor(defaultLevels: LogLevel[] = ['DBG', 'INF', 'WRN', 'ERR']) {
    this.defaultLevels = defaultLevels
    this.state = this.getInitialState()
  }

  private getInitialState(): AppState {
    return {
      logs: [],
      filteredLogs: [],
      filter: {
        levels: [...this.defaultLevels],
        sources: [],
        searchQuery: undefined
      },
      selectedLog: null,
      currentLogFile: null,
      availableLogFiles: [],
      stats: {
        total: 0,
        byLevel: { DBG: 0, INF: 0, WRN: 0, ERR: 0 },
        bySource: {}
      },
      isWatching: false,
      searchQuery: ''
    }
  }

  /**
   * Get current state (immutable)
   */
  getState(): AppState {
    return { ...this.state }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Dispatch an action to update state
   */
  dispatch(action: AppAction): void {
    const newState = this.reducer(this.state, action)

    if (newState !== this.state) {
      this.state = newState
      this.notify()
    }
  }

  /**
   * Reducer: pure function that computes new state from action
   */
  private reducer(state: AppState, action: AppAction): AppState {
    switch (action.type) {
      case 'SET_LOGS': {
        const { LogFilter } = require('../log-processing/filter.js')
        const filtered = LogFilter.applyFilters(action.payload, state.filter)
        const stats = LogFilter.calculateStats(action.payload)

        return {
          ...state,
          logs: action.payload,
          filteredLogs: filtered,
          stats,
          selectedLog: null
        }
      }

      case 'ADD_LOGS': {
        const newLogs = [...state.logs, ...action.payload]
        const { LogFilter } = require('../log-processing/filter.js')
        const filtered = LogFilter.applyFilters(newLogs, state.filter)
        const stats = LogFilter.calculateStats(newLogs)

        return {
          ...state,
          logs: newLogs,
          filteredLogs: filtered,
          stats
        }
      }

      case 'SET_FILTER': {
        const { LogFilter } = require('../log-processing/filter.js')
        const filtered = LogFilter.applyFilters(state.logs, action.payload)

        return {
          ...state,
          filter: action.payload,
          filteredLogs: filtered,
          selectedLog: null
        }
      }

      case 'SET_SEARCH': {
        const newFilter: FilterOptions = {
          ...state.filter,
          searchQuery: action.payload || undefined
        }
        const { LogFilter } = require('../log-processing/filter.js')
        const filtered = LogFilter.applyFilters(state.logs, newFilter)

        return {
          ...state,
          filter: newFilter,
          filteredLogs: filtered,
          searchQuery: action.payload,
          selectedLog: null
        }
      }

      case 'SELECT_LOG': {
        return {
          ...state,
          selectedLog: action.payload
        }
      }

      case 'SET_LOG_FILE': {
        return {
          ...state,
          currentLogFile: action.payload
        }
      }

      case 'SET_LOG_FILES': {
        return {
          ...state,
          availableLogFiles: action.payload
        }
      }

      case 'SET_WATCHING': {
        return {
          ...state,
          isWatching: action.payload
        }
      }

      case 'CLEAR_SEARCH': {
        const newFilter: FilterOptions = {
          ...state.filter,
          searchQuery: undefined
        }
        const { LogFilter } = require('../log-processing/filter.js')
        const filtered = LogFilter.applyFilters(state.logs, newFilter)

        return {
          ...state,
          filter: newFilter,
          filteredLogs: filtered,
          searchQuery: ''
        }
      }

      case 'RESET_FILTERS': {
        const defaultFilter: FilterOptions = {
          levels: [...this.defaultLevels],
          sources: [],
          searchQuery: undefined
        }
        const { LogFilter } = require('../log-processing/filter.js')
        const filtered = LogFilter.applyFilters(state.logs, defaultFilter)

        return {
          ...state,
          filter: defaultFilter,
          filteredLogs: filtered,
          searchQuery: '',
          selectedLog: null
        }
      }

      default:
        return state
    }
  }

  /**
   * Notify all listeners of state change
   */
  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.getState())
    }
  }

  // Convenience methods (thunks)

  /**
   * Set logs and update derived state
   */
  setLogs(logs: JsonLogEntry[]): void {
    this.dispatch({ type: 'SET_LOGS', payload: logs })
  }

  /**
   * Add new logs (e.g., from file watcher)
   */
  addLogs(logs: JsonLogEntry[]): void {
    this.dispatch({ type: 'ADD_LOGS', payload: logs })
  }

  /**
   * Update filter options
   */
  setFilter(filter: FilterOptions): void {
    this.dispatch({ type: 'SET_FILTER', payload: filter })
  }

  /**
   * Update search query
   */
  setSearch(query: string): void {
    this.dispatch({ type: 'SET_SEARCH', payload: query })
  }

  /**
   * Select a log entry
   */
  selectLog(log: JsonLogEntry | null): void {
    this.dispatch({ type: 'SELECT_LOG', payload: log })
  }

  /**
   * Set current log file
   */
   setLogFile(file: LogFile): void {
    this.dispatch({ type: 'SET_LOG_FILE', payload: file })
  }

  /**
   * Set available log files
   */
  setLogFiles(files: LogFile[]): void {
    this.dispatch({ type: 'SET_LOG_FILES', payload: files })
  }

  /**
   * Set watching state
   */
  setWatching(watching: boolean): void {
    this.dispatch({ type: 'SET_WATCHING', payload: watching })
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.dispatch({ type: 'CLEAR_SEARCH' })
  }

  /**
   * Reset all filters
   */
  resetFilters(): void {
    this.dispatch({ type: 'RESET_FILTERS' })
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.state = this.getInitialState()
    this.notify()
  }
}

let globalStore: Store | null = null

export function getStore(defaultLevels: LogLevel[] = ['DBG', 'INF', 'WRN', 'ERR']): Store {
  if (!globalStore) {
    globalStore = new Store(defaultLevels)
  }
  return globalStore
}
