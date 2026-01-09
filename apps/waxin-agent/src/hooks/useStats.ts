/**
 * useStats hook - Stats aggregation and tracking.
 *
 * Aggregates and tracks agent execution statistics.
 */

import { statsLogger } from '../lib/logger.js'
import { log } from '../lib/json-logger.js'
import { allAllowedTools, mcpServers } from '@mks2508/bot-manager-agent'
import type { AgentStats } from '../types.js'

/**
 * Stats history entry.
 */
export interface StatsHistoryEntry {
  timestamp: Date
  stats: AgentStats
}

/**
 * Current stats state.
 */
let currentStats: AgentStats | null = null
let statsHistory: StatsHistoryEntry[] = []
const maxHistorySize = 100

/**
 * Update current stats.
 */
export function updateStats(stats: AgentStats): void {
  currentStats = stats

  // Add to history
  statsHistory.push({
    timestamp: new Date(),
    stats
  })

  // Trim history if needed
  if (statsHistory.length > maxHistorySize) {
    statsHistory = statsHistory.slice(-maxHistorySize)
  }

  statsLogger.info(
    `Stats updated: ${stats.totalTokens} tokens, $${stats.totalCostUsd.toFixed(4)}, ` +
    `${stats.toolCallsCount} tools, ${stats.durationMs}ms`
  )

  log.withMetrics(
    'STATS',
    'Stats updated',
    {
      duration_ms: stats.durationMs,
      tokens: { in: stats.inputTokens, out: stats.outputTokens },
      cost_usd: stats.totalCostUsd,
      tool_count: stats.toolCallsCount
    },
    {
      sessionId: stats.sessionId,
      totalTokens: stats.totalTokens,
      errorsCount: stats.errorsCount,
      historySize: statsHistory.length
    }
  )
}

/**
 * Get current stats.
 */
export function getStats(): AgentStats | null {
  return currentStats
}

/**
 * Get stats history.
 */
export function getStatsHistory(): StatsHistoryEntry[] {
  return [...statsHistory]
}

/**
 * Clear stats.
 */
export function clearStats(): void {
  const previousSize = statsHistory.length
  currentStats = null
  statsHistory = []
  statsLogger.info('Stats cleared')
  log.info('STATS', 'Stats cleared', { previousSize })
}

/**
 * Get aggregated stats across all history.
 */
export function getAggregatedStats(): {
  totalSessions: number
  totalTokens: number
  totalCost: number
  totalDuration: number
  avgTokensPerSession: number
  avgCostPerSession: number
  avgDurationPerSession: number
} | null {
  if (statsHistory.length === 0) {
    return null
  }

  const totalTokens = statsHistory.reduce((sum, entry) => sum + entry.stats.totalTokens, 0)
  const totalCost = statsHistory.reduce((sum, entry) => sum + entry.stats.totalCostUsd, 0)
  const totalDuration = statsHistory.reduce((sum, entry) => sum + entry.stats.durationMs, 0)

  return {
    totalSessions: statsHistory.length,
    totalTokens,
    totalCost,
    totalDuration,
    avgTokensPerSession: totalTokens / statsHistory.length,
    avgCostPerSession: totalCost / statsHistory.length,
    avgDurationPerSession: totalDuration / statsHistory.length
  }
}

/**
 * Format tokens for display.
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`
  }
  return tokens.toString()
}

/**
 * Format cost for display.
 */
export function formatCost(costUsd: number): string {
  if (costUsd >= 1) {
    return `$${costUsd.toFixed(2)}`
  } else if (costUsd >= 0.01) {
    return `$${costUsd.toFixed(3)}`
  }
  return `$${costUsd.toFixed(4)}`
}

/**
 * Format duration for display.
 */
export function formatDuration(ms: number): string {
  if (ms >= 60000) {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  } else if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`
  }
  return `${ms}ms`
}

/**
 * Get MCP tools count (configured tools from @mks2508/bot-manager-agent).
 */
export function getMcpToolsCount(): number {
  return allAllowedTools.filter(t => t.startsWith('mcp__')).length
}

/**
 * Get MCP servers count.
 */
export function getMcpServersCount(): number {
  return Object.keys(mcpServers).length
}

/**
 * Get total allowed tools count (including built-in).
 */
export function getTotalToolsCount(): number {
  return allAllowedTools.length
}

/**
 * Topbar stats formatted for display.
 */
export interface TopbarStats {
  mcpTools: number
  mcpServers: number
  totalTools: number
  tokens: string
  cost: string
  session: string
  duration: string
  toolCalls: number
}

/**
 * Get formatted stats for topbar display.
 */
export function getTopbarStats(): TopbarStats {
  const stats = getStats()
  const aggregated = getAggregatedStats()

  const tokens = aggregated?.totalTokens ?? stats?.totalTokens ?? 0
  const cost = aggregated?.totalCost ?? stats?.totalCostUsd ?? 0
  const duration = aggregated?.totalDuration ?? stats?.durationMs ?? 0
  const sessionId = stats?.sessionId ?? 'unknown'
  const toolCalls = stats?.toolCallsCount ?? 0

  return {
    mcpTools: getMcpToolsCount(),
    mcpServers: getMcpServersCount(),
    totalTools: getTotalToolsCount(),
    tokens: formatTokens(tokens),
    cost: formatCost(cost),
    session: sessionId.slice(-8),
    duration: formatDuration(duration),
    toolCalls
  }
}
