/**
 * ChatLayout - Shown when there are messages
 * NOTE: PromptBox is now rendered OUTSIDE layouts to prevent unmounting/remounting
 */

import { Header } from '../components/Header.js'
import { Topbar } from '../components/Topbar.js'
import { MessageList } from '../components/MessageList.js'
import { ThinkingIndicator } from '../components/ThinkingIndicator.js'
import { StatusBar } from '../components/StatusBar.js'
import { FloatingImage } from '../components/FloatingImage.js'
import { log } from '../lib/json-logger.js'
import { FLOATING_IMAGE_CONFIG } from '../types.js'
import type { Message, AgentInfo } from '../types.js'

interface ChatLayoutProps {
  messages: Message[]
  isExecuting: boolean
  isStreaming: boolean
  currentAgentInfo: AgentInfo | undefined
  modelBadge: string
  showHeader?: boolean
  waxinText?: string
  isDialogOpen?: boolean
}

export function ChatLayout({
  messages,
  isExecuting,
  isStreaming,
  currentAgentInfo,
  modelBadge,
  showHeader = false,
  waxinText = 'WAXIN MK1 😈',
  isDialogOpen = false,
}: ChatLayoutProps) {
  return (
    <>
      {/* Chat Layout with Messages: Header (DEBUG mode) + Topbar + Expanded Scrollbox */}
      {showHeader && <Header waxinText={waxinText} />}
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
        <MessageList messages={messages} isExecuting={isExecuting} />
      </box>

      {/* Thinking Indicator - animated spinner with personality words */}
      {isExecuting && (
        <ThinkingIndicator isStreaming={isStreaming} />
      )}

      {/* Status Bar */}
      <StatusBar
        isStreaming={isStreaming}
        isExecuting={isExecuting}
        currentAgentInfo={currentAgentInfo}
        modelBadge={modelBadge}
      />

      {/* Floating Image - bottom-right (hidden when dialog is open) */}
      {!isDialogOpen && (
        <FloatingImage
          config={FLOATING_IMAGE_CONFIG}
          onImageError={(err) => log.warn('TUI', 'Floating image failed to load', { error: err.message })}
        />
      )}
    </>
  )
}
