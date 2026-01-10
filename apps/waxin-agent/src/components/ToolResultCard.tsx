/**
 * ToolResultCard - Display tool execution results
 *
 * Shows tool name, duration, success status, and result.
 */

import type { ToolExecution } from '../types.js'

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

interface ToolResultCardProps {
  /** Tool execution data */
  execution: ToolExecution
  /** Card width (default: auto) */
  width?: number
  /** Show full result (default: truncate) */
  showFullResult?: boolean
  /** Max result length when truncated (default: 100) */
  maxResultLength?: number
}

/**
 * Format duration to human-readable string
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

/**
 * Truncate result string if too long
 */
function truncateResult(result: unknown, maxLength: number): string {
  if (result === null || result === undefined) return 'null'
  const str = typeof result === 'string' ? result : JSON.stringify(result)
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}

/**
 * ToolResultCard component
 *
 * @example
 * ```tsx
 * <ToolResultCard
 *   execution={{
 *     tool: 'deploy',
 *     input: { uuid: 'xxx' },
 *     startTime: 1234567890,
 *     endTime: 1234567950,
 *     duration: 60,
 *     success: true,
 *     result: { deploymentUuid: 'yyy' }
 *   }}
 * />
 * ```
 */
export const ToolResultCard = ({
  execution,
  width = 60,
  showFullResult = false,
  maxResultLength = 100
}: ToolResultCardProps) => {
  const {
    tool,
    startTime,
    endTime,
    duration,
    success,
    result,
    error
  } = execution

  const isPending = endTime === undefined
  const statusIcon = isPending ? '⟳' : (success ? '✓' : '✗')
  const statusColor = isPending ? THEME.yellow : (success ? THEME.green : THEME.red)
  const statusText = isPending ? 'PENDING' : (success ? 'SUCCESS' : 'FAILED')

  // Format duration
  const durationText = duration !== undefined
    ? formatDuration(duration)
    : (isPending ? `${Date.now() - startTime}ms` : '')

  // Format result
  let resultText: string
  if (isPending) {
    resultText = 'Executing...'
  } else if (error) {
    resultText = `Error: ${error}`
  } else if (result !== undefined) {
    resultText = showFullResult
      ? (typeof result === 'string' ? result : JSON.stringify(result, null, 2))
      : truncateResult(result, maxResultLength)
  } else {
    resultText = 'No output'
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
      {/* Header row: status icon, tool name, duration */}
      <box style={{ flexDirection: 'row' }}>
        <text style={{ fg: statusColor as any, bold: true }}>
          {statusIcon}
        </text>
        <text style={{ fg: THEME.textMuted }}> </text>
        <text style={{ fg: THEME.cyan, bold: true }}>
          {tool}
        </text>
        <text style={{ fg: THEME.textMuted }}> </text>
        <text style={{ fg: statusColor as any }}>
          [{statusText}]
        </text>
        {durationText && (
          <>
            <text style={{ fg: THEME.textMuted }}> </text>
            <text style={{ fg: THEME.textDim }}>
              {durationText}
            </text>
          </>
        )}
      </box>

      {/* Result row */}
      <box style={{ flexDirection: 'row', marginTop: 0 }}>
        <text style={{ fg: THEME.textMuted }}>
          {'│ '}
        </text>
        <text style={{ fg: success ? THEME.text : THEME.red }}>
          {resultText}
        </text>
      </box>

      {/* Bottom border */}
      <text style={{ fg: statusColor as any }}>
        {'└' + '─'.repeat(width - 2) + '┘'}
      </text>
    </box>
  )
}

/**
 * Compact tool result (one-line version)
 */
interface CompactToolResultProps {
  execution: ToolExecution
  showDuration?: boolean
}

export const CompactToolResult = ({
  execution,
  showDuration = true
}: CompactToolResultProps) => {
  const {
    tool,
    duration,
    success,
    error
  } = execution

  const isPending = duration === undefined
  const statusIcon = isPending ? '⟳' : (success ? '✓' : '✗')
  const statusColor = isPending ? THEME.yellow : (success ? THEME.green : THEME.red)

  return (
    <box style={{ flexDirection: 'row' }}>
      <text style={{ fg: statusColor as any }}>
        {statusIcon}
      </text>
      <text style={{ fg: THEME.textMuted }}> </text>
      <text style={{ fg: THEME.cyan }}>
        {tool}
      </text>
      {showDuration && duration !== undefined && (
        <>
          <text style={{ fg: THEME.textMuted }}> </text>
          <text style={{ fg: THEME.textDim }}>
            {formatDuration(duration)}
          </text>
        </>
      )}
      {error && (
        <>
          <text style={{ fg: THEME.textMuted }}> </text>
          <text style={{ fg: THEME.red }}>
            {error.slice(0, 30)}{error.length > 30 ? '...' : ''}
          </text>
        </>
      )}
    </box>
  )
}
