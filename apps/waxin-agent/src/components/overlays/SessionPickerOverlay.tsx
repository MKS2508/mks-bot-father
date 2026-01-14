/**
 * SessionPickerOverlay - Interactive session picker overlay
 * Shows list of available sessions with selection and actions
 */

import { useEffect, useState, useCallback } from 'react'
import { useKeyboard, useRenderer } from '@opentui/react'
import type { SessionMetadata } from '@mks2508/bot-manager-agent'
import { getGlobalBridge } from '../../lib/agent-bridge.js'
import type { OverlayComponentProps } from './index.js'

const THEME = {
  bg: '#262335',
  bgDark: '#1a1a2e',
  bgPanel: '#2a2139',
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
} as const

interface SessionPickerOverlayProps extends OverlayComponentProps {
  onSessionSelect?: (sessionId: string) => void
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function truncateString(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 3) + '...'
}

export const SessionPickerOverlay = ({ onClose, onSessionSelect }: SessionPickerOverlayProps) => {
  const renderer = useRenderer()
  const [sessions, setSessions] = useState<SessionMetadata[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const bridge = getGlobalBridge()

  useEffect(() => {
    const loadSessions = async () => {
      try {
        setLoading(true)
        const sessionList = await bridge.listSessions(undefined, 20)
        setSessions(sessionList)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sessions')
      } finally {
        setLoading(false)
      }
    }

    loadSessions()
  }, [bridge])

  const handleSelect = useCallback(async (index: number) => {
    const session = sessions[index]
    if (!session) return

    const success = await bridge.resumeSession(session.sessionId)
    if (success) {
      onSessionSelect?.(session.sessionId)
      onClose?.()
    }
  }, [sessions, bridge, onSessionSelect, onClose])

  useKeyboard((key) => {
    if (key.name === 'escape') {
      onClose?.()
      return
    }

    if (key.name === 'up') {
      setSelectedIndex(prev => Math.max(0, prev - 1))
    }

    if (key.name === 'down') {
      setSelectedIndex(prev => Math.min(sessions.length - 1, prev + 1))
    }

    if (key.name === 'return') {
      handleSelect(selectedIndex)
    }

    if (key.name === 'r' && key.ctrl) {
      handleSelect(selectedIndex)
    }
  })

  const termWidth = renderer?.terminalWidth ?? 120
  const termHeight = renderer?.terminalHeight ?? 40
  const overlayWidth = Math.min(80, termWidth - 4)
  const overlayHeight = Math.min(24, termHeight - 4)
  const listHeight = overlayHeight - 8

  const currentSession = bridge.getSessionId()

  return (
    <box
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Backdrop */}
      <box
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.7)' as any,
        }}
      />

      {/* Modal */}
      <box
        style={{
          position: 'absolute',
          top: Math.floor((termHeight - overlayHeight) / 2),
          left: Math.floor((termWidth - overlayWidth) / 2),
          width: overlayWidth,
          height: overlayHeight,
          flexDirection: 'column',
          backgroundColor: THEME.bg as any,
          border: { type: 'line', fg: THEME.purple as any },
          zIndex: 1,
        }}
      >
        {/* Header */}
        <box
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 1,
            paddingBottom: 1,
          }}
        >
          <text style={{ fg: THEME.cyan as any, bold: true }}>
            {'📂 Resume Session'}
          </text>
        </box>

        {/* Separator */}
        <box style={{ flexDirection: 'row', paddingLeft: 1, paddingRight: 1 }}>
          <text style={{ fg: THEME.purple as any }}>
            {'─'.repeat(overlayWidth - 4)}
          </text>
        </box>

        {/* Content */}
        {loading ? (
          <box
            style={{
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: listHeight,
            }}
          >
            <text style={{ fg: THEME.textDim as any }}>{'Loading sessions...'}</text>
          </box>
        ) : error ? (
          <box
            style={{
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: listHeight,
            }}
          >
            <text style={{ fg: THEME.red as any }}>{'Error: ' + error}</text>
          </box>
        ) : sessions.length === 0 ? (
          <box
            style={{
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: listHeight,
            }}
          >
            <text style={{ fg: THEME.textDim as any }}>{'No sessions found'}</text>
            <text style={{ fg: THEME.textMuted as any, marginTop: 1 }}>
              {'Start a new conversation to create a session'}
            </text>
          </box>
        ) : (
          <box
            style={{
              flexDirection: 'column',
              paddingTop: 1,
              paddingLeft: 1,
              paddingRight: 1,
              height: listHeight,
              overflow: 'hidden',
            }}
          >
            {sessions.slice(0, listHeight - 1).map((session, index) => {
              const isSelected = index === selectedIndex
              const isCurrent = session.sessionId === currentSession
              const nameWidth = overlayWidth - 40

              return (
                <box
                  key={session.sessionId}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isSelected ? (THEME.purple as any) : undefined,
                    paddingLeft: 1,
                    paddingRight: 1,
                  }}
                >
                  {/* Indicator */}
                  <text style={{ fg: isCurrent ? (THEME.green as any) : (THEME.textMuted as any) }}>
                    {isCurrent ? '●' : ' '}
                  </text>

                  {/* Session name/ID */}
                  <text
                    style={{
                      fg: isSelected ? (THEME.bg as any) : (THEME.text as any),
                      marginLeft: 1,
                      width: nameWidth,
                    }}
                  >
                    {truncateString(session.name || session.sessionId, nameWidth)}
                  </text>

                  {/* Message count */}
                  <text
                    style={{
                      fg: isSelected ? (THEME.bg as any) : (THEME.cyan as any),
                      width: 8,
                    }}
                  >
                    {`${session.messageCount}msg`}
                  </text>

                  {/* Git branch */}
                  {session.gitBranch && (
                    <text
                      style={{
                        fg: isSelected ? (THEME.bg as any) : (THEME.magenta as any),
                        width: 12,
                      }}
                    >
                      {truncateString(session.gitBranch, 10)}
                    </text>
                  )}

                  {/* Last activity */}
                  <text
                    style={{
                      fg: isSelected ? (THEME.bg as any) : (THEME.textDim as any),
                      width: 10,
                    }}
                  >
                    {formatRelativeTime(session.lastMessageAt)}
                  </text>
                </box>
              )
            })}
          </box>
        )}

        {/* Footer */}
        <box
          style={{
            position: 'absolute',
            bottom: 1,
            left: 0,
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <text style={{ fg: THEME.textDim as any }}>{'↑↓ navigate'}</text>
          <text style={{ fg: THEME.textMuted as any }}>{' · '}</text>
          <text style={{ fg: THEME.textDim as any }}>{'Enter resume'}</text>
          <text style={{ fg: THEME.textMuted as any }}>{' · '}</text>
          <text style={{ fg: THEME.textDim as any }}>{'Esc close'}</text>
        </box>
      </box>
    </box>
  )
}
