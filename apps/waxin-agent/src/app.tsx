/**
 * WAXIN Agent TUI - Professional Chatbot UX
 * Retro-futuristic terminal luxury with refined chat interface
 */

import { createCliRenderer, type TextareaRenderable } from '@opentui/core'
import { createRoot, useKeyboard, useRenderer } from '@opentui/react'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useAgent } from './hooks/useAgent.js'
import { log } from './lib/json-logger.js'
import { getStats, updateStats, formatTokens, formatCost } from './hooks/useStats.js'
import { Banner, initImageBackends, QuestionModal, Topbar, FloatingImage, initFloatingImageBackends, ChatBubble, ThinkingIndicator, SplashScreen, Header, StatsBarMinimal } from './components/index.js'
import { getActiveQuestion, answerQuestion, cancelQuestion, subscribeToQuestions, showQuestion } from './hooks/index.js'
import type { AgentStats, BannerConfig, UserQuestion } from './types.js'
import { DEFAULT_BANNER_CONFIG, FLOATING_IMAGE_CONFIG, DEFAULT_SPLASH_CONFIG } from './types.js'
import { resolve } from 'path'
import { readFileSync } from 'fs'

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
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type AgentType = 'build' | 'plan' | 'code'

interface Message {
  role: 'user' | 'assistant' | 'tool'
  content: string
  timestamp: Date
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

const AGENTS: { type: AgentType; label: string; color: string }[] = [
  { type: 'build', label: 'Build', color: THEME.blue },
  { type: 'plan', label: 'Plan', color: THEME.purple },
  { type: 'code', label: 'Code', color: THEME.cyan }
]

function getNextAgent(current: AgentType): AgentType {
  const currentIndex = AGENTS.findIndex(a => a.type === current)
  const nextIndex = (currentIndex + 1) % AGENTS.length
  return AGENTS[nextIndex].type
}

// Custom keybindings for textarea: Enter = submit, Shift+Enter = newline
const TEXTAREA_KEYBINDINGS: Array<{
  name: string
  shift?: boolean
  ctrl?: boolean
  meta?: boolean
  super?: boolean
  action: 'submit' | 'newline'
}> = [
    { name: 'return', action: 'submit' },
    { name: 'return', shift: true, action: 'newline' },
  ]

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const App = () => {
  const renderer = useRenderer()
  const agent = useAgent()

  const [splashVisible, setSplashVisible] = useState(DEFAULT_SPLASH_CONFIG.enabled)
  const [isExecuting, setIsExecuting] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [stats, setStats] = useState<AgentStats | null>(null)
  const [currentAgent, setCurrentAgent] = useState<AgentType>('build')
  const [bannerConfig] = useState<BannerConfig>(DEFAULT_BANNER_CONFIG)
  const [activeQuestion, setActiveQuestion] = useState<UserQuestion | null>(null)
  const [waxinText, setWaxinText] = useState<string>('')
  const textareaRef = useRef<TextareaRenderable | null>(null)

  // Load WAXIN text
  useEffect(() => {
    try {
      const waxinPath = resolve(process.cwd(), 'assets/waxin.ascii.txt')
      const waxinContent = readFileSync(waxinPath, 'utf-8')
      setWaxinText(waxinContent.trim())
    } catch {
      setWaxinText('WAXIN MK1 😈')
    }
  }, [])

  // ─────────────────────────────────────────────────────────────────────────────
  // Keyboard shortcuts
  // ─────────────────────────────────────────────────────────────────────────────

  useKeyboard((key) => {
    if (activeQuestion) return

    if (splashVisible && key.name === 'escape') {
      log.info('TUI', 'Splash screen skipped by user')
      setSplashVisible(false)
      return
    }

    if (key.ctrl && key.name === 'k') {
      setMessages([])
      log.debug('TUI', 'Messages cleared by user')
    }
    if (key.shift && key.name === 'tab') {
      const nextAgent = getNextAgent(currentAgent)
      setCurrentAgent(nextAgent)
      log.info('TUI', `Agent switched to ${nextAgent}`, { agent: nextAgent })
    }
    if (key.ctrl && key.name === 'c') {
      log.info('TUI', 'Shutting down - user requested exit')
      renderer?.destroy()
      process.exit(0)
    }
    if (key.name === 'f2') {
      const testQuestion: UserQuestion = {
        question: 'Which library should we use for date formatting?',
        header: 'Library',
        options: [
          { label: 'date-fns (Recommended)', description: 'Lightweight and tree-shakeable' },
          { label: 'moment.js', description: 'Feature-rich but larger bundle size' },
          { label: 'dayjs', description: 'Immutable and minimal API' },
          { label: 'Luxon', description: 'Modern Intl-based formatting' },
        ],
        multiSelect: false
      }
      showQuestion(testQuestion, {
        onAnswer: (response) => {
          log.info('TUI', 'Test question answered', { response })
        },
        onCancel: () => {
          log.info('TUI', 'Test question cancelled')
        }
      })
    }
    if (key.name === 'f3') {
      const testMultiQuestion: UserQuestion = {
        question: 'Which features do you want to enable?',
        header: 'Features',
        options: [
          { label: 'Dark Mode', description: 'Enable dark theme support' },
          { label: 'Analytics', description: 'Track user interactions' },
          { label: 'PWA Support', description: 'Progressive web app capabilities' },
          { label: 'Offline Mode', description: 'Cache data for offline use' },
        ],
        multiSelect: true
      }
      showQuestion(testMultiQuestion, {
        onAnswer: (response) => {
          log.info('TUI', 'Test multi-question answered', { response })
        },
        onCancel: () => {
          log.info('TUI', 'Test multi-question cancelled')
        }
      })
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
  // Subscribe to question state changes
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    return subscribeToQuestions(() => {
      setActiveQuestion(getActiveQuestion())
    })
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
        isExecuting,
        agent: currentAgent
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
      setIsStreaming(false)
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: text, timestamp: new Date() }
      ])

      log.info('AGENT', 'Execution starting', { prompt: text.slice(0, 50) })
      const startTime = Date.now()

      try {
        log.debug('AGENT', 'Calling agent.execute()', { promptLength: text.length })

        const result = await agent.execute(
          text,
          {},
          {
            onThinking: (thinkingText: string) => {
              log.debug('AGENT', 'Thinking text received', {
                length: thinkingText.length,
                preview: thinkingText.slice(0, 80)
              })
              // Optional: Display thinking text in a special way
              // For now, just log it - the ThinkingIndicator shows visual feedback
            },
            onAssistantMessage: (msg: string) => {
              log.debug('AGENT', 'Assistant message received', {
                length: msg.length,
                preview: msg.slice(0, 80)
              })
              setIsStreaming(true)
              setMessages((prev) => {
                const last = prev[prev.length - 1]
                if (last?.role === 'assistant') {
                  return [...prev.slice(0, -1), {
                    role: 'assistant',
                    content: msg,
                    timestamp: last.timestamp
                  }]
                }
                return [...prev, { role: 'assistant', content: msg, timestamp: new Date() }]
              })
            },
            onToolCall: (tool: string, input?: unknown) => {
              log.info('TOOL', `Tool called: ${tool}`, {
                tool,
                inputKeys: input && typeof input === 'object' ? Object.keys(input as object) : []
              })
              setMessages((prev) => [
                ...prev,
                { role: 'tool', content: tool, timestamp: new Date() }
              ])

              // Intercept AskUserQuestion tool calls
              if (tool === 'AskUserQuestion' && input && typeof input === 'object') {
                const askInput = input as {
                  questions?: Array<{
                    question: string
                    header: string
                    options: Array<{ label: string; description: string }>
                    multiSelect: boolean
                  }>
                }

                if (askInput.questions && askInput.questions.length > 0) {
                  const firstQuestion = askInput.questions[0]
                  log.info('TUI', 'AskUserQuestion detected, showing modal', {
                    header: firstQuestion.header,
                    optionsCount: firstQuestion.options.length,
                    multiSelect: firstQuestion.multiSelect
                  })

                  showQuestion({
                    question: firstQuestion.question,
                    header: firstQuestion.header,
                    options: firstQuestion.options,
                    multiSelect: firstQuestion.multiSelect
                  }, {
                    onAnswer: (response) => {
                      log.info('TUI', 'User answered question', { response })
                      // TODO: Send response back to agent
                    },
                    onCancel: () => {
                      log.info('TUI', 'User cancelled question')
                    }
                  })
                }
              }
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

        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Error: ${errorMsg}`, timestamp: new Date() }
        ])
      }

      setIsExecuting(false)
      setIsStreaming(false)
      log.debug('TUI', 'Execution finished', { durationMs: Date.now() - startTime })
    },
    [agent, isExecuting, currentAgent]
  )

  // Wrapper para el textarea - lee el texto del ref
  const handleTextareaSubmit = useCallback(() => {
    const text = textareaRef.current?.plainText || ''
    log.debug('TUI', 'Textarea submit triggered', { text: text.slice(0, 50), hasRef: !!textareaRef.current })
    if (text.trim() && !isExecuting) {
      handleSubmit(text)
      // Limpiar el textarea después de enviar
      textareaRef.current?.setText('')
    }
  }, [handleSubmit, isExecuting])

  // ─────────────────────────────────────────────────────────────────────────────
  // Build status badges
  // ─────────────────────────────────────────────────────────────────────────────

  const statusBadge = isStreaming ? '◓' : isExecuting ? '◐' : '●'
  const modelBadge = 'claude-sonnet'
  const statsBadge = stats
    ? `${formatTokens(stats.totalTokens)} tk · ${formatCost(stats.totalCostUsd)}`
    : ''

  // ─────────────────────────────────────────────────────────────────────────────
  // Render Components
  // ─────────────────────────────────────────────────────────────────────────────

  const hasMessages = messages.length > 0
  const currentAgentInfo = AGENTS.find(a => a.type === currentAgent)

  const PromptBox = ({ centered = false }: { centered?: boolean }) => (
    <box
      style={{
        flexDirection: 'column',
        width: centered ? '70%' : '100%',
        alignItems: centered ? 'center' : 'stretch',
        marginTop: centered ? 2 : 0,
        marginBottom: 1,
      }}
    >
      {/* Subtitle centered above prompt - always show when exists */}
      {bannerConfig.subtitle && (
        <box style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 1 }}>
          <text style={{ fg: THEME.textDim }}>
            {bannerConfig.subtitle}
          </text>
        </box>
      )}

      <box
        style={{
          border: true,
          borderStyle: 'rounded',
          borderColor: isExecuting ? THEME.textMuted : THEME.purple,
          backgroundColor: THEME.bgPanel,
          padding: 1,
          width: '100%',
        }}
      >
        <box style={{ flexDirection: 'row', width: '100%' }}>
          <text style={{ fg: THEME.magenta }}>▎ </text>
          <textarea
            ref={(r: TextareaRenderable | null) => { textareaRef.current = r }}
            initialValue=""
            placeholder='Dime algo waxin... Puedes listar tus bots, crear nuevos, o simplemente joder'
            onSubmit={handleTextareaSubmit}
            keyBindings={TEXTAREA_KEYBINDINGS}
            focused={!isExecuting}
            textColor={THEME.text}
            style={{ width: '100%', height: 4 }}
          />
        </box>
        <box style={{ flexDirection: 'row', marginTop: 1 }}>
          <text style={{ fg: currentAgentInfo?.color ?? THEME.cyan }}>
            {currentAgentInfo?.label ?? 'Build'}
          </text>
          <text style={{ fg: THEME.textDim }}> · {modelBadge}</text>
          {statsBadge && (
            <text style={{ fg: THEME.textMuted }}> · {statsBadge}</text>
          )}
        </box>
      </box>
      {centered && (
        <box style={{ flexDirection: 'row', marginTop: 1, justifyContent: 'center' }}>
          <text style={{ fg: THEME.textMuted }}>tab</text>
          <text style={{ fg: THEME.textDim }}> switch agent  </text>
          <text style={{ fg: THEME.textMuted }}>ctrl+c</text>
          <text style={{ fg: THEME.textDim }}> quit</text>
        </box>
      )}
    </box>
  )

  const StatusBar = () => (
    <box
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        paddingLeft: 1,
        paddingRight: 1,
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
      <box style={{ flexDirection: 'row' }}>
        <text style={{ fg: THEME.textMuted }}>ctrl+c </text>
        <text style={{ fg: THEME.textDim }}>quit  </text>
        <text style={{ fg: THEME.textMuted }}>ctrl+k </text>
        <text style={{ fg: THEME.textDim }}>clear  </text>
        <text style={{ fg: THEME.textMuted }}>shift+tab </text>
        <text style={{ fg: THEME.textDim }}>agent</text>
      </box>
    </box>
  )

  const Footer = () => (
    <box
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingLeft: 1,
        paddingRight: 1,
        marginTop: 1,
      }}
    >
      <text style={{ fg: THEME.textMuted }}>~/waxin-agent:master</text>
      <text style={{ fg: THEME.textMuted }}>v0.1.0</text>
    </box>
  )

  const MessageList = () => (
    <scrollbox
      style={{
        rootOptions: {
          backgroundColor: 'transparent',
          width: '100%',
          height: '100%',
        },
        wrapperOptions: {
          backgroundColor: 'transparent',
        },
        viewportOptions: {
          backgroundColor: 'transparent',
        },
        contentOptions: {
          backgroundColor: 'transparent',
        },
        scrollbarOptions: {
          trackOptions: {
            foregroundColor: THEME.purple,
            backgroundColor: THEME.bgDark,
          },
        },
      }}
      focused={!isExecuting}
    >
      {messages.map((msg) => (
        <ChatBubble message={msg} />
      ))}
    </scrollbox>
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // Main Render
  // ─────────────────────────────────────────────────────────────────────────────

  if (splashVisible) {
    return (
      <SplashScreen
        config={DEFAULT_SPLASH_CONFIG}
        onComplete={() => {
          log.info('TUI', 'Splash screen completed')
          setSplashVisible(false)
        }}
      />
    )
  }

  return (
    <box
      style={{
        flexDirection: 'column',
        backgroundColor: THEME.bg,
        height: '100%',
        width: '100%',
        padding: 1,
      }}
    >
      {hasMessages ? (
        <>
          {/* Chat Layout with Messages: Topbar with integrated stats + Expanded Scrollbox + Prompt + FloatingImage */}
          <Topbar text="WAXIN MK1" font="banner" isStreaming={isStreaming} isExecuting={isExecuting} />

          {/* Messages Area - EXPANDED */}
          <box
            style={{
              flexGrow: 1,
              marginTop: 1,
              paddingLeft: 1,
              paddingRight: 1,
              minHeight: '60%',
            }}
          >
            <MessageList />
          </box>

          {/* Thinking Indicator - animated spinner with personality words */}
          {isExecuting && (
            <ThinkingIndicator isStreaming={isStreaming} />
          )}

          {/* Prompt */}
          <PromptBox centered={false} />

          {/* Status Bar */}
          <StatusBar />

          {/* Floating Image - bottom-right */}
          <FloatingImage
            config={FLOATING_IMAGE_CONFIG}
            onImageError={(err) => log.warn('TUI', 'Floating image failed to load', { error: err.message })}
          />
        </>
      ) : (
        <>
          {/* Header con WAXIN animado - arriba del todo */}
          {waxinText && <Header waxinText={waxinText} />}

          {/* Stats Bar - siempre visible debajo del header */}
          <StatsBarMinimal isStreaming={isStreaming} isExecuting={isExecuting} />

          {/* Empty Layout: Centered Banner + Centered Prompt */}
          <box
            style={{
              flexGrow: 1,
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Banner
              config={bannerConfig}
              onImageError={(err) => log.warn('TUI', 'Banner image failed to load', { error: err.message })}
            />

            <PromptBox centered={true} />
          </box>
        </>
      )}

      {/* Footer - always visible */}
      <Footer />

      {/* Question Modal Overlay */}
      {activeQuestion && (
        <QuestionModal
          question={activeQuestion}
          onAnswer={(selectedOptions) => {
            log.info('TUI', 'Question answered', { selectedOptions })
            answerQuestion(selectedOptions)
          }}
          onCancel={() => {
            log.info('TUI', 'Question cancelled')
            cancelQuestion()
          }}
        />
      )}
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

  // Initialize Banner image backends
  const backend = await initImageBackends()
  log.info('TUI', 'Image backends initialized', { backend: backend ?? 'none' })

  // Initialize FloatingImage backends (same backend)
  await initFloatingImageBackends()
  log.info('TUI', 'Floating image backends initialized')

  const renderer = await createCliRenderer()
  renderer.setBackgroundColor(THEME.bg)

  log.debug('TUI', 'Renderer created', { backgroundColor: THEME.bg })

  createRoot(renderer).render(<App />)

  log.info('TUI', 'TUI rendered and ready')
}
