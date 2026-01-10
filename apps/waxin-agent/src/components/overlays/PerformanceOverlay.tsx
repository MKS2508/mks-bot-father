/**
 * PerformanceOverlay - Performance metrics overlay
 * Shows agent execution, tool calls, and memory usage from global tracker
 */

import { globalTracker } from '../../lib/performance-tracker.js'
import { useState, useEffect } from 'react'

const THEME = {
  bg: '#262335',
  bgDark: '#1a1a2e',
  bgPanel: '#2a2139',
  green: '#72f1b8',
  yellow: '#fede5d',
  orange: '#ff8b39',
  cyan: '#36f9f6',
  text: '#ffffff',
  textDim: '#848bbd',
  textMuted: '#495495'
} as const

interface PerformanceOverlayProps {
  onClose?: () => void
}

/**
 * Format duration in ms to human readable
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

/**
 * PerformanceOverlay - Display performance metrics
 *
 * Features:
 * - Agent execution time
 * - Tool call timing
 * - Render performance
 * - Memory usage tracking
 */
export function PerformanceOverlay({ onClose: _onClose }: PerformanceOverlayProps) {
  const [metrics, setMetrics] = useState(globalTracker.getMetrics())
  const [memory, setMemory] = useState(globalTracker.getMemoryStats())

  // Update metrics every 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(globalTracker.getMetrics())
      setMemory(globalTracker.getMemoryStats())
    }, 500)

    return () => clearInterval(interval)
  }, [])

  return (
    <box style={{ flexDirection: 'column' }}>
      {/* Header */}
      <box style={{ paddingBottom: 1 }}>
        <text style={{ fg: THEME.cyan }}>
          {'⚡ Performance Tracker'}
        </text>
      </box>

      {/* Metrics Display */}
      {metrics.agentExec !== undefined && (
        <box style={{ flexDirection: 'row', gap: 2, marginBottom: 1 }}>
          <text style={{ fg: THEME.textMuted, width: 10 }}>
            {'Agent:'}
          </text>
          <text style={{ fg: THEME.green }}>
            {formatDuration(metrics.agentExec)}
          </text>
        </box>
      )}

      {metrics.toolCall !== undefined && metrics.toolCall > 0 && (
        <box style={{ flexDirection: 'row', gap: 2, marginBottom: 1 }}>
          <text style={{ fg: THEME.textMuted, width: 10 }}>
            {'Tools:'}
          </text>
          <text style={{ fg: THEME.yellow }}>
            {formatDuration(metrics.toolCall)}
          </text>
        </box>
      )}

      {metrics.render !== undefined && metrics.render > 0 && (
        <box style={{ flexDirection: 'row', gap: 2, marginBottom: 1 }}>
          <text style={{ fg: THEME.textMuted, width: 10 }}>
            {'Render:'}
          </text>
          <text style={{ fg: THEME.cyan }}>
            {formatDuration(metrics.render)}
          </text>
        </box>
      )}

      {metrics.decode > 0 && (
        <box style={{ flexDirection: 'row', gap: 2, marginBottom: 1 }}>
          <text style={{ fg: THEME.textMuted, width: 10 }}>
            {'Decode:'}
          </text>
          <text style={{ fg: THEME.text }}>
            {formatDuration(metrics.decode)}
          </text>
        </box>
      )}

      {metrics.resize > 0 && (
        <box style={{ flexDirection: 'row', gap: 2, marginBottom: 1 }}>
          <text style={{ fg: THEME.textMuted, width: 10 }}>
            {'Resize:'}
          </text>
          <text style={{ fg: THEME.text }}>
            {formatDuration(metrics.resize)}
          </text>
        </box>
      )}

      {metrics.convert > 0 && (
        <box style={{ flexDirection: 'row', gap: 2, marginBottom: 1 }}>
          <text style={{ fg: THEME.textMuted, width: 10 }}>
            {'Convert:'}
          </text>
          <text style={{ fg: THEME.text }}>
            {formatDuration(metrics.convert)}
          </text>
        </box>
      )}

      {/* Separator */}
      <box style={{ marginTop: 1, marginBottom: 1 }}>
        <text style={{ fg: THEME.textMuted }}>
          {'─'.repeat(25)}
        </text>
      </box>

      {/* Total */}
      <box style={{ flexDirection: 'row', gap: 2, marginBottom: 1 }}>
        <text style={{ fg: THEME.textMuted, width: 10 }}>
          {'Total:'}
        </text>
        <text style={{ fg: THEME.orange }}>
          {formatDuration(metrics.total)}
        </text>
      </box>

      {/* Memory */}
      <box style={{ flexDirection: 'row', gap: 2, marginBottom: 1 }}>
        <text style={{ fg: THEME.textMuted, width: 10 }}>
          {'Memory:'}
        </text>
        <text style={{ fg: THEME.cyan }}>
          {`${memory.heapUsedMB}MB / ${memory.heapTotalMB}MB`}
        </text>
      </box>

      {/* Arrays */}
      {memory.arrayBuffersMB > 0 && (
        <box style={{ flexDirection: 'row', gap: 2 }}>
          <text style={{ fg: THEME.textMuted, width: 10 }}>
            {'Buffers:'}
          </text>
          <text style={{ fg: THEME.textDim }}>
            {`${memory.arrayBuffersMB}MB`}
          </text>
        </box>
      )}
    </box>
  )
}
