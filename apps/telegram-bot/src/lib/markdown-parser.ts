/**
 * Markdown Parser for Telegram.
 * Tokenizes markdown and builds HTML directly (not via builder which escapes).
 */

import type { TelegramMessage } from '@mks2508/telegram-message-builder'

type TokenType =
  | 'text'
  | 'bold'
  | 'italic'
  | 'code'
  | 'codeBlock'
  | 'link'
  | 'header'
  | 'listItem'
  | 'blockquote'
  | 'newline'

interface Token {
  type: TokenType
  content: string
  meta?: { level?: number; lang?: string; url?: string }
}

interface ParsedSegment {
  start: number
  end: number
  token: Token
}

/**
 * Escape HTML special characters for safe embedding in Telegram HTML.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Tokenize markdown into an array of tokens.
 * Order is critical: code blocks first to protect their content.
 */
function tokenize(markdown: string): Token[] {
  const segments: ParsedSegment[] = []
  const text = markdown

  // 1. Code blocks (```lang\ncode\n```) - FIRST to protect content
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g
  let match: RegExpExecArray | null
  while ((match = codeBlockRegex.exec(text)) !== null) {
    segments.push({
      start: match.index,
      end: match.index + match[0].length,
      token: {
        type: 'codeBlock',
        content: match[2].trim(),
        meta: { lang: match[1] || undefined }
      }
    })
  }

  // 2. Headers (# text) - parse BEFORE list items to avoid conflicts
  const headerRegex = /^(#{1,6})\s+(.+)$/gm
  while ((match = headerRegex.exec(text)) !== null) {
    if (!isInsideSegment(match.index, segments)) {
      segments.push({
        start: match.index,
        end: match.index + match[0].length,
        token: {
          type: 'header',
          content: match[2],
          meta: { level: match[1].length }
        }
      })
    }
  }

  // 3. List items (- item or * item or 1. item) - parse BEFORE inline markdown
  const listRegex = /^[-*+]\s+(.+)$|^(\d+)\.\s+(.+)$/gm
  while ((match = listRegex.exec(text)) !== null) {
    if (!isInsideSegment(match.index, segments)) {
      const content = match[1] || match[3]
      segments.push({
        start: match.index,
        end: match.index + match[0].length,
        token: { type: 'listItem', content }
      })
    }
  }

  // 4. Blockquotes (> text)
  const blockquoteRegex = /^>\s+(.+)$/gm
  while ((match = blockquoteRegex.exec(text)) !== null) {
    if (!isInsideSegment(match.index, segments)) {
      segments.push({
        start: match.index,
        end: match.index + match[0].length,
        token: { type: 'blockquote', content: match[1] }
      })
    }
  }

  // 5. Inline code (`code`) - parse AFTER list items to avoid double-parsing
  const codeRegex = /`([^`]+)`/g
  while ((match = codeRegex.exec(text)) !== null) {
    if (!isInsideSegment(match.index, segments)) {
      segments.push({
        start: match.index,
        end: match.index + match[0].length,
        token: { type: 'code', content: match[1] }
      })
    }
  }

  // 6. Bold (**text** or __text__)
  const boldRegex = /\*\*([^*]+)\*\*|__([^_]+)__/g
  while ((match = boldRegex.exec(text)) !== null) {
    if (!isInsideSegment(match.index, segments)) {
      segments.push({
        start: match.index,
        end: match.index + match[0].length,
        token: { type: 'bold', content: match[1] || match[2] }
      })
    }
  }

  // 7. Italic (*text* or _text_) - careful not to match bold
  const italicRegex = /(?<!\*)\*([^*]+)\*(?!\*)|(?<!_)_([^_]+)_(?!_)/g
  while ((match = italicRegex.exec(text)) !== null) {
    if (!isInsideSegment(match.index, segments)) {
      segments.push({
        start: match.index,
        end: match.index + match[0].length,
        token: { type: 'italic', content: match[1] || match[2] }
      })
    }
  }

  // 8. Links [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  while ((match = linkRegex.exec(text)) !== null) {
    if (!isInsideSegment(match.index, segments)) {
      segments.push({
        start: match.index,
        end: match.index + match[0].length,
        token: {
          type: 'link',
          content: match[1],
          meta: { url: match[2] }
        }
      })
    }
  }

  // Sort segments by position
  segments.sort((a, b) => a.start - b.start)

  // Build final token array with text segments
  const tokens: Token[] = []
  let lastEnd = 0

  for (const seg of segments) {
    // Add text before this segment
    if (seg.start > lastEnd) {
      const textContent = text.slice(lastEnd, seg.start)
      if (textContent.trim()) {
        tokens.push({ type: 'text', content: textContent })
      } else if (textContent.includes('\n')) {
        tokens.push({ type: 'newline', content: '\n' })
      }
    }
    tokens.push(seg.token)
    lastEnd = seg.end
  }

  // Add remaining text
  if (lastEnd < text.length) {
    const textContent = text.slice(lastEnd)
    if (textContent.trim()) {
      tokens.push({ type: 'text', content: textContent })
    }
  }

  return tokens
}

/**
 * Check if a position is inside any existing segment.
 */
function isInsideSegment(pos: number, segments: ParsedSegment[]): boolean {
  return segments.some(seg => pos >= seg.start && pos < seg.end)
}

/**
 * Tokenize inline markdown (bold, italic, code, links) without block elements.
 * Used for recursively parsing content inside headers, lists, blockquotes.
 */
function tokenizeInline(text: string): Token[] {
  const segments: ParsedSegment[] = []

  // 1. Inline code (`code`)
  const codeRegex = /`([^`]+)`/g
  let match: RegExpExecArray | null
  while ((match = codeRegex.exec(text)) !== null) {
    segments.push({
      start: match.index,
      end: match.index + match[0].length,
      token: { type: 'code', content: match[1] }
    })
  }

  // 2. Bold (**text** or __text__)
  const boldRegex = /\*\*([^*]+)\*\*|__([^_]+)__/g
  while ((match = boldRegex.exec(text)) !== null) {
    if (!isInsideSegment(match.index, segments)) {
      segments.push({
        start: match.index,
        end: match.index + match[0].length,
        token: { type: 'bold', content: match[1] || match[2] }
      })
    }
  }

  // 3. Italic (*text* or _text_)
  const italicRegex = /(?<!\*)\*([^*]+)\*(?!\*)|(?<!_)_([^_]+)_(?!_)/g
  while ((match = italicRegex.exec(text)) !== null) {
    if (!isInsideSegment(match.index, segments)) {
      segments.push({
        start: match.index,
        end: match.index + match[0].length,
        token: { type: 'italic', content: match[1] || match[2] }
      })
    }
  }

  // 4. Links [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  while ((match = linkRegex.exec(text)) !== null) {
    if (!isInsideSegment(match.index, segments)) {
      segments.push({
        start: match.index,
        end: match.index + match[0].length,
        token: {
          type: 'link',
          content: match[1],
          meta: { url: match[2] }
        }
      })
    }
  }

  // Sort segments by position
  segments.sort((a, b) => a.start - b.start)

  // Build final token array with text segments
  const tokens: Token[] = []
  let lastEnd = 0

  for (const seg of segments) {
    // Add text before this segment
    if (seg.start > lastEnd) {
      const textContent = text.slice(lastEnd, seg.start)
      if (textContent) {
        tokens.push({ type: 'text', content: textContent })
      }
    }
    tokens.push(seg.token)
    lastEnd = seg.end
  }

  // Add remaining text
  if (lastEnd < text.length) {
    const textContent = text.slice(lastEnd)
    if (textContent) {
      tokens.push({ type: 'text', content: textContent })
    }
  }

  return tokens
}

