/**
 * EmptyLayout - Shown when there are no messages
 * NOTE: PromptBox is now rendered OUTSIDE layouts to prevent unmounting/remounting
 */

import { Banner } from '../components/Banner.js'
import { ThinkingIndicator } from '../components/ThinkingIndicator.js'
import { log } from '../lib/json-logger.js'
import type { BannerConfig } from '../types.js'

interface EmptyLayoutProps {
  bannerConfig: BannerConfig
  isExecuting: boolean
  isStreaming: boolean
  isDialogOpen?: boolean
}

export function EmptyLayout({
  bannerConfig,
  isExecuting,
  isStreaming,
  isDialogOpen = false,
}: EmptyLayoutProps) {
  return (
    <>
      {/* Empty Layout: Centered Banner */}
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

        {/* Thinking Indicator - shows in empty layout too */}
        {isExecuting && (
          <ThinkingIndicator isStreaming={isStreaming} />
        )}
      </box>
    </>
  )
}
