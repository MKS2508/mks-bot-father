/**
 * EmptyLayout - Shown when there are no messages
 * Displays Header, StatsBarMinimal, centered Banner, and centered PromptBox
 */

import type { TextareaRenderable } from '@opentui/core'
import { Banner } from '../components/Banner.js'
import { PromptBox } from '../components/PromptBox.js'
import { Header } from '../components/Header.js'
import { StatsBarMinimal } from '../components/StatsBar.js'
import { ThinkingIndicator } from '../components/ThinkingIndicator.js'
import { log } from '../lib/json-logger.js'
import type { BannerConfig, AgentInfo } from '../types.js'

interface EmptyLayoutProps {
  bannerConfig: BannerConfig
  isExecuting: boolean
  isStreaming: boolean
  currentAgentInfo: AgentInfo | undefined
  modelBadge: string
  textareaRef: React.RefObject<TextareaRenderable | null>
  textareaFocused: boolean
  handleTextareaSubmit: () => void
  showHeader?: boolean
  waxinText?: string
  isDialogOpen?: boolean
}

export function EmptyLayout({
  bannerConfig,
  isExecuting,
  isStreaming,
  currentAgentInfo,
  modelBadge,
  textareaRef,
  textareaFocused,
  handleTextareaSubmit,
  showHeader = false,
  waxinText = 'WAXIN MK1 😈',
  isDialogOpen = false,
}: EmptyLayoutProps) {
  return (
    <>
      {/* Header con WAXIN animado - arriba del todo (DEBUG mode) */}
      {showHeader && <Header waxinText={waxinText} />}

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
        {/* Banner hidden when dialog is open (terminal images bypass z-index) */}
        {!isDialogOpen && (
          <Banner
            config={bannerConfig}
            onImageError={(err) => log.warn('TUI', 'Banner image failed to load', { error: err.message })}
          />
        )}

        <PromptBox
          centered={true}
          bannerSubtitle={bannerConfig.subtitle}
          textareaRef={textareaRef}
          textareaFocused={textareaFocused}
          isExecuting={isExecuting}
          currentAgentInfo={currentAgentInfo}
          modelBadge={modelBadge}
          onSubmit={handleTextareaSubmit}
        />

        {/* Thinking Indicator - muestra feedback inmediato cuando se envía mensaje */}
        {isExecuting && (
          <ThinkingIndicator isStreaming={isStreaming} />
        )}
      </box>
    </>
  )
}
