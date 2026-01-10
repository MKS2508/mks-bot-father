/**
 * PerformanceOverlay - Performance metrics overlay
 * Shows agent execution, tool calls, and memory usage with improved UI
 */

import { useEffect } from 'react'
import { tuiLogger } from '../../lib/json-logger.js'
import { THEME } from '../../theme/colors.js'
import { formatDuration } from '../../utils/format.js'
import { useDebugStore, getCurrentMemoryStats } from '../../stores/debugStore.js'

interface PerformanceOverlayProps {
  onClose?: () => void
}

/**
 * Get color based on performance threshold
 */
function getPerfColor(ms: number, thresholds: { good: number; warning: number }): string {
  if (ms <= thresholds.good) return THEME.green
  if (ms <= thresholds.warning) return THEME.yellow
  return THEME.red
}

/**
 * Create progress bar string based on value and max
 */
function createProgressBar(value: number, max: number, width: number = 10): string {
  const filled = Math.min(Math.round((value / max) * width), width)
  const empty = width - filled
  return '█'.repeat(filled) + '░'.repeat(empty)
}

/**
 * PerformanceOverlay - Display performance metrics with improved UI
 *
 * Features:
 * - Sectioned layout (Execution, Image Operations, Memory)
 * - Progress bars for visual feedback
 * - Color-coded performance (green/yellow/red)
 * - Real-time updates from debugStore
 */
