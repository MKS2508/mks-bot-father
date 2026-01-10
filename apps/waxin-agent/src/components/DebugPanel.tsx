/**
 * DebugPanel - Integrated debug tools with tabs
 * Combines ColorPalette, KeypressDebug, FPSMonitor, and Performance metrics
 */

import { useState, useCallback } from 'react'
import { useKeyboard } from '@opentui/react'
import { useFPSMonitor } from './FPSMonitor.js'
import { useKeypressDebug, getExportFilename } from './KeypressDebug.js'
import { WAXIN_THEME_COLORS, processColorPalette, formatColorPaletteAsText } from './ColorPalette.js'
import { globalTracker } from '../lib/performance-tracker.js'

export type DebugTab = 'colors' | 'keypress' | 'fps' | 'performance'

export interface DebugPanelProps {
  visible: boolean
  activeTab: DebugTab
  onTabChange: (tab: DebugTab) => void
  onClose: () => void
}

const TAB_LABELS: Record<DebugTab, string> = {
  colors: '🎨 Colors',
  keypress: '⌨️ Keypress',
  fps: '📊 FPS',
  performance: '⚡ Performance',
}

export function useDebugPanel(props: DebugPanelProps) {
  const [exportFilename, setExportFilename] = useState<string | null>(null)

  // FPS Monitor
  const fpsMonitor = useFPSMonitor({
    visible: props.visible && props.activeTab === 'fps',
    updateInterval: 500,
  })

  // Keypress Debug
  const keypressDebug = useKeypressDebug({
    visible: props.visible && props.activeTab === 'keypress',
    maxEvents: 100,
    onExport: useCallback((events) => {
      const filename = getExportFilename()
      // In a real implementation, this would write to a file
      // For now, we'll trigger a download or log
      console.log(`Exporting ${events.length} events to ${filename}`)
      setExportFilename(filename)
    }, []),
  })

  // Color Palette (pre-processed)
  const colorPalette = processColorPalette([...WAXIN_THEME_COLORS])

  // Handle tab switching with keyboard
  useKeyboard((key) => {
    if (!props.visible) return

    // Ctrl+1/2/3/4 to switch tabs
    if (key.ctrl) {
      if (key.name === '1') props.onTabChange('colors')
      if (key.name === '2') props.onTabChange('keypress')
      if (key.name === '3') props.onTabChange('fps')
      if (key.name === '4') props.onTabChange('performance')
    }

    // Esc to close
    if (key.name === 'escape') {
      props.onClose()
    }
  })

  // Format current tab content
  const formatTabContent = useCallback((): string[] => {
    switch (props.activeTab) {
      case 'colors':
        return formatColorPaletteAsText(colorPalette, 'list', 4, 8)

      case 'keypress': {
        if (keypressDebug.events.length === 0) {
          return ['No keyboard events captured yet.', 'Press any key to see events here.']
        }
        return keypressDebug.formattedEvents
      }

      case 'fps':
        return fpsMonitor.formatAsText()

      case 'performance':
        return globalTracker.formatDebugPanel({
          model: 'claude-sonnet-4-5-20250929',
          sessionId: globalTracker.getMetrics().toString() as any,
        })
    }
  }, [props.activeTab, colorPalette, keypressDebug, fpsMonitor])

  return {
    fpsMonitor,
    keypressDebug,
    colorPalette,
    exportFilename,
    formatTabContent,
    tabLabel: TAB_LABELS[props.activeTab],
  }
}
