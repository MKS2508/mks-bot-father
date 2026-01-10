export { Banner, initImageBackends } from './Banner.js'
export { Topbar } from './Topbar.js'
export { FloatingImage, initFloatingImageBackends } from './FloatingImage.js'
export { QuestionModal } from './QuestionModal.js'
export { ChatBubble } from './ChatBubble.js'
export { ThinkingIndicator } from './ThinkingIndicator.js'
export { SplashScreen } from './SplashScreen.js'
export { Header } from './Header.js'
export { StatsBar, StatsBarMinimal } from './StatsBar.js'
export { ProgressBar } from './ProgressBar.js'
export { ToolResultCard, CompactToolResult } from './ToolResultCard.js'
export { ToolProgress, ToolProgressList } from './ToolProgress.js'

// New extracted components
export { PromptBox } from './PromptBox.js'
export { StatusBar } from './StatusBar.js'
export { MessageList } from './MessageList.js'
export { Footer } from './Footer.js'
export { HelpDialogContent } from './help/HelpDialogContent.js'

// Debug components
export { WAXIN_THEME_COLORS, processColorPalette, formatColorPaletteAsText } from './ColorPalette.js'
export { useKeypressDebug, formatEvent, exportEventsToJSON, getExportFilename } from './KeypressDebug.js'
export { useFPSMonitor, getMemoryStats } from './FPSMonitor.js'
export { useDebugPanel } from './DebugPanel.js'
export { formatDebugBox, getShortcutsByCategory, findShortcut, SHORTCUTS, CATEGORIES } from './DebugBox.js'
export type { DebugTab } from './DebugPanel.js'

// Overlay system
export { PositionedOverlay } from './PositionedOverlay.js'
export {
  type OverlayPosition,
  type OverlayConfig,
  type PositionType,
  calculatePosition,
  DEFAULT_OVERLAY_CONFIGS,
  ColorsOverlay,
  KeypressOverlay,
  FPSOverlay,
  PerformanceOverlay,
  QuestionTestOverlay,
  AgentSwitchOverlay,
  getOverlayComponent,
  hasOverlay,
} from './overlays/index.tsx'
