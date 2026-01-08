/**
 * WAXIN Agent TUI - OpenCode Style with Synthwave84 Theme
 */

import { createCliRenderer } from '@opentui/core'
import { createRoot, useKeyboard, useRenderer } from '@opentui/react'
import { useState, useCallback, useEffect } from 'react'
import { useAgent } from './hooks/useAgent.js'
import { log } from './lib/json-logger.js'
import { getStats, updateStats, formatTokens, formatCost } from './hooks/useStats.js'
import type { AgentStats } from './types.js'

// ═══════════════════════════════════════════════════════════════════════════════
// SYNTHWAVE84 THEME
// ═══════════════════════════════════════════════════════════════════════════════

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
  textMuted: '#495495'
} as const

// ═══════════════════════════════════════════════════════════════════════════════
// ASCII BANNER - Compact "WAXIN"
// ═══════════════════════════════════════════════════════════════════════════════

const BANNER = [
  '██╗    ██╗ █████╗ ██╗  ██╗██╗███╗   ██╗',
  '██║    ██║██╔══██╗╚██╗██╔╝██║████╗  ██║',
  '██║ █╗ ██║███████║ ╚███╔╝ ██║██╔██╗ ██║',
  '██║███╗██║██╔══██║ ██╔██╗ ██║██║╚██╗██║',
  '╚███╔███╔╝██║  ██║██╔╝ ██╗██║██║ ╚████║',
  ' ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝'
]

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Message {
  role: 'user' | 'assistant' | 'tool'
  content: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const App = () => {
  const renderer = useRenderer()
  const agent = useAgent()

  const [isExecuting, setIsExecuting] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [stats, setStats] = useState<AgentStats | null>(null)
  const [showOutput, setShowOutput] = useState(false)

  // ─────────────────────────────────────────────────────────────────────────────
  // Keyboard shortcuts
  // ─────────────────────────────────────────────────────────────────────────────

  useKeyboard((key) => {
    if (key.ctrl && key.name === 'k') {
      setMessages([])
      setShowOutput(false)
      log.debug('TUI', 'Messages cleared by user')
    }
    if (key.ctrl && key.name === 'c') {
      log.info('TUI', 'Shutting down - user requested exit')
      renderer?.destroy()
      process.exit(0)
    }
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Update stats periodically
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const interval = setInterval(() => {
      const currentStats = getStats()
      if (currentStats) setStats(currentStats)
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // ─────────────────────────────────────────────────────────────────────────────
  // Handle prompt submission
  // ─────────────────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (text: string) => {
      // Log every submission attempt
      log.info('TUI', 'Prompt submitted', {
        prompt: text.slice(0, 100),
        length: text.length,
        isExecuting
      })

      // Guard: empty or already executing
      if (!text.trim() || isExecuting) {
        log.debug('TUI', 'Submit blocked', {
          reason: !text.trim() ? 'empty_prompt' : 'already_executing',
          isExecuting
        })
        return
      }

      setIsExecuting(true)
      setShowOutput(true)
      setMessages((prev) => [...prev, { role: 'user', content: text }])

      log.info('AGENT', 'Execution starting', { prompt: text.slice(0, 50) })
      const startTime = Date.now()

      try {
        log.debug('AGENT', 'Calling agent.execute()', { promptLength: text.length })

        const result = await agent.execute(
          text,
          {},
          {
            onAssistantMessage: (msg: string) => {
              log.debug('AGENT', 'Assistant message received', {
                length: msg.length,
                preview: msg.slice(0, 80)
              })
              setMessages((prev) => {
                const last = prev[prev.length - 1]
                if (last?.role === 'assistant') {
                  return [...prev.slice(0, -1), { role: 'assistant', content: msg }]
                }
                return [...prev, { role: 'assistant', content: msg }]
              })
            },
            onToolCall: (tool: string, input?: unknown) => {
              log.info('TOOL', `Tool called: ${tool}`, {
                tool,
                inputKeys: input && typeof input === 'object' ? Object.keys(input as object) : []
              })
              setMessages((prev) => [...prev, { role: 'tool', content: tool }])
            }
          }
        )

        log.debug('AGENT', 'agent.execute() returned', {
          success: result.errors.length === 0,
          sessionId: result.sessionId,
          toolCallsCount: result.toolCalls.length,
          errorsCount: result.errors.length
        })

        // Log execution complete with full metrics
        log.executionComplete({
          prompt: text,
          durationMs: result.durationMs,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          costUsd: result.usage.totalCostUsd,
          toolCalls: result.toolCalls.length,
          success: result.errors.length === 0
        })

        updateStats({
          sessionId: result.sessionId,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          totalTokens: result.usage.inputTokens + result.usage.outputTokens,
          totalCostUsd: result.usage.totalCostUsd,
          durationMs: result.durationMs,
          toolCallsCount: result.toolCalls.length,
          errorsCount: result.errors.length
        })

        log.debug('TUI', 'Stats updated', {
          tokens: result.usage.inputTokens + result.usage.outputTokens,
          cost: result.usage.totalCostUsd
        })

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        const errorStack = error instanceof Error ? error.stack : undefined

        log.error('AGENT', 'Execution failed with exception', {
          error: errorMsg,
          stack: errorStack?.slice(0, 500),
          durationMs: Date.now() - startTime
        })

        setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${errorMsg}` }])
      }

      setIsExecuting(false)
      log.debug('TUI', 'Execution finished', { durationMs: Date.now() - startTime })
    },
    [agent, isExecuting]
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // Build status badges
  // ─────────────────────────────────────────────────────────────────────────────

  const statusBadge = isExecuting ? '◐' : '●'
  const modelBadge = 'claude-sonnet'
  const statsBadge = stats
    ? `${formatTokens(stats.totalTokens)} tk · ${formatCost(stats.totalCostUsd)}`
    : ''

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <box
      style={{
        flexDirection: 'column',
        backgroundColor: THEME.bg,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 2
      }}
    >
      {/* Spacer top */}
      <box style={{ flexGrow: 1 }} />

      {/* ASCII Banner */}
      <box style={{ alignItems: 'center', marginBottom: 2 }}>
        {BANNER.map((line, i) => (
          <text
            key={i}
            style={{
              fg: i < 3 ? THEME.purple : THEME.text
            }}
          >
            {line}
          </text>
        ))}
      </box>

      {/* Output Panel - only shows when there are messages */}
      {showOutput && messages.length > 0 && (
        <box
          style={{
            width: 60,
            maxHeight: 15,
            marginBottom: 1,
            padding: 1,
            border: true,
            borderStyle: 'rounded',
            borderColor: THEME.purple
          }}
        >
          <scrollbox
            style={{
              rootOptions: { backgroundColor: THEME.bgPanel },
              wrapperOptions: { backgroundColor: THEME.bgDark },
              viewportOptions: { backgroundColor: THEME.bg },
              contentOptions: { backgroundColor: THEME.bgPanel },
            }}
          >
            {messages.map((msg, i) => (
              <box
                key={i}
                style={{
                  width: "100%",
                  padding: 0,
                  marginBottom: msg.role === 'assistant' ? 1 : 0,
                  backgroundColor: 'transparent',
                }}
              >
                <text
                  style={{
                    fg: msg.role === 'user'
                      ? THEME.cyan
                      : msg.role === 'tool'
                        ? THEME.magenta
                        : THEME.green,
                  }}
                  content={msg.role === 'user' ? `▶ ${msg.content}` :
                          msg.role === 'tool' ? `  ⚡ ${msg.content}` :
                          msg.content}
                />
              </box>
            ))}
          </scrollbox>
        </box>
      )}

      {/* Input Area */}
      <box
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          width: 50,
          marginBottom: 1
        }}
      >
        <text style={{ fg: THEME.magenta }}>▎</text>
        <input
          placeholder='Ask anything... "List my bots"'
          onSubmit={handleSubmit}
          focused={!isExecuting}
          textColor={THEME.text}
          style={{ flexGrow: 1 }}
        />
      </box>

      {/* Status Badges */}
      <box style={{ flexDirection: 'row', marginBottom: 2 }}>
        <text style={{ fg: isExecuting ? THEME.yellow : THEME.green }}>
          {statusBadge}{' '}
        </text>
        <text style={{ fg: THEME.textDim }}>Build </text>
        <text style={{ fg: THEME.blue }}>{modelBadge} </text>
        <text style={{ fg: THEME.textDim }}>WAXIN Agent </text>
        {statsBadge && <text style={{ fg: THEME.textMuted }}>· {statsBadge}</text>}
      </box>

      {/* Shortcuts */}
      <box style={{ flexDirection: 'row' }}>
        <text style={{ fg: THEME.textDim }}>ctrl+c </text>
        <text style={{ fg: THEME.textMuted }}>quit   </text>
        <text style={{ fg: THEME.textDim }}>ctrl+k </text>
        <text style={{ fg: THEME.textMuted }}>clear</text>
      </box>

      {/* Spacer bottom */}
      <box style={{ flexGrow: 1 }} />

      {/* Footer */}
      <box
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: '100%',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingLeft: 1,
          paddingRight: 1
        }}
      >
        <text style={{ fg: THEME.textMuted }}>~/waxin-agent:master</text>
        <text style={{ fg: THEME.textMuted }}>v0.1.0</text>
      </box>
    </box>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

export async function startTUI(): Promise<void> {
  log.info('TUI', 'Starting WAXIN Agent...', {
    version: '0.1.0',
    node: process.version,
    platform: process.platform
  })

  const renderer = await createCliRenderer()
  renderer.setBackgroundColor(THEME.bg)

  log.debug('TUI', 'Renderer created', { backgroundColor: THEME.bg })

  createRoot(renderer).render(<App />)

  log.info('TUI', 'TUI rendered and ready')
}
