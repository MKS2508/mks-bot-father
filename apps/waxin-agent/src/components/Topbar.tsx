/**
 * Topbar - WAXIN MK1 logo with integrated real-time stats
 *
 * Displays figlet logo on the left and stats on the right in a single compact row.
 */

import { useState, useEffect } from 'react'
import figlet from 'figlet'
import { getTopbarStats, getStats, type TopbarStats } from '../hooks/useStats.js'

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

interface TopbarProps {
  text?: string
  font?: string
  isStreaming?: boolean
  isExecuting?: boolean
}

export const Topbar = ({
  text = 'WAXIN MK1',
  font = 'banner',
  isStreaming = false,
  isExecuting = false,
}: TopbarProps) => {
  const [asciiArt, setAsciiArt] = useState<string>('')
  const [stats, setStats] = useState<TopbarStats | null>(null)
  const [costValue, setCostValue] = useState(0)

  useEffect(() => {
    figlet(text, { font }, (err, data) => {
      if (!err && data) {
        setAsciiArt(data.trim())
      }
    })
  }, [text, font])

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

  if (!asciiArt) {
    return null
  }

  const lines = asciiArt.split('\n').filter(line => line.trim())

  return (
    <box
      style={{
        flexDirection: 'column',
        marginBottom: 1,
        padding: 0,
      }}
    >
      {/* Logo lines with gradient */}
      {lines.map((line, i) => (
        <text
          key={i}
          style={{
            fg: i === 0 ? THEME.purple
              : i === 1 ? THEME.magenta
              : THEME.cyan
          }}
        >
          {line}
        </text>
      ))}

      {/* Stats bar - directly below logo */}
      {stats && (
        <box
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 1,
          }}
        >
          {/* Status indicator */}
          <text style={{ fg: THEME.textMuted }}>╭─</text>
          <text style={{ fg: statusColor }}> {statusIcon} </text>
          <text style={{ fg: THEME.textMuted }}>─╯</text>

          <text style={{ fg: THEME.textMuted }}> │ </text>

          {/* MCP Servers & Tools */}
          <text style={{ fg: THEME.purple }}>⚡</text>
          <text style={{ fg: THEME.magenta }}>{stats.mcpServers}</text>
          <text style={{ fg: THEME.textDim }}> srv </text>
          <text style={{ fg: THEME.cyan }}>{stats.mcpTools}</text>
          <text style={{ fg: THEME.textDim }}> tools</text>

          <text style={{ fg: THEME.textMuted }}> │ </text>

          {/* Tokens */}
          <text style={{ fg: THEME.textDim }}>tk:</text>
          <text style={{ fg: THEME.cyan }}>{stats.tokens}</text>

          <text style={{ fg: THEME.textMuted }}> │ </text>

          {/* Cost */}
          <text style={{ fg: getCostColor(costValue) }}>{stats.cost}</text>

          <text style={{ fg: THEME.textMuted }}> │ </text>

          {/* Duration */}
          <text style={{ fg: THEME.textDim }}>⏱ </text>
          <text style={{ fg: THEME.yellow }}>{stats.duration}</text>

          <text style={{ fg: THEME.textMuted }}> │ </text>

          {/* Tool calls */}
          <text style={{ fg: THEME.textDim }}>calls:</text>
          <text style={{ fg: THEME.orange }}>{stats.toolCalls}</text>

          <text style={{ fg: THEME.textMuted }}> │ </text>

          {/* Session ID */}
          <text style={{ fg: THEME.textMuted }}>ses:</text>
          <text style={{ fg: THEME.textDim }}>{stats.session}</text>
        </box>
      )}
    </box>
  )
}
