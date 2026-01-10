/**
 * EmptyLayout - Shown when there are no messages
 * Synthwave84 retro-futuristic cyberpunk aesthetic
 */

import { Banner } from '../components/Banner.js'
import { Header } from '../components/Header.js'
import { StatsBarMinimal } from '../components/StatsBar.js'
import { ThinkingIndicator } from '../components/ThinkingIndicator.js'
import { log } from '../lib/json-logger.js'
import { THEME } from '../theme/colors.js'
import type { BannerConfig } from '../types.js'

interface EmptyLayoutProps {
  bannerConfig: BannerConfig
  isExecuting: boolean
  isStreaming: boolean
  isDialogOpen?: boolean
  showHeader?: boolean
  waxinText?: string
}

const CyberDivider = ({ variant = 'default' }: { variant?: 'default' | 'glow' | 'subtle' }) => {
  const colors = {
    default: { line: THEME.textMuted, accent: THEME.magenta },
    glow: { line: THEME.purple, accent: THEME.cyan },
    subtle: { line: THEME.textMuted, accent: THEME.textDim },
  }
  const { line, accent } = colors[variant]

  return (
    <box style={{ flexDirection: 'row', justifyContent: 'center', width: '100%', marginTop: 1, marginBottom: 1 }}>
      <text style={{ fg: line }}>{'─'.repeat(8)}</text>
      <text style={{ fg: accent }}> ◈ </text>
      <text style={{ fg: line }}>{'─'.repeat(8)}</text>
    </box>
  )
}

export function EmptyLayout({
  bannerConfig,
  isExecuting,
  isStreaming,
  isDialogOpen = false,
  showHeader = true,
  waxinText = 'WAXIN MK1 😈',
}: EmptyLayoutProps) {
  return (
    <>
      {/* Header with animated WAXIN ASCII */}
      {showHeader && <Header waxinText={waxinText} />}

      {/* Subtle divider after header */}
      {showHeader && <CyberDivider variant="subtle" />}

      {/* Main Content Area - centered with atmosphere */}
      <box
        style={{
          flexGrow: 1,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {/* Banner hidden when dialog is open (terminal images bypass z-index) */}
        {!isDialogOpen && (
          <Banner
            config={bannerConfig}
            onImageError={(err) => log.warn('TUI', 'Banner image failed to load', { error: err.message })}
          />
        )}

        {/* Glowing divider before stats */}
        <CyberDivider variant="glow" />

        {/* Stats Bar - MCP servers, tools, tokens, cost */}
        <StatsBarMinimal isStreaming={isStreaming} isExecuting={isExecuting} />

        {/* Thinking Indicator - shows in empty layout too */}
        {isExecuting && (
          <box style={{ marginTop: 1 }}>
            <ThinkingIndicator isStreaming={isStreaming} />
          </box>
        )}
      </box>
    </>
  )
}
