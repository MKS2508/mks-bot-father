/**
 * TUI-specific types for the Bot Manager Agent TUI.
 *
 * Agent types are imported from @mks2508/bot-manager-agent.
 */

// Re-export agent types for convenience
export type {
  AgentResult,
  AgentOptions,
  AgentUsage,
  ToolCallLog
} from '@mks2508/bot-manager-agent'

/**
 * Agent callbacks for streaming and progress.
 */
export interface AgentCallbacks {
  onMessage?: (message: unknown) => void
  onAssistantMessage?: (text: string) => void
  onToolCall?: (tool: string, input: unknown) => void
  onProgress?: (progress: number, message: string) => void
  onThinking?: (text: string) => void
  onToolComplete?: (execution: ToolExecution) => void
}

/**
 * Tool execution tracking.
 */
export interface ToolExecution {
  tool: string
  input: unknown
  startTime: number
  endTime?: number
  duration?: number
  success?: boolean
  result?: unknown
  error?: string
}

/**
 * Log levels for filtering and display.
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * Log entry structure.
 */
export interface LogEntry {
  timestamp: string
  level: LogLevel
  component: string
  message: string
  data?: unknown
}

/**
 * Log filter configuration.
 */
export interface LogFilter {
  level: LogLevel
  component?: string
  search?: string
  since?: Date
}

/**
 * Agent stats structure (computed from AgentResult).
 */
export interface AgentStats {
  sessionId: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  totalCostUsd: number
  durationMs: number
  toolCallsCount: number
  errorsCount: number
}

/**
 * Output mode for agent responses.
 */
export type OutputMode = 'streaming' | 'final' | 'progress'

/**
 * TUI configuration options.
 */
export interface TUIConfig {
  outputMode: OutputMode
  showToolCalls: boolean
  showThinking: boolean
}

/**
 * Log file configuration.
 */
export interface LogFileConfig {
  directory: string
  maxSize: number
  maxFiles: number
  pattern: string
}

/**
 * Banner display mode.
 */
export type BannerMode = 'ascii' | 'image'

/**
 * Banner configuration.
 */
export interface BannerConfig {
  mode: BannerMode
  imageSrc?: string
  title: string
  subtitle?: string
  animated?: boolean
  imageWidth?: number
  imageHeight?: number
}

/**
 * Default banner configuration.
 */
export const DEFAULT_BANNER_CONFIG: BannerConfig = {
  mode: 'image',
  imageSrc: './assets/luciadibu.png',
  title: '',
  subtitle: 'Agente de código y gestión de bots muy basado 😈',
  animated: false,
  imageWidth: 0.35,
  imageHeight: 0.5
}

// Config for FloatingImage (reduced size, bottom-right)
export const FLOATING_IMAGE_CONFIG: BannerConfig = {
  mode: 'image',
  imageSrc: './assets/luciadibu.png',
  title: '',
  subtitle: '',
  animated: false,
  imageWidth: 25,
  imageHeight: 10
}

/**
 * Option for user question.
 */
export interface QuestionOption {
  label: string
  description: string
}

/**
 * User question from agent.
 */
export interface UserQuestion {
  question: string
  header: string
  options: QuestionOption[]
  multiSelect: boolean
}

/**
 * Response to user question.
 */
export interface QuestionResponse {
  questionIndex: number
  selectedOptions: string[]
}

/**
 * Splash screen configuration.
 */
export interface SplashConfig {
  enabled: boolean
  durationMs: number
  getGifs: () => string[]
  imageWidth?: number
  imageHeight?: number
}

/**
 * Get all animated image files from assets folder dynamically using fs.
 * Supports .gif and .webp (animated).
 */
function getAssetGifs(): string[] {
  const fs = require('fs')
  const path = require('path')
  const assetsDir = path.join(__dirname, '../assets')

  try {
    const files = fs.readdirSync(assetsDir)
    return files
      .filter((f: string) => (f.endsWith('.gif') || f.endsWith('.webp')) && !f.includes('nugshotz'))
      .map((f: string) => `./assets/${f}`)
  } catch {
    return []
  }
}

/**
 * Default splash screen configuration.
 */
export const DEFAULT_SPLASH_CONFIG: SplashConfig = {
  enabled: true,
  durationMs: 5000,
  getGifs: getAssetGifs,
  imageWidth: 85, // Porcentaje del ancho del terminal
  imageHeight: 70, // Porcentaje del alto del terminal
}

/**
 * Spinner words array for WAXIN MK1 personality.
 * Categories: Arabic insults, porros, hash, yerbas, macarra, Helsinki, programming, random.
 */
export const SPINNER_WORDS: readonly string[] = [
  // Insultos en árabe/letras raras
  'laín 3al t4b0n m0k',
  't4pbn 13m4kk',
  'wallah',
  'yallah',
  'habibi',
  'mabrook',
  'inshallah',
  'mashallah',

  // Porros/fumar
  'fumando dry',
  'roll it up',
  'spark it',
  'fumando bareta',
  'porro finito',
  'fumando porro',
  'chupalla',
  'preciado',
  'cogollo',
  'mota',

  // Hash/dry sift
  'dry sift',
  'static',
  'kief',
  'bubble hash',
  'rosin',
  'ice wax',
  'charas',
  'finger hash',

  // Variedades de yerba
  'og kush',
  'girl scout cookies',
  'wedding cake',
  'gelato',
  'zkittlez',
  'purple haze',
  'northern lights',
  'sour diesel',
  'blue dream',
  'white widow',
  'amnesia',
  'critical',

  // Verbos/macarra
  'sile',
  'sape',
  'klk',
  'ke vida bro',
  'redi',
  'reeeedi',
  'super redii',

  // Helsinki/datacenter
  'full dark',
  'blackout',
  'dead',
  'datacenter burning',
  'server melting',

  // Programación ego
  'compilando',
  'deploying',
  'mergeando',
  'pulleando',
  'commiteando',
  'pusheando',
  'debuggeando',
  'refactorizando',
  'optimizeando',

  // Random personality
  'cosas así',
  'ni puta idea socio',
  'sus muermos',
  'gran topo',
  'deymos',
] as const

/**
 * Chat message structure.
 */
export interface Message {
  role: 'user' | 'assistant' | 'tool'
  content: string
  timestamp: Date
}

/**
 * Agent information display.
 */
export interface AgentInfo {
  type: string
  label: string
  color: string
}
