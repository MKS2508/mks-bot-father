/**
 * FPSOverlay - Real-time FPS and memory monitoring overlay
 * Shows frame rate, frame times, and memory usage
 */

import { useFPSMonitor } from '../FPSMonitor.js'

const THEME = {
  bg: '#262335',
  bgDark: '#1a1a2e',
  bgPanel: '#2a2139',
  green: '#72f1b8',
  yellow: '#fede5d',
  red: '#fe4450',
  cyan: '#36f9f6',
  text: '#ffffff',
  textDim: '#848bbd',
  textMuted: '#495495'
} as const

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
 * Format memory with MB suffix
 */
function formatMemory(mb: number): string {
  if (mb < 1000) return `${mb}MB`
  return `${(mb / 1024).toFixed(1)}GB`
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
  const { stats, memoryStats } = useFPSMonitor({
    visible: true,
    updateInterval: 500,
    frameBufferSize: 300,
  })

  const fpsColor = getFPSColor(stats.fps)

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
          {stats.fps.toString().padStart(3, ' ')}
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
          {`${stats.averageFrameTime}ms`}
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
          {formatMemory(memoryStats.heapUsedMB)}
        </text>
        <text style={{ fg: THEME.textMuted }}>
          {'/'}
        </text>
        <text style={{ fg: THEME.textDim }}>
          {formatMemory(memoryStats.heapTotalMB)}
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
            {`${memoryStats.arrayBuffersMB}MB`}
          </text>
        </box>
      </box>
    </box>
  )
}
