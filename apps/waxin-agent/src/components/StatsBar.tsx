/**
 * StatsBar - Compact stats display for use below the Header (no messages state)
 *
 * Shows MCP servers, tools, tokens, cost in a minimal centered line.
 */

import { getTopbarStats, getStats, type TopbarStats } from '../hooks/useStats.js'
import { useState, useEffect } from 'react'

const THEME = {
  purple: '#b381c5',
  magenta: '#ff7edb',
  cyan: '#36f9f6',
  green: '#72f1b8',
  yellow: '#fede5d',
  orange: '#ff8b39',
  red: '#fe4450',
  textDim: '#848bbd',
  textMuted: '#495495',
} as const

interface StatsBarProps {
  isStreaming?: boolean
  isExecuting?: boolean
}

export const StatsBar = ({
  isStreaming = false,
  isExecuting = false,
}: StatsBarProps) => {
  const [stats, setStats] = useState<TopbarStats | null>(null)
  const [costValue, setCostValue] = useState(0)

  useEffect(() => {
    const updateStats = () => {
      const topbarStats = getTopbarStats()
      const rawStats = getStats()
      setStats(topbarStats)
      setCostValue(rawStats?.totalCostUsd ?? 0)
    }

    updateStats()
    const interval = setInterval(updateStats, 250)
    return () => clearInterval(interval)
  }, [])

  const statusIcon = isStreaming ? '◓' : isExecuting ? '◐' : '●'
  const statusColor = isStreaming ? THEME.cyan : isExecuting ? THEME.yellow : THEME.green

  const getCostColor = (cost: number): string => {
    if (cost > 1.0) return THEME.red
    if (cost > 0.5) return THEME.orange
    if (cost > 0.1) return THEME.yellow
    return THEME.green
  }

  if (!stats) {
    return (
      <box style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 1 }}>
        <text style={{ fg: THEME.textMuted }}>
          ░░░ loading ░░░
        </text>
      </box>
    )
  }

  return (
    <box
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 1,
      }}
    >
      {/* Status */}
      <text style={{ fg: THEME.textMuted }}>┄ </text>
      <text style={{ fg: statusColor }}>{statusIcon}</text>
      <text style={{ fg: THEME.textMuted }}> · </text>

      {/* MCP */}
      <text style={{ fg: THEME.purple }}>⚡</text>
      <text style={{ fg: THEME.magenta }}>{stats.mcpServers}</text>
      <text style={{ fg: THEME.textDim }}>srv </text>
      <text style={{ fg: THEME.cyan }}>{stats.mcpTools}</text>
      <text style={{ fg: THEME.textDim }}>tk</text>

      <text style={{ fg: THEME.textMuted }}> · </text>

      {/* Tokens */}
      <text style={{ fg: THEME.cyan }}>{stats.tokens}</text>
      <text style={{ fg: THEME.textDim }}> tk</text>

      <text style={{ fg: THEME.textMuted }}> · </text>

      {/* Cost */}
      <text style={{ fg: getCostColor(costValue) }}>{stats.cost}</text>

      <text style={{ fg: THEME.textMuted }}> ┄</text>
    </box>
  )
}

export const StatsBarMinimal = ({
  isStreaming = false,
  isExecuting = false,
}: StatsBarProps) => {
  const [stats, setStats] = useState<TopbarStats | null>(null)
  const [costValue, setCostValue] = useState(0)

  useEffect(() => {
    const updateStats = () => {
      const topbarStats = getTopbarStats()
      const rawStats = getStats()
      setStats(topbarStats)
      setCostValue(rawStats?.totalCostUsd ?? 0)
    }

    updateStats()
    const interval = setInterval(updateStats, 250)
    return () => clearInterval(interval)
  }, [])

  const statusIcon = isStreaming ? '◓' : isExecuting ? '◐' : '●'
  const statusColor = isStreaming ? THEME.cyan : isExecuting ? THEME.yellow : THEME.green

  const getCostColor = (cost: number): string => {
    if (cost > 1.0) return THEME.red
    if (cost > 0.5) return THEME.orange
    if (cost > 0.1) return THEME.yellow
    return THEME.green
  }

  if (!stats) {
    return (
      <box style={{ flexDirection: 'row', justifyContent: 'center' }}>
        <text style={{ fg: THEME.textMuted }}>░░░ initializing ░░░</text>
      </box>
    )
  }

  return (
    <box
      style={{
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
      }}
    >
      {/* Main stats row with cyberpunk brackets */}
      <box style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
        <text style={{ fg: THEME.purple }}>⟨</text>
        <text style={{ fg: statusColor }}> {statusIcon} </text>
        <text style={{ fg: THEME.textMuted }}>│</text>

        {/* MCP Section */}
        <text style={{ fg: THEME.purple }}> ⚡</text>
        <text style={{ fg: THEME.magenta }}>{stats.mcpServers}</text>
        <text style={{ fg: THEME.textDim }}>:</text>
        <text style={{ fg: THEME.cyan }}>{stats.mcpTools}</text>
        <text style={{ fg: THEME.textDim }}> mcp </text>

        <text style={{ fg: THEME.textMuted }}>│</text>

        {/* Tokens */}
        <text style={{ fg: THEME.cyan }}> {stats.tokens}</text>
        <text style={{ fg: THEME.textDim }}> tk </text>

        <text style={{ fg: THEME.textMuted }}>│</text>

        {/* Cost with glow effect on high values */}
        <text style={{ fg: getCostColor(costValue) }}> {stats.cost} </text>

        <text style={{ fg: THEME.purple }}>⟩</text>
      </box>
    </box>
  )
}