export function PerformanceOverlay({ onClose: _onClose }: PerformanceOverlayProps) {
  const performanceMetrics = useDebugStore((state) => state.performanceMetrics)
  const memory = useDebugStore((state) => state.memory)

  // Log when overlay mounts
  useEffect(() => {
    tuiLogger.info('Performance Overlay mounted', {
      totalMs: performanceMetrics.total,
      memoryMB: memory.heapUsed,
    })
    return () => {
      tuiLogger.info('Performance Overlay unmounted')
    }
  }, [performanceMetrics.total, memory.heapUsed])

  // Update memory stats every 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      const currentMemory = getCurrentMemoryStats()
      useDebugStore.getState().updateMemory(currentMemory)
    }, 500)

    return () => clearInterval(interval)
  }, [])

  // Calculate max values for progress bars (100ms base)
  const maxTime = Math.max(
    performanceMetrics.agentExec,
    performanceMetrics.toolCall,
    performanceMetrics.render,
    performanceMetrics.decode,
    performanceMetrics.resize,
    performanceMetrics.convert,
    100
  )

  return (
    <box style={{ flexDirection: 'column' }}>
      {/* Header */}
      <box style={{ paddingBottom: 1 }}>
        <text style={{ fg: THEME.cyan }}>
          {'⚡ Performance Metrics'}
        </text>
      </box>

      {/* Execution Times Section */}
      <box style={{ flexDirection: 'column', marginBottom: 1 }}>
        <text style={{ fg: THEME.textDim, marginBottom: 1 }}>
          {'📊 Execution Times'}
        </text>

        {performanceMetrics.agentExec > 0 && (
          <box style={{ flexDirection: 'row', gap: 1, marginBottom: 1 }}>
            <text style={{ fg: THEME.textMuted, width: 12 }}>
              {'Agent:'}
            </text>
            <text style={{ fg: getPerfColor(performanceMetrics.agentExec, { good: 100, warning: 500 }) }}>
              {formatDuration(performanceMetrics.agentExec).padEnd(8)}
            </text>
            <text style={{ fg: getPerfColor(performanceMetrics.agentExec, { good: 100, warning: 500 }) }}>
              {createProgressBar(performanceMetrics.agentExec, maxTime, 8)}
            </text>
          </box>
        )}

        {performanceMetrics.toolCall > 0 && (
          <box style={{ flexDirection: 'row', gap: 1, marginBottom: 1 }}>
            <text style={{ fg: THEME.textMuted, width: 12 }}>
              {'Tools:'}
            </text>
            <text style={{ fg: getPerfColor(performanceMetrics.toolCall, { good: 50, warning: 200 }) }}>
              {formatDuration(performanceMetrics.toolCall).padEnd(8)}
            </text>
            <text style={{ fg: getPerfColor(performanceMetrics.toolCall, { good: 50, warning: 200 }) }}>
              {createProgressBar(performanceMetrics.toolCall, maxTime, 8)}
            </text>
          </box>
        )}

        {performanceMetrics.render > 0 && (
          <box style={{ flexDirection: 'row', gap: 1, marginBottom: 1 }}>
            <text style={{ fg: THEME.textMuted, width: 12 }}>
              {'Render:'}
            </text>
            <text style={{ fg: getPerfColor(performanceMetrics.render, { good: 16, warning: 33 }) }}>
              {formatDuration(performanceMetrics.render).padEnd(8)}
            </text>
            <text style={{ fg: getPerfColor(performanceMetrics.render, { good: 16, warning: 33 }) }}>
              {createProgressBar(performanceMetrics.render, maxTime, 8)}
            </text>
          </box>
        )}

        {/* Total */}
        {performanceMetrics.total > 0 && (
          <box style={{ flexDirection: 'row', gap: 1 }}>
            <text style={{ fg: THEME.orange, width: 12 }}>
              {'Total:'}
            </text>
            <text style={{ fg: THEME.orange }}>
              {formatDuration(performanceMetrics.total).padEnd(8)}
            </text>
            <text style={{ fg: THEME.orange }}>
              {createProgressBar(performanceMetrics.total, maxTime * 1.5, 8)}
            </text>
          </box>
        )}
      </box>

      {/* Image Operations Section */}
      {(performanceMetrics.decode > 0 || performanceMetrics.resize > 0 || performanceMetrics.convert > 0) && (
        <box style={{ flexDirection: 'column', marginBottom: 1, marginTop: 1 }}>
          <text style={{ fg: THEME.textDim, marginBottom: 1 }}>
            {'🖼️ Image Operations'}
          </text>

          {performanceMetrics.decode > 0 && (
            <box style={{ flexDirection: 'row', gap: 1, marginBottom: 1 }}>
              <text style={{ fg: THEME.textMuted, width: 12 }}>
                {'Decode:'}
              </text>
              <text style={{ fg: getPerfColor(performanceMetrics.decode, { good: 50, warning: 200 }) }}>
                {formatDuration(performanceMetrics.decode).padEnd(8)}
              </text>
              <text style={{ fg: getPerfColor(performanceMetrics.decode, { good: 50, warning: 200 }) }}>
                {createProgressBar(performanceMetrics.decode, maxTime, 8)}
              </text>
            </box>
          )}

          {performanceMetrics.resize > 0 && (
            <box style={{ flexDirection: 'row', gap: 1, marginBottom: 1 }}>
              <text style={{ fg: THEME.textMuted, width: 12 }}>
                {'Resize:'}
              </text>
              <text style={{ fg: getPerfColor(performanceMetrics.resize, { good: 100, warning: 300 }) }}>
                {formatDuration(performanceMetrics.resize).padEnd(8)}
              </text>
              <text style={{ fg: getPerfColor(performanceMetrics.resize, { good: 100, warning: 300 }) }}>
                {createProgressBar(performanceMetrics.resize, maxTime, 8)}
              </text>
            </box>
          )}

          {performanceMetrics.convert > 0 && (
            <box style={{ flexDirection: 'row', gap: 1 }}>
              <text style={{ fg: THEME.textMuted, width: 12 }}>
                {'Convert:'}
              </text>
              <text style={{ fg: getPerfColor(performanceMetrics.convert, { good: 50, warning: 200 }) }}>
                {formatDuration(performanceMetrics.convert).padEnd(8)}
              </text>
              <text style={{ fg: getPerfColor(performanceMetrics.convert, { good: 50, warning: 200 }) }}>
                {createProgressBar(performanceMetrics.convert, maxTime, 8)}
              </text>
            </box>
          )}
        </box>
      )}

      {/* Memory Section */}
      <box style={{ flexDirection: 'column', marginTop: 1 }}>
        <text style={{ fg: THEME.textDim, marginBottom: 1 }}>
          {'💾 Memory Usage'}
        </text>

        <box style={{ flexDirection: 'row', gap: 1, marginBottom: 1 }}>
          <text style={{ fg: THEME.textMuted, width: 12 }}>
            {'Heap:'}
          </text>
          <text style={{ fg: THEME.cyan }}>
            {`${memory.heapUsed.toFixed(1)} MB / ${memory.heapTotal.toFixed(1)} MB`.padEnd(20)}
          </text>
        </box>

        {memory.external > 0 && (
          <box style={{ flexDirection: 'row', gap: 1, marginBottom: 1 }}>
            <text style={{ fg: THEME.textMuted, width: 12 }}>
              {'External:'}
            </text>
            <text style={{ fg: THEME.textDim }}>
              {`${memory.external.toFixed(1)} MB`.padEnd(20)}
            </text>
          </box>
        )}

        {memory.arrayBuffers > 0 && (
          <box style={{ flexDirection: 'row', gap: 1 }}>
            <text style={{ fg: THEME.textMuted, width: 12 }}>
              {'Buffers:'}
            </text>
            <text style={{ fg: THEME.textDim }}>
              {`${memory.arrayBuffers.toFixed(1)} MB`.padEnd(20)}
            </text>
          </box>
        )}
      </box>
    </box>
  )
}
