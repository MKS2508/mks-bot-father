/**
 * StatusBar - Status bar at the bottom of the TUI
 * Shows agent status, model info, stats, and keyboard shortcuts
 */

import { useMemo } from 'react'
import { THEME } from '../theme/colors.js'
import { LAYOUT } from '../constants/layout.js'
import { formatTokens, formatCost } from '../hooks/useStats.js'
import { useAgentStatsShared } from '../hooks/useAgentStatsShared.js'
import type { AgentInfo } from '../types.js'

interface StatusBarProps {
  isStreaming: boolean
  isExecuting: boolean
  currentAgentInfo: AgentInfo | undefined
  modelBadge: string
  showKeyboardShortcuts?: boolean
}

export function StatusBar({
  isStreaming,
  isExecuting,
  currentAgentInfo,
  modelBadge,
  showKeyboardShortcuts = true,
}: StatusBarProps) {
  const stats = useAgentStatsShared()

  const statusBadge = useMemo(() => {
    if (isStreaming) return '◓'
    if (isExecuting) return '◐'
    return '●'
  }, [isStreaming, isExecuting])

  const statsBadge = useMemo(() => {
    if (!stats) return null
    return `${formatTokens(stats.totalTokens)} tk · ${formatCost(stats.totalCostUsd)}`
  }, [stats])

  return (
    <box
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        paddingLeft: LAYOUT.PADDING,
        paddingRight: LAYOUT.PADDING,
        height: LAYOUT.STATUS_BAR_HEIGHT,
      }}
    >
      <box style={{ flexDirection: 'row' }}>
        <text style={{ fg: isStreaming ? THEME.cyan : isExecuting ? THEME.yellow : THEME.green }}>
          {statusBadge}{' '}
        </text>
        <text style={{ fg: currentAgentInfo?.color ?? THEME.cyan }}>
          {currentAgentInfo?.label ?? 'Build'}
        </text>
        <text style={{ fg: THEME.textDim }}> · {modelBadge}</text>
        {statsBadge && <text style={{ fg: THEME.textMuted }}> · {statsBadge}</text>}
      </box>
      {showKeyboardShortcuts && (
        <box style={{ flexDirection: 'row' }}>
          <text style={{ fg: THEME.textMuted }}>ctrl+c </text>
          <text style={{ fg: THEME.textDim }}>quit  </text>
          <text style={{ fg: THEME.textMuted }}>ctrl+k </text>
          <text style={{ fg: THEME.textDim }}>clear  </text>
          <text style={{ fg: THEME.textMuted }}>shift+tab </text>
          <text style={{ fg: THEME.textDim }}>agent</text>
        </box>
      )}
    </box>
  )
}