/**
 * Render inline tokens to HTML string.
 * Fixed: don't re-parse if content already looks like HTML.
 */
function renderInline(text: string): string {
  // If text already contains HTML tags, don't re-parse (avoid double-escaping)
  if (text.includes('<code>') || text.includes('<b>') || text.includes('<i>')) {
    return text
  }

  const tokens = tokenizeInline(text)
  const parts: string[] = []

  for (const token of tokens) {
    switch (token.type) {
      case 'text':
        parts.push(escapeHtml(token.content))
        break
      case 'bold':
        parts.push(`<b>${escapeHtml(token.content)}</b>`)
        break
      case 'italic':
        parts.push(`<i>${escapeHtml(token.content)}</i>`)
        break
      case 'code':
        parts.push(`<code>${escapeHtml(token.content)}</code>`)
        break
      case 'link':
        parts.push(`<a href="${escapeHtml(token.meta?.url || '')}">${escapeHtml(token.content)}</a>`)
        break
    }
  }

  return parts.join('')
}

/**
 * Build TelegramMessage from tokens - directly constructs HTML without using builder.
 * The builder's .text() method escapes HTML tags, which we don't want for pre-formatted content.
 */
function buildFromTokens(tokens: Token[]): TelegramMessage {
  const parts: string[] = []

  for (const token of tokens) {
    switch (token.type) {
      case 'text':
        parts.push(escapeHtml(token.content))
        break
      case 'bold':
        parts.push(`<b>${escapeHtml(token.content)}</b>`)
        break
      case 'italic':
        parts.push(`<i>${escapeHtml(token.content)}</i>`)
        break
      case 'code':
        parts.push(`<code>${escapeHtml(token.content)}</code>`)
        break
      case 'codeBlock': {
        const lang = token.meta?.lang
        if (lang) {
          parts.push(`<pre><code class="language-${lang}">${escapeHtml(token.content)}</code></pre>`)
        } else {
          parts.push(`<pre>${escapeHtml(token.content)}</pre>`)
        }
        break
      }
      case 'link':
        parts.push(`<a href="${escapeHtml(token.meta?.url || '')}">${escapeHtml(token.content)}</a>`)
        break
      case 'header': {
        const prefix = token.meta?.level === 1 ? '📌 ' : token.meta?.level === 2 ? '▸ ' : '• '
        // Parse inline markdown inside header content
        const renderedContent = renderInline(token.content)
        parts.push(`\n${prefix}<b>${renderedContent}</b>\n`)
        break
      }
      case 'listItem':
        // Just escape HTML, don't re-parse inline markdown (already parsed in tokenize)
        parts.push(`• ${escapeHtml(token.content)}\n`)
        break
      case 'blockquote':
        // Parse inline markdown inside blockquote
        const renderedQuote = renderInline(token.content)
        parts.push(`<i>❝ ${renderedQuote}</i>\n`)
        break
      case 'newline':
        parts.push('\n')
        break
    }
  }

  return {
    text: parts.join(''),
    parse_mode: 'html'
  }
}

