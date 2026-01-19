/**
 * Compaction Service for the Bot Manager Agent.
 *
 * Provides context compaction via LLM-based summarization,
 * matching Claude Code's compaction behavior.
 */

import Anthropic from '@anthropic-ai/sdk'
import type {
  Message,
  CompactResult,
  CompactTrigger
} from '../types.js'
import { sessionService } from '../session/session-service.js'

const DEFAULT_THRESHOLD_TOKENS = 100000
const AUTO_COMPACT_THRESHOLD_PERCENT = 0.95
const CONTEXT_WINDOW_SIZE = 200000

const SUMMARY_PROMPT = `You have been working on the task described above but have not yet completed it. Write a continuation summary that will allow you to resume work efficiently in a future context window. Include:

1. **Task Overview**
   - The user's core request and success criteria
   - Any clarifications or constraints established

2. **Current State**
   - What has been completed so far
   - Files created, modified, or analyzed
   - Key outputs or artifacts produced

3. **Important Discoveries**
   - Technical constraints or requirements uncovered
   - Decisions made and their rationale
   - Errors encountered and resolutions
   - What approaches didn't work (and why)

4. **Next Steps**
   - Specific actions needed to complete the task
   - Any blockers or open questions
   - Priority order if multiple steps remain

5. **Context to Preserve**
   - User preferences or style requirements
   - Domain-specific details
   - Any commitments made to the user

Be comprehensive but concise. Wrap your summary in <summary></summary> tags.`

interface CompactionOptions {
  thresholdTokens?: number
  model?: string
  customSummaryPrompt?: string
}

class CompactionServiceClass {
  private anthropic: Anthropic | null = null
  private options: CompactionOptions = {
    thresholdTokens: DEFAULT_THRESHOLD_TOKENS,
    model: 'claude-haiku-4-5'
  }

  configure(options: CompactionOptions): void {
    this.options = { ...this.options, ...options }
  }

  private getClient(): Anthropic {
    if (!this.anthropic) {
      this.anthropic = new Anthropic()
    }
    return this.anthropic
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  private estimateMessagesTokens(messages: Message[]): number {
    return messages.reduce((total, msg) => {
      return total + this.estimateTokens(msg.content)
    }, 0)
  }

  shouldAutoCompact(currentTokens: number): boolean {
    const threshold = CONTEXT_WINDOW_SIZE * AUTO_COMPACT_THRESHOLD_PERCENT
    return currentTokens >= threshold
  }

  shouldCompact(messages: Message[]): boolean {
    const tokens = this.estimateMessagesTokens(messages)
    return tokens >= (this.options.thresholdTokens || DEFAULT_THRESHOLD_TOKENS)
  }

  private formatMessagesForSummary(messages: Message[]): string {
    return messages.map(msg => {
      const role = msg.role === 'user' ? 'Human' : msg.role === 'assistant' ? 'Assistant' : 'System'
      let content = `${role}: ${msg.content}`

      if (msg.toolCalls?.length) {
        const toolSummary = msg.toolCalls.map(tc =>
          `[Tool: ${tc.tool}]`
        ).join(', ')
        content += `\n${toolSummary}`
      }

      return content
    }).join('\n\n')
  }

  private extractSummary(response: string): string {
    const match = response.match(/<summary>([\s\S]*?)<\/summary>/)
    if (match?.[1]) {
      return match[1].trim()
    }
    return response.trim()
  }

  async compact(
    sessionId: string,
    trigger: CompactTrigger = 'manual'
  ): Promise<CompactResult> {
    const session = await sessionService.get(sessionId)

    if (!session) {
      return {
        success: false,
        previousTokens: 0,
        newTokens: 0,
        summary: '',
        trigger
      }
    }

    const previousTokens = this.estimateMessagesTokens(session.messages)

    if (session.messages.length === 0) {
      return {
        success: true,
        previousTokens: 0,
        newTokens: 0,
        summary: 'No messages to compact.',
        trigger
      }
    }

    const formattedConversation = this.formatMessagesForSummary(session.messages)
    const summaryPrompt = this.options.customSummaryPrompt || SUMMARY_PROMPT

    try {
      const client = this.getClient()

      const response = await client.messages.create({
        model: this.options.model || 'claude-haiku-4-5',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: `Here is the conversation history to summarize:\n\n${formattedConversation}\n\n${summaryPrompt}`
          }
        ]
      })

      const responseText = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('')

      const summary = this.extractSummary(responseText)
      const newTokens = this.estimateTokens(summary)

      await sessionService.setSummary(sessionId, summary)

      return {
        success: true,
        previousTokens,
        newTokens,
        summary,
        trigger
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      return {
        success: false,
        previousTokens,
        newTokens: previousTokens,
        summary: `Compaction failed: ${errorMessage}`,
        trigger
      }
    }
  }

  async compactMessages(
    messages: Message[],
    _trigger: CompactTrigger = 'manual'
  ): Promise<{
    success: boolean
    summary: string
    previousTokens: number
    newTokens: number
  }> {
    const previousTokens = this.estimateMessagesTokens(messages)

    if (messages.length === 0) {
      return {
        success: true,
        summary: '',
        previousTokens: 0,
        newTokens: 0
      }
    }

    const formattedConversation = this.formatMessagesForSummary(messages)
    const summaryPrompt = this.options.customSummaryPrompt || SUMMARY_PROMPT

    try {
      const client = this.getClient()

      const response = await client.messages.create({
        model: this.options.model || 'claude-haiku-4-5',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: `Here is the conversation history to summarize:\n\n${formattedConversation}\n\n${summaryPrompt}`
          }
        ]
      })

      const responseText = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('')

      const summary = this.extractSummary(responseText)
      const newTokens = this.estimateTokens(summary)

      return {
        success: true,
        summary,
        previousTokens,
        newTokens
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      return {
        success: false,
        summary: `Compaction failed: ${errorMessage}`,
        previousTokens,
        newTokens: previousTokens
      }
    }
  }

  getTokenStats(messages: Message[]): {
    totalTokens: number
    threshold: number
    percentUsed: number
    shouldCompact: boolean
    shouldAutoCompact: boolean
  } {
    const totalTokens = this.estimateMessagesTokens(messages)
    const threshold = this.options.thresholdTokens || DEFAULT_THRESHOLD_TOKENS

    return {
      totalTokens,
      threshold,
      percentUsed: (totalTokens / CONTEXT_WINDOW_SIZE) * 100,
      shouldCompact: totalTokens >= threshold,
      shouldAutoCompact: this.shouldAutoCompact(totalTokens)
    }
  }

  getSummaryPrompt(): string {
    return this.options.customSummaryPrompt || SUMMARY_PROMPT
  }
}

export const compactionService = new CompactionServiceClass()
