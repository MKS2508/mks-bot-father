/**
 * Tests for format utilities
 * Testing date, number, and string formatting functions
 */

import { describe, it, expect } from 'vitest'
import {
  formatTimestamp,
  formatTimestampShort,
  formatDuration,
  formatMemory,
  formatBytes,
  formatNumber,
  truncate,
  getExportFilename,
} from './format'

describe('formatTimestamp', () => {
  it('should format date to HH:MM:SS', () => {
    const date = new Date('2026-01-10T14:30:45Z')
    expect(formatTimestamp(date)).toBe('14:30:45')
  })

  it('should pad single digits with zeros', () => {
    const date = new Date('2026-01-10T01:02:03Z')
    expect(formatTimestamp(date)).toBe('01:02:03')
  })

  it('should handle midnight', () => {
    const date = new Date('2026-01-10T00:00:00Z')
    expect(formatTimestamp(date)).toBe('00:00:00')
  })

  it('should handle end of day', () => {
    const date = new Date('2026-01-10T23:59:59Z')
    expect(formatTimestamp(date)).toBe('23:59:59')
  })
})

describe('formatTimestampShort', () => {
  it('should format date to HH:MM', () => {
    const date = new Date('2026-01-10T14:30:45Z')
    expect(formatTimestampShort(date)).toBe('14:30')
  })

  it('should pad single digits with zeros', () => {
    const date = new Date('2026-01-10T01:02:03Z')
    expect(formatTimestampShort(date)).toBe('01:02')
  })
})

describe('formatDuration', () => {
  it('should format milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms')
    expect(formatDuration(999)).toBe('999ms')
  })

  it('should format seconds', () => {
    expect(formatDuration(1000)).toBe('1.0s')
    expect(formatDuration(1500)).toBe('1.5s')
    expect(formatDuration(59999)).toBe('60.0s')
  })

  it('should format minutes and seconds', () => {
    expect(formatDuration(60000)).toBe('1m 0s')
    expect(formatDuration(65000)).toBe('1m 5s')
    expect(formatDuration(125000)).toBe('2m 5s')
  })

  it('should handle zero', () => {
    expect(formatDuration(0)).toBe('0ms')
  })
})

describe('formatMemory', () => {
  it('should format MB', () => {
    expect(formatMemory(100)).toBe('100MB')
    expect(formatMemory(999)).toBe('999MB')
  })

  it('should format GB', () => {
    expect(formatMemory(1024)).toBe('1.0GB')
    expect(formatMemory(2048)).toBe('2.0GB')
    expect(formatMemory(1536)).toBe('1.5GB')
  })

  it('should handle zero', () => {
    expect(formatMemory(0)).toBe('0MB')
  })
})

describe('formatBytes', () => {
  it('should format bytes', () => {
    expect(formatBytes(100)).toBe('100B')
    expect(formatBytes(1023)).toBe('1023B')
  })

  it('should format KB', () => {
    expect(formatBytes(1024)).toBe('1.0KB')
    expect(formatBytes(1536)).toBe('1.5KB')
    expect(formatBytes(1024 * 1000)).toBe('1000.0KB')
  })

  it('should format MB', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0MB')
    expect(formatBytes(1024 * 1024 * 100)).toBe('100.0MB')
  })

  it('should format GB', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00GB')
    expect(formatBytes(1024 * 1024 * 1024 * 2.5)).toBe('2.50GB')
  })

  it('should handle zero', () => {
    expect(formatBytes(0)).toBe('0B')
  })
})

describe('formatNumber', () => {
  it('should add thousand separators', () => {
    expect(formatNumber(1000)).toBe('1,000')
    expect(formatNumber(1000000)).toBe('1,000,000')
    expect(formatNumber(1234567)).toBe('1,234,567')
  })

  it('should handle small numbers', () => {
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(100)).toBe('100')
    expect(formatNumber(999)).toBe('999')
  })

  it('should handle decimals', () => {
    expect(formatNumber(1234.56)).toBe('1,234.56')
  })
})

describe('truncate', () => {
  it('should return string as-is if shorter than max', () => {
    expect(truncate('hello', 10)).toBe('hello')
    expect(truncate('hello', 5)).toBe('hello')
  })

  it('should truncate and add ellipsis if longer than max', () => {
    expect(truncate('hello world', 8)).toBe('hello...')
    expect(truncate('verylongstring', 10)).toBe('verylongs...')
  })

  it('should handle empty string', () => {
    expect(truncate('', 10)).toBe('')
  })

  it('should handle edge cases', () => {
    // maxLength < 3 still gets "..."
    expect(truncate('abcd', 3)).toBe('...')
    expect(truncate('abc', 3)).toBe('abc')
  })
})

describe('getExportFilename', () => {
  it('should generate filename with timestamp and default extension', () => {
    const filename = getExportFilename('test')
    expect(filename).toMatch(/^test-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/)
  })

  it('should use custom extension', () => {
    const filename = getExportFilename('test', 'txt')
    expect(filename).toMatch(/^test-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.txt$/)
  })

  it('should handle special characters in prefix', () => {
    const filename = getExportFilename('my_export file')
    expect(filename).toMatch(/^my_export file-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/)
  })
})
