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
  /** Show input params (default: true) */
  showInput?: boolean
  /** Show progress updates (default: false) */
  showProgress?: boolean
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
 * Format input params for display
 */
function formatInput(input: unknown, maxLength: number = 60): string {
  if (input === null || input === undefined) return ''
  if (typeof input === 'object') {
    const keys = Object.keys(input as object)
    if (keys.length === 0) return ''
    const pairs = keys.slice(0, 3).map(k => {
      const val = (input as Record<string, unknown>)[k]
      const valStr = typeof val === 'string'
        ? val.length > 20 ? val.slice(0, 20) + '...' : val
        : JSON.stringify(val)
      return `${k}=${valStr}`
    })
    const more = keys.length > 3 ? ` +${keys.length - 3} more` : ''
    const result = pairs.join(', ') + more
    return result.length > maxLength ? result.slice(0, maxLength) + '...' : result
  }
  const str = String(input)
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str
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
  maxResultLength = 100,
  showInput = true,
  showProgress = false
}: ToolResultCardProps) => {
  const {
    tool,
    input,
    startTime,
    endTime,
    duration,
    success,
    result,
    error,
    progressUpdates
  } = execution

  const isPending = endTime === undefined
  const statusIcon = isPending ? '⟳' : (success ? '✓' : '✗')
  const statusColor = isPending ? THEME.yellow : (success ? THEME.green : THEME.red)
  const statusText = isPending ? 'PENDING' : (success ? 'SUCCESS' : 'FAILED')

  // Format duration
  const durationText = duration !== undefined
    ? formatDuration(duration)
    : (isPending ? `${Date.now() - startTime}ms` : '')

  // Format input
  const inputText = showInput ? formatInput(input) : ''

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

  // Get latest progress update
  const latestProgress = progressUpdates?.length ? progressUpdates[progressUpdates.length - 1] : null

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
        <text style={{ fg: statusColor as any }}>
          {statusIcon}
        </text>
        <text style={{ fg: THEME.textMuted }}> </text>
        <text style={{ fg: THEME.cyan }}>
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

      {/* Input row (if showInput and has input) */}
      {inputText && (
        <box style={{ flexDirection: 'row', marginTop: 0 }}>
          <text style={{ fg: THEME.textMuted }}>
            {'│ '}
          </text>
          <text style={{ fg: THEME.magenta }}>
            {'→ '}
          </text>
          <text style={{ fg: THEME.textDim }}>
            {inputText}
          </text>
        </box>
      )}

      {/* Progress row (if pending and has progress) */}
      {isPending && latestProgress && (
        <box style={{ flexDirection: 'row', marginTop: 0 }}>
          <text style={{ fg: THEME.textMuted }}>
            {'│ '}
          </text>
          <text style={{ fg: THEME.blue }}>
            {`[${latestProgress.progress}%] `}
          </text>
          <text style={{ fg: THEME.text }}>
            {latestProgress.message}
          </text>
        </box>
      )}

      {/* Result row */}
      <box style={{ flexDirection: 'row', marginTop: 0 }}>
        <text style={{ fg: THEME.textMuted }}>
          {'│ '}
        </text>
        <text style={{ fg: success ? THEME.text : THEME.red }}>
          {resultText}
        </text>
      </box>

      {/* Progress history (if showProgress and has multiple updates) */}
      {showProgress && progressUpdates && progressUpdates.length > 1 && (
        <box style={{ flexDirection: 'column', marginTop: 0 }}>
          {progressUpdates.slice(-3).map((update, i) => (
            <box key={i} style={{ flexDirection: 'row' }}>
              <text style={{ fg: THEME.textMuted }}>
                {'│  '}
              </text>
              <text style={{ fg: THEME.textDim }}>
                {`${update.progress}% - ${update.message}`}
              </text>
            </box>
          ))}
        </box>
      )}

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
  showInput?: boolean
}

export const CompactToolResult = ({
  execution,
  showDuration = true,
  showInput = true
}: CompactToolResultProps) => {
  const {
    tool,
    input,
    duration,
    success,
    error,
    progressUpdates
  } = execution

  const isPending = duration === undefined
  const statusIcon = isPending ? '⟳' : (success ? '✓' : '✗')
  const statusColor = isPending ? THEME.yellow : (success ? THEME.green : THEME.red)

  // Format input (compact version - just first param)
  const inputText = showInput ? formatInput(input, 30) : ''

  // Get latest progress
  const latestProgress = isPending && progressUpdates?.length
    ? progressUpdates[progressUpdates.length - 1]
    : null

  return (
    <box style={{ flexDirection: 'row' }}>
      <text style={{ fg: statusColor as any }}>
        {statusIcon}
      </text>
      <text style={{ fg: THEME.textMuted }}> </text>
      <text style={{ fg: THEME.cyan }}>
        {tool}
      </text>
      {inputText && (
        <>
          <text style={{ fg: THEME.textMuted }}> </text>
          <text style={{ fg: THEME.textDim }}>
            ({inputText})
          </text>
        </>
      )}
      {showDuration && duration !== undefined && (
        <>
          <text style={{ fg: THEME.textMuted }}> </text>
          <text style={{ fg: THEME.textDim }}>
            {formatDuration(duration)}
          </text>
        </>
      )}
      {latestProgress && (
        <>
          <text style={{ fg: THEME.textMuted }}> </text>
          <text style={{ fg: THEME.blue }}>
            {`${latestProgress.progress}%`}
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
