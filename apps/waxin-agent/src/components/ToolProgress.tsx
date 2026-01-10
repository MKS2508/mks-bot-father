/**
 * ToolProgress - Display tool execution with progress bar
 *
 * Shows tool name, input params, progress bar and status updates.
 */

import type { ToolExecution, ToolProgressUpdate } from '../types.js'
import { ProgressBar } from './ProgressBar.js'

const THEME = {
  purple: '#b381c5',
  magenta: '#ff7edb',
  cyan: '#36f9f6',
  blue: '#6e95ff',
  green: '#72f1b8',
  yellow: '#fede5d',
  orange: '#ff8b39',
  red: '#fe4450',
  text: '#ffffff',
  textDim: '#848bbd',
  textMuted: '#495495',
  bgDark: '#1a1a2e',
  bgPanel: '#2a2139',
} as const

interface ToolProgressProps {
  /** Current tool execution */
  execution: ToolExecution
  /** Width of the component (default: 60) */
  width?: number
  /** Show input parameters (default: true) */
  showInput?: boolean
  /** Show progress history (default: false) */
  showHistory?: boolean
  /** Compact mode - single line (default: false) */
  compact?: boolean
}

/**
 * Format input params for display
 */
function formatInput(input: unknown, maxLength: number = 50): string {
  if (input === null || input === undefined) return ''
  if (typeof input === 'object') {
    const keys = Object.keys(input as object)
    if (keys.length === 0) return ''
    const pairs = keys.slice(0, 2).map(k => {
      const val = (input as Record<string, unknown>)[k]
      const valStr = typeof val === 'string'
        ? val.length > 15 ? val.slice(0, 15) + '...' : val
        : JSON.stringify(val)?.slice(0, 15)
      return `${k}=${valStr}`
    })
    const more = keys.length > 2 ? ` +${keys.length - 2}` : ''
    const result = pairs.join(', ') + more
    return result.length > maxLength ? result.slice(0, maxLength) + '...' : result
  }
  const str = String(input)
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str
}

/**
 * Get latest progress info from execution
 */
function getLatestProgress(execution: ToolExecution): ToolProgressUpdate | null {
  const updates = execution.progressUpdates
  if (!updates || updates.length === 0) return null
  return updates[updates.length - 1]
}

/**
 * Calculate current progress percentage
 */
function calculateProgress(execution: ToolExecution): number {
  if (execution.endTime !== undefined) {
    return execution.success ? 100 : 0
  }
  const latest = getLatestProgress(execution)
  return latest?.progress ?? 50 // Default to 50% while executing
}

/**
 * ToolProgress component - shows tool execution with progress
 */
