import { useState, useEffect } from 'react'
import { extend, useRenderer } from '@opentui/react'
import {
  GifImageRenderable,
  ImageRenderable,
  autoDetectBackends,
  useFastestBackend,
  getCurrentBackendName
} from '@mks2508/opentui-image'
import type { BannerConfig } from '../types.js'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import { THEME } from '../theme/colors.js'

declare module '@opentui/react' {
  interface OpenTUIComponents {
    'terminal-gif': typeof GifImageRenderable
    'terminal-image': typeof ImageRenderable
  }
}

extend({ 'terminal-gif': GifImageRenderable })
extend({ 'terminal-image': ImageRenderable })

const ASCII_BANNER_COMPACT = [
  '██╗    ██╗ █████╗ ██╗  ██╗██╗███╗   ██╗',
  '██║ █╗ ██║███████║ ╚███╔╝ ██║██╔██╗ ██║',
  '╚███╔███╔╝██║  ██║██╔╝ ██╗██║██║ ╚████║'
]

interface BannerProps {
  config: BannerConfig
  onImageError?: (error: Error) => void
}

export const Banner = ({ config, onImageError }: BannerProps) => {
  const renderer = useRenderer()
  const termWidth = renderer?.terminalWidth ?? 80
  const [loadError, setLoadError] = useState<Error | null>(null)
  const [backendReady, setBackendReady] = useState(false)
  const [devilAsciiLines, setDevilAsciiLines] = useState<string[]>([])

  // Load devil ASCII art as array of lines
  useEffect(() => {
    try {
      const asciiPath = resolve(process.cwd(), 'assets/devil2.ascii.txt')
      const asciiContent = readFileSync(asciiPath, 'utf-8')
      setDevilAsciiLines(asciiContent.trim().split('\n'))
    } catch (err) {
      // Silently fail, devil ASCII is optional
    }
  }, [])

  useEffect(() => {
    if (config.mode === 'image') {
      const initBackends = async () => {
        try {
          await autoDetectBackends()
          await useFastestBackend()
          setBackendReady(true)
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err))
          setLoadError(error)
          onImageError?.(error)
        }
      }
      initBackends()
    }
  }, [config.mode, onImageError])

  const handleImageError = (error: Error) => {
    setLoadError(error)
    onImageError?.(error)
  }

  const shouldShowAscii = config.mode === 'ascii' || loadError !== null || !backendReady
  const imagePath = config.imageSrc
    ? resolve(process.cwd(), config.imageSrc)
    : undefined

  // Scale image proportionally to terminal size
  // Values < 1 are treated as percentages, >= 1 as absolute values
  const configWidth = config.imageWidth ?? 0.35
  const configHeight = config.imageHeight ?? 0.5
  const imageWidth = configWidth < 1
    ? Math.floor(termWidth * configWidth)
    : Math.min(configWidth, termWidth - 4)
  const termHeight = renderer?.terminalHeight ?? 40
  const imageHeight = configHeight < 1
    ? Math.floor(termHeight * configHeight)
    : configHeight

  return (
    <box
      style={{
        flexDirection: 'row',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 0,
        gap: 4,
      }}
    >
      {/* Left: Image */}
      {shouldShowAscii ? (
        <box style={{ flexDirection: 'column' }}>
          {ASCII_BANNER_COMPACT.map((line, i) => (
            <text
              key={i}
              style={{ fg: i === 0 ? THEME.purple : i === 1 ? THEME.magenta : THEME.text }}
            >
              {line}
            </text>
          ))}
        </box>
      ) : (
        imagePath && backendReady && (
          config.animated ? (
            <terminal-gif
              src={imagePath}
              width={imageWidth}
              height={imageHeight}
              animated={true}
              autoPlay={true}
              loop={true}
              objectFit="contain"
              onError={handleImageError}
            />
          ) : (
            <terminal-image
              src={imagePath}
              width={imageWidth}
              height={imageHeight}
              objectFit="contain"
              onError={handleImageError}
            />
          )
        )
      )}

      {/* Right: Devil ASCII - line by line, preserve leading spaces */}
      <box
        style={{
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {devilAsciiLines.map((line, i) => (
          <text key={i} style={{ fg: THEME.magenta }}>
            {line}
          </text>
        ))}
      </box>
    </box>
  )
}

export const initImageBackends = async (): Promise<string | null> => {
  try {
    await autoDetectBackends()
    await useFastestBackend()
    return getCurrentBackendName()
  } catch {
    return null
  }
}
