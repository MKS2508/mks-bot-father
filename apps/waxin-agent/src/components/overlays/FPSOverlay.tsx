/**
 * FPSOverlay - Real-time FPS and memory monitoring overlay
 * Shows frame rate, frame times, and memory usage
 */

import { useFPSMonitor } from '../FPSMonitor.js'
import { useEffect } from 'react'
import { tuiLogger } from '../../lib/json-logger.js'
import { THEME } from '../../theme/colors.js'
import { formatMemory } from '../../utils/format.js'
import { useDebugStore } from '../../stores/debugStore.js'

interface FPSOverlayProps {
  onClose?: () => void
}

/**
 * Get color based on FPS value
 */
function getFPSColor(fps: number): string {
  if (fps >= 50) return THEME.green
  if (fps >= 30) return THEME.yellow
  return THEME.red
}

/**
 * FPSOverlay - Display FPS and memory stats
 *
 * Features:
 * - Real-time FPS display with color coding
 * - Frame time statistics
 * - Memory usage tracking
 */
export function FPSOverlay({ onClose: _onClose }: FPSOverlayProps) {
  // Read from debugStore for FPS and memory (synchronized across all overlays)
  const debugFps = useDebugStore((state) => state.fps)
  const debugFrameTime = useDebugStore((state) => state.frameTime)
  const debugMemory = useDebugStore((state) => state.memory)

  // Use FPSMonitor for detailed stats (keeps its own buffer)
  const { stats, memoryStats } = useFPSMonitor({
    visible: true,
    updateInterval: 500,
    frameBufferSize: 300,
  })

  // Log when overlay mounts
  useEffect(() => {
    tuiLogger.info('FPS Overlay mounted', { fps: debugFps })
    return () => {
      tuiLogger.info('FPS Overlay unmounted')
    }
  }, [debugFps])

  // Use debugStore values for consistency
  const fps = debugFps > 0 ? debugFps : stats.fps
  const frameTime = debugFrameTime > 0 ? debugFrameTime : stats.averageFrameTime
  const fpsColor = getFPSColor(fps)

  return (
    <box style={{ flexDirection: 'column' }}>
      {/* Header */}
      <box style={{ paddingBottom: 1 }}>
        <text style={{ fg: THEME.cyan }}>
          {'📊 FPS Monitor'}
        </text>
      </box>

      {/* FPS Display */}
      <box style={{ flexDirection: 'row', gap: 2, marginBottom: 1 }}>
        <text style={{ fg: fpsColor as any }}>
          {fps.toString().padStart(3, ' ')}
        </text>
        <text style={{ fg: THEME.textMuted }}>
          {'FPS'}
        </text>
      </box>

      {/* Frame Time */}
      <box style={{ flexDirection: 'row', gap: 2, marginBottom: 1 }}>
        <text style={{ fg: THEME.textDim }}>
          {'Frame:'}
        </text>
        <text style={{ fg: THEME.text }}>
          {`${frameTime.toFixed(1)}ms`}
        </text>
        <text style={{ fg: THEME.textMuted }}>
          {`(min: ${stats.minFrameTime}ms, max: ${stats.maxFrameTime}ms)`}
        </text>
      </box>

      {/* Memory */}
      <box style={{ flexDirection: 'row', gap: 2 }}>
        <text style={{ fg: THEME.textDim }}>
          {'Memory:'}
        </text>
        <text style={{ fg: THEME.cyan }}>
          {debugMemory.heapUsed > 0 ? `${debugMemory.heapUsed.toFixed(1)} MB` : formatMemory(memoryStats.heapUsedMB)}
        </text>
        <text style={{ fg: THEME.textMuted }}>
          {'/'}
        </text>
        <text style={{ fg: THEME.textDim }}>
          {debugMemory.heapTotal > 0 ? `${debugMemory.heapTotal.toFixed(1)} MB` : formatMemory(memoryStats.heapTotalMB)}
        </text>
      </box>

      {/* Separator */}
      <box style={{ marginTop: 1, marginBottom: 1 }}>
        <text style={{ fg: THEME.textMuted }}>
          {'─'.repeat(20)}
        </text>
      </box>

      {/* Additional Stats */}
      <box style={{ flexDirection: 'column', gap: 1 }}>
        <box style={{ flexDirection: 'row', gap: 2 }}>
          <text style={{ fg: THEME.textMuted, width: 10 }}>
            {'Frames:'}
          </text>
          <text style={{ fg: THEME.text }}>
            {stats.frameCount.toString()}
          </text>
        </box>

        <box style={{ flexDirection: 'row', gap: 2 }}>
          <text style={{ fg: THEME.textMuted, width: 10 }}>
            {'StdDev:'}
          </text>
          <text style={{ fg: THEME.text }}>
            {`${stats.stdDev}ms`}
          </text>
        </box>

        <box style={{ flexDirection: 'row', gap: 2 }}>
          <text style={{ fg: THEME.textMuted, width: 10 }}>
            {'Buffers:'}
          </text>
          <text style={{ fg: THEME.text }}>
            {debugMemory.arrayBuffers > 0 ? `${debugMemory.arrayBuffers.toFixed(1)} MB` : `${memoryStats.arrayBuffersMB}MB`}
          </text>
        </box>
      </box>
    </box>
  )
}