export const ToolProgress = ({
  execution,
  width = 60,
  showInput = true,
  showHistory = false,
  compact = false,
}: ToolProgressProps) => {
  const isPending = execution.endTime === undefined
  const progress = calculateProgress(execution)
  const latestUpdate = getLatestProgress(execution)
  const inputText = showInput ? formatInput(execution.input) : ''

  const statusIcon = isPending ? '⟳' : (execution.success ? '✓' : '✗')
  const statusColor = isPending ? THEME.yellow : (execution.success ? THEME.green : THEME.red)

  // Calculate elapsed time
  const elapsed = isPending
    ? Date.now() - execution.startTime
    : execution.duration || 0
  const elapsedStr = elapsed < 1000 ? `${elapsed}ms` : `${(elapsed / 1000).toFixed(1)}s`

  if (compact) {
    return (
      <box style={{ flexDirection: 'row' }}>
        <text style={{ fg: statusColor }}>{statusIcon}</text>
        <text style={{ fg: THEME.textMuted }}> </text>
        <text style={{ fg: THEME.cyan }}>{execution.tool}</text>
        {inputText && (
          <>
            <text style={{ fg: THEME.textMuted }}> </text>
            <text style={{ fg: THEME.textDim }}>({inputText})</text>
          </>
        )}
        <text style={{ fg: THEME.textMuted }}> </text>
        <text style={{ fg: isPending ? THEME.yellow : THEME.textDim }}>{elapsedStr}</text>
        {isPending && latestUpdate && (
          <>
            <text style={{ fg: THEME.textMuted }}> </text>
            <text style={{ fg: THEME.blue }}>[{latestUpdate.progress}%]</text>
          </>
        )}
      </box>
    )
  }

  return (
    <box
      style={{
        flexDirection: 'column',
        width: width,
        backgroundColor: THEME.bgDark,
        border: true,
        borderColor: statusColor as any,
        padding: [0, 1],
        marginBottom: 1,
      }}
    >
      {/* Header: status icon, tool name, elapsed time */}
      <box style={{ flexDirection: 'row' }}>
        <text style={{ fg: statusColor }}>{statusIcon}</text>
        <text style={{ fg: THEME.textMuted }}> </text>
        <text style={{ fg: THEME.cyan }}>{execution.tool}</text>
        <text style={{ fg: THEME.textMuted }}> </text>
        <text style={{ fg: THEME.textDim }}>{elapsedStr}</text>
        {execution.blockId && (
          <>
            <text style={{ fg: THEME.textMuted }}> </text>
            <text style={{ fg: THEME.textMuted }}>({execution.blockId.slice(0, 8)})</text>
          </>
        )}
      </box>

      {/* Input params row */}
      {inputText && (
        <box style={{ flexDirection: 'row', marginTop: 0 }}>
          <text style={{ fg: THEME.textMuted }}>{'│ '}</text>
          <text style={{ fg: THEME.magenta }}>{'→ '}</text>
          <text style={{ fg: THEME.textDim }}>{inputText}</text>
        </box>
      )}

      {/* Progress bar (only when pending) */}
      {isPending && (
        <box style={{ marginTop: 0, marginLeft: 2 }}>
          <ProgressBar
            progress={progress}
            message={latestUpdate?.message || 'Executing...'}
            width={Math.max(20, width - 10)}
            showSpinners={true}
            borderStyle="none"
            fillColor={THEME.blue}
          />
        </box>
      )}

      {/* Current status message */}
      {latestUpdate && (
        <box style={{ flexDirection: 'row', marginTop: 0 }}>
          <text style={{ fg: THEME.textMuted }}>{'│ '}</text>
          <text style={{ fg: isPending ? THEME.blue : THEME.green }}>
            {latestUpdate.step ? `[${latestUpdate.step}] ` : ''}
          </text>
          <text style={{ fg: THEME.text }}>{latestUpdate.message}</text>
        </box>
      )}

      {/* Progress history (if enabled) */}
      {showHistory && execution.progressUpdates && execution.progressUpdates.length > 1 && (
        <box style={{ flexDirection: 'column', marginTop: 0 }}>
          {execution.progressUpdates.slice(-3, -1).map((update, i) => (
            <box key={i} style={{ flexDirection: 'row' }}>
              <text style={{ fg: THEME.textMuted }}>{'│  '}</text>
              <text style={{ fg: THEME.textMuted }}>
                {`${update.progress}% - ${update.message}`}
              </text>
            </box>
          ))}
        </box>
      )}

      {/* Result/Error row (when completed) */}
      {!isPending && (
        <box style={{ flexDirection: 'row', marginTop: 0 }}>
          <text style={{ fg: THEME.textMuted }}>{'│ '}</text>
          <text style={{ fg: execution.success ? THEME.green : THEME.red }}>
            {execution.success
              ? `✓ Completed in ${elapsedStr}`
              : `✗ ${execution.error?.slice(0, 50) || 'Failed'}`
            }
          </text>
        </box>
      )}
    </box>
  )
}

/**
 * ToolProgressList - Display multiple tool executions
 */
interface ToolProgressListProps {
  /** List of tool executions */
  executions: ToolExecution[]
  /** Maximum items to show (default: 5) */
  maxItems?: number
  /** Width of each item (default: 60) */
  width?: number
  /** Compact mode (default: false) */
  compact?: boolean
}

export const ToolProgressList = ({
  executions,
  maxItems = 5,
  width = 60,
  compact = false,
}: ToolProgressListProps) => {
  // Show most recent executions first, limit to maxItems
  const recentExecutions = [...executions]
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, maxItems)

  if (recentExecutions.length === 0) {
    return null
  }

  return (
    <box style={{ flexDirection: 'column' }}>
      {recentExecutions.map((execution, i) => (
        <ToolProgress
          key={execution.blockId || i}
          execution={execution}
          width={width}
          compact={compact}
          showInput={true}
          showHistory={false}
        />
      ))}
    </box>
  )
}
