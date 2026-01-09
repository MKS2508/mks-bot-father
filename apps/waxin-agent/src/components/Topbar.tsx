/**
 * Topbar with figlet "WAXIN MK1" using full block chars
 */

import { useState, useEffect } from 'react'
import figlet from 'figlet'

const THEME = {
  purple: '#b381c5',
  magenta: '#ff7edb',
  cyan: '#36f9f6',
} as const

interface TopbarProps {
  text?: string
  font?: string
}

export const Topbar = ({
  text = 'WAXIN MK1',
  font = 'banner'
}: TopbarProps) => {
  const [asciiArt, setAsciiArt] = useState<string>('')

  useEffect(() => {
    figlet(text, { font }, (err, data) => {
      if (!err && data) {
        setAsciiArt(data.trim())
      }
    })
  }, [text, font])

  if (!asciiArt) {
    return null
  }

  const lines = asciiArt.split('\n').filter(line => line.trim())

  return (
    <box
      style={{
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: 1,
        padding: 0,
      }}
    >
      {lines.map((line, i) => (
        <text
          key={i}
          style={{
            fg: i === 0 ? THEME.purple
              : i === 1 ? THEME.magenta
              : THEME.cyan
          }}
        >
          {line}
        </text>
      ))}
    </box>
  )
}