/**
 * Parse agent response markdown and return TelegramMessage array.
 * Handles chunking for long responses.
 */
export function parseAgentResponse(markdown: string, maxLength = 4000): TelegramMessage[] {
  // For short messages, just parse directly
  if (markdown.length <= maxLength) {
    const tokens = tokenize(markdown)
    return [buildFromTokens(tokens)]
  }

  // For long messages, chunk by paragraphs
  const paragraphs = markdown.split(/\n\n+/)
  const messages: TelegramMessage[] = []
  let currentChunk = ''

  for (const para of paragraphs) {
    if (currentChunk.length + para.length + 2 > maxLength) {
      if (currentChunk) {
        const tokens = tokenize(currentChunk)
        messages.push(buildFromTokens(tokens))
      }
      currentChunk = para
    } else {
      currentChunk = currentChunk ? `${currentChunk}\n\n${para}` : para
    }
  }

  // Add final chunk
  if (currentChunk) {
    const tokens = tokenize(currentChunk)
    messages.push(buildFromTokens(tokens))
  }

  return messages
}

/**
 * Check if text contains markdown syntax.
 */
export function containsMarkdown(text: string): boolean {
  const patterns = [
    /\*\*[^*]+\*\*/,
    /(?<!\*)\*[^*]+\*(?!\*)/,
    /__[^_]+__/,
    /(?<!_)_[^_]+_(?!_)/,
    /`[^`]+`/,
    /```[\s\S]+```/,
    /^#{1,6}\s/m,
    /\[.+\]\(.+\)/,
    /^[-*+]\s/m,
    /^\d+\.\s/m,
    /^>\s/m,
  ]
  return patterns.some(p => p.test(text))
}
