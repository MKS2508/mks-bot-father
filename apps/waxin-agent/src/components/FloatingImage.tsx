/**
 * Floating image positioned at bottom-right
 * Reduced size, fixed position, stays visible
 */

import { useEffect, useState } from 'react'
import { extend } from '@opentui/react'
import {
  ImageRenderable,
  autoDetectBackends,
  useFastestBackend
} from '@mks2508/opentui-image'
import type { BannerConfig } from '../types.js'
import { resolve } from 'path'

declare module '@opentui/react' {
  interface OpenTUIComponents {
    'terminal-image': typeof ImageRenderable
  }
}

extend({ 'terminal-image': ImageRenderable })

interface FloatingImageProps {
  config: BannerConfig
  onImageError?: (error: Error) => void
}

export const FloatingImage = ({ config, onImageError }: FloatingImageProps) => {
  const [loadError, setLoadError] = useState<Error | null>(null)
  const [backendReady, setBackendReady] = useState(false)

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

  const imagePath = config.imageSrc
    ? resolve(process.cwd(), config.imageSrc)
    : undefined

  const imageWidth = config.imageWidth ?? 25
  const imageHeight = config.imageHeight ?? 10

  const showImage = config.mode === 'image' && imagePath && backendReady && !loadError

  if (!showImage) {
    return null
  }

  return (
    <box
      style={{
        position: 'absolute',
        right: 1,
        bottom: 2,
        width: imageWidth,
        height: imageHeight,
        zIndex: 0,
      }}
    >
      <terminal-image
        src={imagePath}
        width={imageWidth}
        height={imageHeight}
        objectFit="contain"
        onError={handleImageError}
      />
    </box>
  )
}

export const initFloatingImageBackends = async (): Promise<string | null> => {
  try {
    await autoDetectBackends()
    await useFastestBackend()
    return 'image-backend-ready'
  } catch {
    return null
  }
}
