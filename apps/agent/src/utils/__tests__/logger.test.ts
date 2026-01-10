/**
 * Tests for Agent Logger.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  appendFileSync: vi.fn()
}))

vi.mock('node:os', () => ({
  homedir: () => '/mock-home'
}))

vi.mock('node:path', () => ({
  join: (...parts: string[]) => parts.join('/'),
  resolve: (...parts: string[]) => parts.join('/')
}))

vi.mock('chalk', () => ({
  default: {
    blue: (s: string) => `[blue]${s}[/blue]`,
    green: (s: string) => `[green]${s}[/green]`,
    yellow: (s: string) => `[yellow]${s}[/yellow]`,
    red: (s: string) => `[red]${s}[/red]`,
    gray: (s: string) => `[gray]${s}[/gray]`,
    cyan: (s: string) => `[cyan]${s}[/cyan]`,
    magenta: (s: string) => `[magenta]${s}[/magenta]`
  }
}))

import { logger, logAgentEvent } from '../logger.js'
import * as fs from 'node:fs'

const mockFs = vi.mocked(fs)

describe('logger', () => {
  let logSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
    errorSpy.mockRestore()
  })

  describe('console output', () => {
    it('info() outputs to console', () => {
      logger.info('Test info message')

      expect(logSpy).toHaveBeenCalledTimes(1)
      const output = logSpy.mock.calls[0]![0] as string
      expect(output).toContain('Test info message')
    })

    it('success() outputs message', () => {
      logger.success('Task completed')

      expect(logSpy).toHaveBeenCalledTimes(1)
      const output = logSpy.mock.calls[0]![0] as string
      expect(output).toContain('Task completed')
    })

    it('warn() outputs message', () => {
      logger.warn('Warning message')

      expect(logSpy).toHaveBeenCalledTimes(1)
      const output = logSpy.mock.calls[0]![0] as string
      expect(output).toContain('Warning message')
    })

    it('error() outputs to console.error', () => {
      logger.error('Error occurred')

      expect(errorSpy).toHaveBeenCalledTimes(1)
      const output = errorSpy.mock.calls[0]![0] as string
      expect(output).toContain('Error occurred')
    })

    it('debug() does not output when DEBUG env is not set', () => {
      delete process.env.DEBUG

      logger.debug('Debug message')

      expect(logSpy).not.toHaveBeenCalled()
    })

    it('assistant() outputs message', () => {
      logger.assistant('Assistant response here')

      expect(logSpy).toHaveBeenCalledTimes(1)
      const output = logSpy.mock.calls[0]![0] as string
      expect(output).toContain('Assistant response here')
    })

    it('tool() outputs tool name', () => {
      logger.tool('my_tool', { arg: 'value' })

      expect(logSpy).toHaveBeenCalledTimes(1)
      const output = logSpy.mock.calls[0]![0] as string
      expect(output).toContain('my_tool')
    })

    it('toolResult() outputs tool name', () => {
      logger.toolResult('my_tool', { result: 'data' }, true, 100)

      expect(logSpy).toHaveBeenCalledTimes(1)
      const output = logSpy.mock.calls[0]![0] as string
      expect(output).toContain('my_tool')
    })
  })

  describe('file logging', () => {
    it('info() logs to JSONL file', () => {
      logger.info('Test message', { key: 'value' })

      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(1)
      const logContent = mockFs.appendFileSync.mock.calls[0]![1] as string
      const parsed = JSON.parse(logContent.replace('\n', ''))

      expect(parsed.level).toBe('INF')
      expect(parsed.src).toBe('AGENT')
      expect(parsed.msg).toBe('Test message')
      expect(parsed.data).toEqual({ key: 'value' })
    })

    it('error() logs with ERR level', () => {
      logger.error('Error message', { code: 500 })

      const logContent = mockFs.appendFileSync.mock.calls[0]![1] as string
      const parsed = JSON.parse(logContent.replace('\n', ''))

      expect(parsed.level).toBe('ERR')
    })

    it('warn() logs with WRN level', () => {
      logger.warn('Warning message')

      const logContent = mockFs.appendFileSync.mock.calls[0]![1] as string
      const parsed = JSON.parse(logContent.replace('\n', ''))

      expect(parsed.level).toBe('WRN')
    })

    it('debug() logs with DBG level even without console output', () => {
      delete process.env.DEBUG

      logger.debug('Debug only in file')

      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(1)
      const logContent = mockFs.appendFileSync.mock.calls[0]![1] as string
      const parsed = JSON.parse(logContent.replace('\n', ''))

      expect(parsed.level).toBe('DBG')
    })

    it('tool() logs tool_call with tool name', () => {
      logger.tool('execute_command', { cmd: 'ls' })

      const logContent = mockFs.appendFileSync.mock.calls[0]![1] as string
      const parsed = JSON.parse(logContent.replace('\n', ''))

      expect(parsed.msg).toBe('tool_call')
      expect(parsed.data.tool).toBe('execute_command')
      expect(parsed.data.hasInput).toBe(true)
    })

    it('toolResult() logs with duration when provided', () => {
      logger.toolResult('my_tool', 'result data', true, 250)

      const logContent = mockFs.appendFileSync.mock.calls[0]![1] as string
      const parsed = JSON.parse(logContent.replace('\n', ''))

      expect(parsed.msg).toBe('tool_result')
      expect(parsed.data.duration_ms).toBe(250)
      expect(parsed.data.success).toBe(true)
    })

    it('toolResult() logs failure correctly', () => {
      logger.toolResult('my_tool', 'error result', false)

      const logContent = mockFs.appendFileSync.mock.calls[0]![1] as string
      const parsed = JSON.parse(logContent.replace('\n', ''))

      expect(parsed.level).toBe('ERR')
      expect(parsed.data.success).toBe(false)
    })

    it('assistant() logs preview of response', () => {
      const longMessage = 'A'.repeat(300)
      logger.assistant(longMessage)

      const logContent = mockFs.appendFileSync.mock.calls[0]![1] as string
      const parsed = JSON.parse(logContent.replace('\n', ''))

      expect(parsed.msg).toBe('assistant_response')
      expect(parsed.data.preview.length).toBe(200)
    })

    it('creates log directory if missing', () => {
      mockFs.existsSync.mockReturnValue(false)

      logger.info('Test')

      expect(mockFs.mkdirSync).toHaveBeenCalledTimes(1)
      const dirPath = mockFs.mkdirSync.mock.calls[0]![0] as string
      expect(dirPath).toContain('.config/mks-bot-father/logs')
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true }
      )
    })

    it('silently fails on write error', () => {
      mockFs.appendFileSync.mockImplementation(() => {
        throw new Error('Disk full')
      })

      expect(() => logger.info('Test')).not.toThrow()
    })
  })

  describe('logAgentEvent', () => {
    it('logs events with correct structure', () => {
      logAgentEvent('INF', 'Event happened', { detail: 'info' })

      const logContent = mockFs.appendFileSync.mock.calls[0]![1] as string
      const parsed = JSON.parse(logContent.replace('\n', ''))

      expect(parsed.src).toBe('AGENT')
      expect(parsed.msg).toBe('Event happened')
      expect(parsed.data).toEqual({ detail: 'info' })
    })

    it('includes metrics in data when provided', () => {
      logAgentEvent('INF', 'Task done', { task: 'x' }, { duration_ms: 100 })

      const logContent = mockFs.appendFileSync.mock.calls[0]![1] as string
      const parsed = JSON.parse(logContent.replace('\n', ''))

      expect(parsed.data.metrics).toEqual({ duration_ms: 100 })
    })
  })
})
