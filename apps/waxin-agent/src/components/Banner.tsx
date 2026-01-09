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

declare module '@opentui/react' {
  interface OpenTUIComponents {
    'terminal-gif': typeof GifImageRenderable
    'terminal-image': typeof ImageRenderable
  }
}

extend({ 'terminal-gif': GifImageRenderable })
extend({ 'terminal-image': ImageRenderable })

const THEME = {
  purple: '#b381c5',
  magenta: '#ff7edb',
  cyan: '#36f9f6',
  text: '#ffffff',
  textDim: '#848bbd',
} as const

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
  const [devilAscii, setDevilAscii] = useState<string>('')

  // Load devil ASCII art as single string
  useEffect(() => {
    try {
      const asciiPath = resolve(process.cwd(), 'assets/devil2.ascii.txt')
      const asciiContent = readFileSync(asciiPath, 'utf-8')
      setDevilAscii(asciiContent.trim())
    } catch (err) {
      console.error('Failed to load devil ASCII:', err)
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

  const imageWidth = Math.min(config.imageWidth ?? 40, termWidth - 4)
  const imageHeight = config.imageHeight ?? 8

  return (
    <box
      style={{
        flexDirection: 'row',
        width: '100%',
        alignItems: 'flex-start',
        marginBottom: 0,
        paddingLeft: 1,
        paddingRight: 1,
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

      {/* Right: Devil ASCII only */}
      <box
        style={{
          flexDirection: 'column',
          alignItems: 'flex-end',
          flexGrow: 1,
          marginLeft: 2,
        }}
      >
        {/* Devil ASCII as single text block */}
        {devilAscii && (
          <text style={{ fg: THEME.magenta }}>
            {devilAscii}
          </text>
        )}
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
