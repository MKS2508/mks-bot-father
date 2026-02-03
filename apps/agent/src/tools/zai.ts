/**
 * z.ai MCP Tools.
 *
 * Provides integration with z.ai MCP servers:
 * - web-search-prime: Advanced web search (HTTP remote)
 * - web-reader: Web content reading (HTTP remote)
 * - vision-mcp: Image/video analysis (LOCAL stdio with npx)
 *
 * Documentation:
 * - https://docs.z.ai/devpack/mcp/search-mcp-server.md
 * - https://docs.z.ai/devpack/mcp/vision-mcp-server.md
 * - https://docs.z.ai/devpack/mcp/web-reader-mcp-server.md
 */

const ZAI_API_KEY = process.env.ZAI_API_KEY
const ZAI_BASE_URL = 'https://api.z.ai/api/mcp'

// ─────────────────────────────────────────────────────────────────────────
// HTTP REMOTE MCP SERVERS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Create HTTP MCP server config for remote z.ai services.
 */
function createZaiHttpMcpConfig(endpoint: string) {
  if (!ZAI_API_KEY) {
    console.warn(`[z.ai] ZAI_API_KEY not set, ${endpoint} MCP server will not be available`)
    return null
  }

  return {
    type: 'http' as const,
    url: `${ZAI_BASE_URL}/${endpoint}/mcp`,
    headers: {
      'Authorization': `Bearer ${ZAI_API_KEY}`
    }
  }
}

// Web Search Prime MCP Server (HTTP remote)
// Tool: webSearchPrime
// Docs: https://docs.z.ai/devpack/mcp/search-mcp-server.md
export const webSearchPrimeServer = createZaiHttpMcpConfig('web_search_prime')

// Web Reader MCP Server (HTTP remote)
// Tool: webReader
// Docs: https://docs.z.ai/devpack/mcp/web-reader-mcp-server.md
export const webReaderServer = createZaiHttpMcpConfig('web_reader')

// ─────────────────────────────────────────────────────────────────────────
// LOCAL STDIO MCP SERVERS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Create local stdio MCP server config for zai-mcp-server.
 * This runs @z_ai/mcp-server via npx locally.
 *
 * Tools provided:
 * - ui_to_artifact - Turn UI screenshots into code
 * - extract_text_from_screenshot - OCR screenshots
 * - diagnose_error_screenshot - Analyze error snapshots
 * - understand_technical_diagram - Interpret diagrams
 * - analyze_data_visualization - Read charts
 * - ui_diff_check - Compare UI shots
 * - image_analysis - General image understanding
 * - video_analysis - Video understanding
 *
 * Docs: https://docs.z.ai/devpack/mcp/vision-mcp-server.md
 */
export function createZaiVisionMcpConfig() {
  if (!ZAI_API_KEY) {
    console.warn('[z.ai] ZAI_API_KEY not set, vision-mcp server will not be available')
    return null
  }

  return {
    type: 'stdio' as const,
    command: 'npx',
    args: ['-y', '@z_ai/mcp-server'],
    env: {
      Z_AI_API_KEY: ZAI_API_KEY,
      Z_AI_MODE: 'ZAI'
    }
  }
}

export const visionMcpServer = createZaiVisionMcpConfig()

// ─────────────────────────────────────────────────────────────────────────
// EXPORT ALL MCP SERVERS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Get all z.ai MCP servers configuration.
 * Returns object with server names as keys.
 */
export function getZaiMcpServers(): Record<string, unknown> {
  const servers: Record<string, unknown> = {}

  // Add HTTP remote servers
  if (webSearchPrimeServer) {
    servers['web-search-prime'] = webSearchPrimeServer
  }
  if (webReaderServer) {
    servers['web-reader'] = webReaderServer
  }

  // Add local stdio server
  if (visionMcpServer) {
    servers['vision-mcp'] = visionMcpServer
  }

  return servers
}

/**
 * Check if z.ai MCP servers are available.
 */
export function isZaiAvailable(): boolean {
  return !!ZAI_API_KEY
}

/**
 * Get list of available z.ai MCP server names.
 */
export function getZaiServerNames(): string[] {
  return Object.keys(getZaiMcpServers())
}

// ─────────────────────────────────────────────────────────────────────────
// TOOL PATTERNS FOR allowedTools
// ─────────────────────────────────────────────────────────────────────────

/**
 * Tool name patterns for z.ai MCP servers.
 * These will be dynamically discovered at runtime when MCP servers connect,
 * but we add wildcard patterns to allowedTools for safety.
 */
export const zaiToolPatterns = [
  'mcp__web-search-prime__*',
  'mcp__web-reader__*',
  'mcp__vision-mcp__*'
]

/**
 * Expected tools from each z.ai MCP server.
 * Useful for testing and validation.
 */
export const zaiExpectedTools = {
  'web-search-prime': ['mcp__web-search-prime__webSearchPrime'],
  'web-reader': ['mcp__web-reader__webReader'],
  'vision-mcp': [
    'mcp__vision-mcp__ui_to_artifact',
    'mcp__vision-mcp__extract_text_from_screenshot',
    'mcp__vision-mcp__diagnose_error_screenshot',
    'mcp__vision-mcp__understand_technical_diagram',
    'mcp__vision-mcp__analyze_data_visualization',
    'mcp__vision-mcp__ui_diff_check',
    'mcp__vision-mcp__image_analysis',
    'mcp__vision-mcp__video_analysis'
  ]
}
