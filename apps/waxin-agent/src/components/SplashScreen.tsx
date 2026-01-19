/**
 * SplashScreen - Animated GIF splash screen with loading indicator
 * Displays random GIFs during startup with manual navigation
 * Responsive to terminal size
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { extend, useKeyboard, useRenderer } from '@opentui/react'
import { GifImageRenderable, loadImage } from '@mks2508/opentui-image'
import { SpinnerRenderable, createPulse } from 'opentui-spinner'
import 'opentui-spinner/react'
import type { SplashConfig } from '../types.js'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import { Header } from './Header.js'

declare module '@opentui/react' {
  interface OpenTUIComponents {
    'terminal-gif': typeof GifImageRenderable
    'spinner': typeof SpinnerRenderable
  }
}

extend({ 'terminal-gif': GifImageRenderable, 'spinner': SpinnerRenderable })

const RANDOM_SPINNERS = [
  'weather',
  'moon',
  'runner',
  'shark',
  'pong',
  'bouncingBall',
  'christmas',
  'earth',
  'hearts',
  'soccerHeader',
  'mindblown',
  'monkey',
  'fingerDance',
  'fistBump',
] as const

type RandomSpinner = typeof RANDOM_SPINNERS[number]

const THEME = {
  purple: '#b381c5',
  textDim: '#848bbd',
  textMuted: '#495495',
  blue: '#6e95ff',
  yellow: '#fede5d',
  magenta: '#ff6b9d',
} as const

type AsciiEffect = 'glitch' | 'matrix' | 'cyber' | 'scan' | 'decode'

interface SplashScreenProps {
  config: SplashConfig
  onComplete: () => void
  showHeader?: boolean
  waxinText?: string
  audioEnabled?: boolean
}

// Configuraciones individuales por GIF
interface GifRenderConfig {
  antiAlias: boolean
  antiAliasSamples?: 2 | 3 | 4
  dithering: "none" | "floyd-steinberg" | "ordered"
  gamma: number
}

const GIF_RENDER_CONFIGS: Record<string, GifRenderConfig> = {
  'mr-robot-1.gif': { antiAlias: false, dithering: "none", gamma: 1.0 },
  'mr-robot-2.gif': { antiAlias: false, dithering: "none", gamma: 1.0 },
  'mr-robot-3.gif': { antiAlias: false, dithering: "none", gamma: 0.75 },
  'mr-robot-4.gif': { antiAlias: false, dithering: "none", gamma: 1.0 },
  'famguy1.gif': { antiAlias: true, antiAliasSamples: 3, dithering: "none", gamma: 0.30 },
  'nug1.gif': { antiAlias: true, antiAliasSamples: 2, dithering: "ordered", gamma: 0.95 },
  'nug2.webp': { antiAlias: true, antiAliasSamples: 2, dithering: "ordered", gamma: 0.95 },
  'pepe.gif': { antiAlias: false, dithering: "none", gamma: 1.0 },
  // Configuración por defecto para el resto
  '_default': { antiAlias: false, dithering: "none", gamma: 1.0 }
}

function getRenderConfig(gifPath: string): GifRenderConfig {
  const fileName = gifPath.split('/').pop() ?? ''
  return GIF_RENDER_CONFIGS[fileName] ?? GIF_RENDER_CONFIGS['_default']
}

/**
 * Extrae colores predominantes de una imagen usando K-means simplificado
 */
async function extractColorsFromImage(imagePath: string, numColors = 8): Promise<string[]> {
  try {
    const result = await loadImage(imagePath)
    const data = result.data

    // Muestrear píxeles más densamente para mejor extracción
    const pixels: number[][] = []
    const step = 20 // Muestrear cada 20 píxeles

    for (let i = 0; i < data.length; i += 4 * step) {
      const r = data[i] ?? 0
      const g = data[i + 1] ?? 0
      const b = data[i + 2] ?? 0
      const a = data[i + 3] ?? 255

      // Ignorar píxeles muy transparentes
      if (a < 128) continue

      // Ignorar píxeles muy oscuros o muy claros
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b
      if (luminance < 10 || luminance > 245) continue

      pixels.push([r, g, b])
    }

    if (pixels.length === 0) {
      return ['#0a0a0a', '#111111', '#1a1a1a', '#222222', '#2a2a2a']
    }

    // K-means simplificado
    // Inicializar centroides aleatoriamente
    const centroids: number[][] = []
    for (let i = 0; i < numColors; i++) {
      const randomPixel = pixels[Math.floor(Math.random() * pixels.length)]
      centroids.push([...randomPixel])
    }

    // Iterar K-means (5 iteraciones)
    for (let iter = 0; iter < 5; iter++) {
      // Asignar cada píxel al centroide más cercano
      const clusters: number[][][] = Array.from({ length: numColors }, () => [])

      for (const pixel of pixels) {
        let minDist = Infinity
        let closestCluster = 0

        for (let c = 0; c < numColors; c++) {
          const dist = Math.sqrt(
            Math.pow(pixel[0] - centroids[c][0], 2) +
            Math.pow(pixel[1] - centroids[c][1], 2) +
            Math.pow(pixel[2] - centroids[c][2], 2)
          )
          if (dist < minDist) {
            minDist = dist
            closestCluster = c
          }
        }

        clusters[closestCluster].push(pixel)
      }

      // Recalcular centroides
      for (let c = 0; c < numColors; c++) {
        if (clusters[c].length === 0) continue

        const sum = clusters[c].reduce((acc, p) => [
          acc[0] + p[0],
          acc[1] + p[1],
          acc[2] + p[2]
        ], [0, 0, 0])

        centroids[c] = [
          Math.round(sum[0] / clusters[c].length),
          Math.round(sum[1] / clusters[c].length),
          Math.round(sum[2] / clusters[c].length)
        ]
      }
    }

    // Ordenar por luminosidad y convertir a hex
    const sortedColors = centroids
      .map(([r, g, b]) => {
        return {
          hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
          luminance: 0.299 * r + 0.587 * g + 0.114 * b
        }
      })
      .sort((a, b) => a.luminance - b.luminance)
      .map(c => c.hex)

    // Asegurar al menos 3 colores
    while (sortedColors.length < 3) {
      sortedColors.push(sortedColors[sortedColors.length - 1] || '#111111')
    }

    return sortedColors
  } catch {
    return ['#000000', '#111111', '#1a1a1a']
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 }
}

function interpolateColor(color1: string, color2: string, factor: number): string {
  const c1 = hexToRgb(color1)
  const c2 = hexToRgb(color2)

  const r = Math.round(c1.r + (c2.r - c1.r) * factor)
  const g = Math.round(c1.g + (c2.g - c1.g) * factor)
  const b = Math.round(c1.b + (c2.b - c1.b) * factor)

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

// Funciones de animación del ASCII
const GLITCH_CHARS = ['▓', '▒', '░', '█', '▄', '▀', '■', '□', '▪', '▫', '▬', '▭', '▮', '▯']
const MATRIX_CHARS = ['0', '1', 'ﾊ', 'ﾐ', 'ﾋ', 'ｰ', 'ｳ', 'ｼ', 'ﾅ', 'ﾓ', 'ｦ', 'ｻ', 'ﾜ', 'ﾊ', 'ｨ', 'ｽ']
const CYBER_CHARS = ['░', '▒', '▓', '█', '■']

// Tipo para líneas animadas con colores
interface AnimatedLine {
  text: string
  color: string
}

// Efecto GLITCH - reemplaza caracteres aleatoriamente
function applyGlitchEffect(lines: string[], _frame: number): AnimatedLine[] {
  return lines.map((line) => {
    const chars = line.split('')
    const shouldLineGlitch = Math.random() < 0.25

    if (!shouldLineGlitch) {
      return { text: line, color: THEME.magenta }
    }

    const glitchedChars = chars.map((char) => {
      if (char === ' ') return ' '

      const shouldReplace = Math.random() < 0.4
      if (shouldReplace) {
        return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
      }

      return char
    })

    const color = Math.random() > 0.7
      ? (Math.random() > 0.5 ? '#ff0044' : '#00ffff')
      : THEME.magenta

    return { text: glitchedChars.join(''), color }
  })
}

// Efecto MATRIX - lluvia de caracteres
function applyMatrixEffect(lines: string[], frame: number): AnimatedLine[] {
  const rainPhase = (frame % (lines.length * 2))

  return lines.map((line, i) => {
    const chars = line.split('')
    const inRain = i >= rainPhase - 8 && i <= rainPhase

    const transformedChars = chars.map((char) => {
      if (char === ' ') return ' '
      if (inRain && Math.random() < 0.6) {
        return MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]
      }
      return char
    })

    return {
      text: transformedChars.join(''),
      color: inRain ? '#00ff88' : THEME.magenta
    }
  })
}

// Efecto CYBER - parpadeo neón
function applyCyberEffect(lines: string[], frame: number): AnimatedLine[] {
  const colors = [THEME.magenta, '#00ffff', '#ff0044', THEME.yellow, '#00ff88']

  return lines.map((line, lineIndex) => {
    const chars = line.split('')

    const wavePos = (frame / 10 + lineIndex * 0.5) % (colors.length * 2)
    const colorIndex = Math.floor(wavePos) % colors.length
    const lineColor = colors[colorIndex]

    const transformedChars = chars.map((char) => {
      if (char === ' ') return ' '
      const shouldBlink = Math.random() < 0.1
      if (shouldBlink) {
        return CYBER_CHARS[Math.floor(Math.random() * CYBER_CHARS.length)]
      }
      return char
    })

    return {
      text: transformedChars.join(''),
      color: lineColor
    }
  })
}

// Efecto SCAN - línea de escaneo
function applyScanEffect(lines: string[], frame: number): AnimatedLine[] {
  const scanLine = frame % (lines.length + 4)

  return lines.map((line, i) => {
    const isScanning = Math.abs(i - scanLine) < 2
    return {
      text: line,
      color: isScanning ? '#00ffff' : THEME.magenta
    }
  })
}

// Efecto DECODE - caracteres aleatorios que se revelan
function applyDecodeEffect(lines: string[], frame: number): AnimatedLine[] {
  const decodePhase = (frame / 5) % lines.length
  const randomness = Math.max(0, 1 - (frame % 100) / 100)

  return lines.map((line, i) => {
    const chars = line.split('')
    const lineProgress = Math.min(1, Math.max(0, (decodePhase - i) / 5))

    const transformedChars = chars.map((char) => {
      if (char === ' ') return ' '
      if (Math.random() < randomness && lineProgress < 1) {
        return String.fromCharCode(33 + Math.floor(Math.random() * 94))
      }
      return char
    })

    return {
      text: transformedChars.join(''),
      color: lineProgress > 0.5 ? '#00ff88' : THEME.magenta
    }
  })
}

function renderAnimatedAscii(ascii: string, frame: number, effect: AsciiEffect, scale = false) {
  const lines = ascii.split('\n')

  // Primero aplicar efecto y obtener líneas animadas
  let animatedLines: AnimatedLine[]

  switch (effect) {
    case 'glitch':
      animatedLines = applyGlitchEffect(lines, frame)
      break
    case 'matrix':
      animatedLines = applyMatrixEffect(lines, frame)
      break
    case 'cyber':
      animatedLines = applyCyberEffect(lines, frame)
      break
    case 'scan':
      animatedLines = applyScanEffect(lines, frame)
      break
    case 'decode':
      animatedLines = applyDecodeEffect(lines, frame)
      break
    default:
      animatedLines = lines.map(line => ({ text: line, color: THEME.magenta }))
  }

  // Si se solicita escalado, escalar DESPUÉS de aplicar efectos
  if (scale) {
    animatedLines = animatedLines.map(line => ({
      text: line.text.split('').join(' '), // Escala horizontal añadiendo espacios
      color: line.color
    }))
  }

  // Convertir a JSX.Element
  return (
    <box style={{ flexDirection: 'column' }}>
      {animatedLines.map((line: AnimatedLine, i: number) => (
        <text key={i} style={{ fg: line.color as any }}>
          {line.text}
        </text>
      ))}
    </box>
  )
}

export const SplashScreen = ({ config, onComplete, showHeader = false, waxinText: propWaxinText, audioEnabled = true }: SplashScreenProps) => {
  const renderer = useRenderer()
  const [elapsed, setElapsed] = useState(0)
  const [currentGifIndex, setCurrentGifIndex] = useState(0)
  const [userInteracted, setUserInteracted] = useState(false)
  const [gradientColors, setGradientColors] = useState<string[]>(['#000000', '#111111'])
  const [asciiArt, setAsciiArt] = useState<string>('')
  const [localWaxinText, setLocalWaxinText] = useState<string>('')
  const [asciiFrame, setAsciiFrame] = useState(0)
  const [asciiEffect, setAsciiEffect] = useState<AsciiEffect>('glitch')
  const [currentSpinner, setCurrentSpinner] = useState<RandomSpinner>('weather')
  const colorCache = useRef<Map<string, string[]>>(new Map())

  // Usar prop waxinText si se proporciona, de lo contrario usar estado local
  const waxinText = propWaxinText || localWaxinText

  // Rotar spinners cada 2 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSpinner(prev => {
        const currentIndex = RANDOM_SPINNERS.indexOf(prev)
        const nextIndex = (currentIndex + 1) % RANDOM_SPINNERS.length
        return RANDOM_SPINNERS[nextIndex]
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  // Cargar ASCII art al montar
  useEffect(() => {
    try {
      const devilPath = resolve(process.cwd(), 'assets/devil2.ascii.x2.txt')
      const devilContent = readFileSync(devilPath, 'utf-8')
      setAsciiArt(devilContent.trim())
    } catch {
      setAsciiArt('🤖 WAXIN MK1')
    }

    try {
      const waxinPath = resolve(process.cwd(), 'assets/waxin.ascii.txt')
      const waxinContent = readFileSync(waxinPath, 'utf-8')
      setLocalWaxinText(waxinContent.trim())
    } catch {
      setLocalWaxinText('WAXIN MK1 😈')
    }
  }, [])

  // Animación del ASCII - rotar efectos cada 3 segundos (60 frames)
  useEffect(() => {
    const interval = setInterval(() => {
      setAsciiFrame(prev => prev + 1)

      // Rotar efectos cada 60 frames (~3 segundos a 50ms)
      if (asciiFrame % 60 === 0 && asciiFrame > 0) {
        const effects: AsciiEffect[] = ['glitch', 'matrix', 'cyber', 'scan', 'decode']
        const nextEffect = effects[Math.floor((asciiFrame / 60) % effects.length)]
        setAsciiEffect(nextEffect)
      }
    }, 50)

    return () => clearInterval(interval)
  }, [asciiFrame])

  const [shuffledGifs] = useState(() => {
    // Mezclar GIFs aleatoriamente al inicio (Fisher-Yates shuffle)
    const gifs = [...config.getGifs(), '__ASCII__'] // Agregar ASCII como elemento especial
    for (let i = gifs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[gifs[i], gifs[j]] = [gifs[j], gifs[i]]
    }
    return gifs
  })

  // Calcular tamaño basado en porcentaje del terminal
  const termWidth = renderer?.terminalWidth ?? 120
  const termHeight = renderer?.terminalHeight ?? 40

  // Dejar espacio para la progressbar y controles
  const availableHeight = termHeight - 6

  // GIF más grande (55% del ancho)
  const gifWidth = Math.floor(termWidth * 55 / 100)
  const gifHeight = Math.floor(availableHeight * 70 / 100)

  // Extraer colores cuando cambia el GIF
  useEffect(() => {
    const currentGif = shuffledGifs[currentGifIndex]
    if (!currentGif) return

    // Si es ASCII, usar colores por defecto
    if (currentGif === '__ASCII__') {
      setGradientColors(['#0a0a0a', '#1a0a1a', '#0a0a1a'])
      return
    }

    const imagePath = resolve(process.cwd(), currentGif)

    // Usar cache si existe
    if (colorCache.current.has(currentGif)) {
      setGradientColors(colorCache.current.get(currentGif)!)
      return
    }

    // Extraer colores en background
    extractColorsFromImage(imagePath, 5).then(colors => {
      // Ordenar por luminosidad (oscuro a claro)
      const sortedByLuminance = colors.sort((a, b) => {
        const lumA = (hexToRgb(a).r * 0.299 + hexToRgb(a).g * 0.587 + hexToRgb(a).b * 0.114)
        const lumB = (hexToRgb(b).r * 0.299 + hexToRgb(b).g * 0.587 + hexToRgb(b).b * 0.114)
        return lumA - lumB
      })

      // Usar los 3 colores más oscuros para el gradiente
      const gradientColors = sortedByLuminance.slice(0, 3)
      colorCache.current.set(currentGif, gradientColors)
      setGradientColors(gradientColors)
    })
  }, [currentGifIndex, shuffledGifs])

  // Navegación con flechas
  const handleNext = useCallback(() => {
    setCurrentGifIndex((prev) => (prev + 1) % shuffledGifs.length)
    setUserInteracted(true)
  }, [shuffledGifs.length])

  const handlePrev = useCallback(() => {
    setCurrentGifIndex((prev) => (prev - 1 + shuffledGifs.length) % shuffledGifs.length)
    setUserInteracted(true)
  }, [shuffledGifs.length])

  // Si el usuario interactuó, ENTER para continuar
  const handleEnter = useCallback(() => {
    if (userInteracted) {
      onComplete()
    }
  }, [userInteracted, onComplete])

  useKeyboard((key) => {
    if (key.name === 'left') handlePrev()
    if (key.name === 'right') handleNext()
    if (key.name === 'return' && userInteracted) handleEnter()
    if (key.name === 'escape') onComplete()
  })

  // Rotación automática cada segundo si NO hay interacción
  useEffect(() => {
    if (userInteracted) return

    const rotationInterval = setInterval(() => {
      setCurrentGifIndex((prev) => (prev + 1) % shuffledGifs.length)
    }, 1000)

    return () => clearInterval(rotationInterval)
  }, [userInteracted, shuffledGifs.length])

  // Timer para completion (solo si NO hay interacción)
  useEffect(() => {
    if (userInteracted) return

    const interval = setInterval(() => {
      setElapsed((prev) => {
        if (prev >= config.durationMs) {
          clearInterval(interval)
          onComplete()
          return prev
        }
        return prev + 100
      })
    }, 100)

    return () => clearInterval(interval)
  }, [config.durationMs, onComplete, userInteracted])

  const progress = Math.min((elapsed / config.durationMs) * 100, 100)
  const remaining = Math.max(0, Math.ceil((config.durationMs - elapsed) / 1000))

  const currentGif = shuffledGifs[currentGifIndex]
  const isAsciiMode = currentGif === '__ASCII__'
  const imagePath = !isAsciiMode && currentGif ? resolve(process.cwd(), currentGif) : undefined
  const renderConfig = !isAsciiMode && currentGif ? getRenderConfig(currentGif) : GIF_RENDER_CONFIGS['_default']

  // Crear filas de gradiente que cubran toda la altura
  const createGradientRows = () => {
    const rows = []
    const colors = gradientColors
    const numColors = colors.length

    // Crear gradiente suave interpolando entre colores
    for (let y = 0; y < termHeight; y++) {
      const position = y / (termHeight - 1)

      // Calcular índice de color
      const scaledPos = position * (numColors - 1)
      const colorIndex = Math.floor(scaledPos)
      const nextColorIndex = Math.min(colorIndex + 1, numColors - 1)
      const blendFactor = scaledPos - colorIndex

      // Interpolar entre colores adyacentes
      let color: string
      if (colorIndex === nextColorIndex || numColors === 1) {
        color = colors[Math.min(colorIndex, numColors - 1)]
      } else {
        color = interpolateColor(
          colors[Math.min(colorIndex, numColors - 1)],
          colors[Math.min(nextColorIndex, numColors - 1)],
          blendFactor
        )
      }

      rows.push(
        <box key={y} style={{ flexDirection: 'row', width: '100%', height: 1 }}>
          <text style={{ bg: color as any, fg: color as any }}>{' '.repeat(termWidth)}</text>
        </box>
      )
    }
    return rows
  }

  const gradientRows = createGradientRows()

  return (
    <box
      style={{
        flexGrow: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000000',
        width: '100%',
        height: '100%',
      }}
    >
      {/* Gradiente de fondo */}
      <box
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          flexDirection: 'column',
        }}
      >
        {gradientRows}
      </box>

      <box
        style={{
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
          width: '100%',
          height: '100%',
        }}
      >
        {/* Fila superior: ASCII solo o GIF */}
        <box
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            flexGrow: 1,
          }}
        >
          {isAsciiMode ? (
            // ASCII animado fullscreen con demonio (escalado 2x)
            <box
              style={{
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
              }}
            >
              {renderAnimatedAscii(asciiArt, asciiFrame, asciiEffect, false)}
            </box>
          ) : (
            // Solo GIF centrado
            imagePath && (
              <terminal-gif
                key={`${currentGifIndex}-${currentGif}`}
                src={imagePath}
                width={gifWidth}
                height={gifHeight}
                animated={true}
                autoPlay={true}
                loop={true}
                objectFit="contain"
                antiAlias={renderConfig.antiAlias}
                antiAliasSamples={renderConfig.antiAliasSamples}
                dithering={renderConfig.dithering}
                gamma={renderConfig.gamma}
              />
            )
          )}
        </box>

        {/* Panel inferior: WAXIN ASCII + Progress + Spinners con fondo sólido */}
        <box
          style={{
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 1,
          }}
        >
          {/* Header animado (si showHeader=true) O texto estático en borde */}
          {showHeader ? (
            <Header waxinText={waxinText || 'WAXIN MK1 😈'} />
          ) : (
            <>
              {/* Borde superior del panel */}
              <text style={{ fg: THEME.purple, bg: '#1a0a1a' }}>
                {'╭' + '─'.repeat(50) + '╮'}
              </text>

              {/* Texto WAXIN con fondo */}
              {waxinText && waxinText.split('\n').map((line, i) => (
                <text key={`waxin-${i}`} style={{ fg: THEME.magenta, bg: '#1a0a1a' }}>
                  {'│ '}{line.padEnd(48)}{' │'}
                </text>
              ))}

              {/* Separador */}
              <text style={{ fg: THEME.purple, bg: '#1a0a1a' }}>
                {'├' + '─'.repeat(50) + '┤'}
              </text>
            </>
          )}

          {/* Spinner + barra de progreso si NO hay interacción */}
          {!userInteracted && (
            <box style={{ flexDirection: 'row', alignItems: 'center' }}>
              <text style={{ fg: THEME.purple, bg: '#1a0a1a' }}>{'│ '}</text>
              <spinner
                name={currentSpinner}
                color={createPulse([THEME.purple, THEME.magenta, THEME.blue, THEME.yellow], 0.8)}
                backgroundColor="#1a0a1a"
              />
              <text style={{ fg: THEME.textMuted, bg: '#1a0a1a' }}> </text>
              <text style={{ fg: THEME.purple, bg: '#1a0a1a' }}>
                {'█'.repeat(Math.floor(progress / 4))}
              </text>
              <text style={{ fg: THEME.textMuted, bg: '#1a0a1a' }}>
                {'░'.repeat(25 - Math.floor(progress / 4))}
              </text>
              <text style={{ fg: THEME.textMuted, bg: '#1a0a1a' }}> </text>
              <spinner
                name={currentSpinner}
                color={createPulse([THEME.yellow, THEME.blue, THEME.magenta, THEME.purple], 0.8)}
                backgroundColor="#1a0a1a"
              />
              <text style={{ fg: THEME.purple, bg: '#1a0a1a' }}>{' │'}</text>
            </box>
          )}

          {/* Borde inferior del panel - solo si NO es showHeader */}
          {!showHeader && (
            <text style={{ fg: THEME.purple, bg: '#1a0a1a' }}>
              {'╰' + '─'.repeat(50) + '╯'}
            </text>
          )}
        </box>

        {/* Footer: Controles con fondo sólido */}
        <box
          style={{
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 1,
          }}
        >
          {/* Línea de fondo para el footer */}
          <box style={{ flexDirection: 'row' }}>
            <text style={{ fg: THEME.textMuted, bg: '#0a0a12' }}>{'  GIF '}</text>
            <text style={{ fg: THEME.blue, bg: '#0a0a12' }}>
              {currentGifIndex + 1}/{shuffledGifs.length}
            </text>
            {!userInteracted && remaining > 0 && (
              <>
                <text style={{ fg: THEME.textMuted, bg: '#0a0a12' }}>{' · '}</text>
                <text style={{ fg: THEME.yellow, bg: '#0a0a12' }}>{remaining}s</text>
              </>
            )}
            <text style={{ fg: THEME.textMuted, bg: '#0a0a12' }}>{' · '}</text>
            <text style={{ fg: audioEnabled ? THEME.green : THEME.red, bg: '#0a0a12' }}>
              {audioEnabled ? '🔊 ON' : '🔇 OFF'}
            </text>
            <text style={{ fg: THEME.textMuted, bg: '#0a0a12' }}>{'  '}</text>
          </box>

          {/* Instrucciones dinámicas con fondo */}
          <box style={{ flexDirection: 'row', marginTop: 1 }}>
            {!userInteracted ? (
              <>
                <text style={{ fg: THEME.purple, bg: '#0a0a12' }}>{'  ◄ ► '}</text>
                <text style={{ fg: THEME.textDim, bg: '#0a0a12' }}>navegar</text>
                <text style={{ fg: THEME.textMuted, bg: '#0a0a12' }}>{' │ '}</text>
                <text style={{ fg: THEME.purple, bg: '#0a0a12' }}>ESC</text>
                <text style={{ fg: THEME.textDim, bg: '#0a0a12' }}>{' saltar' }</text>
                <text style={{ fg: THEME.textMuted, bg: '#0a0a12' }}>{' │ '}</text>
                <text style={{ fg: THEME.purple, bg: '#0a0a12' }}>SHIFT+M</text>
                <text style={{ fg: THEME.textDim, bg: '#0a0a12' }}>{' audio  '}</text>
              </>
            ) : (
              <>
                <text style={{ fg: THEME.yellow, bg: '#0a0a12' }}>{'  ◄ ► '}</text>
                <text style={{ fg: THEME.textDim, bg: '#0a0a12' }}>navegar</text>
                <text style={{ fg: THEME.textMuted, bg: '#0a0a12' }}>{' │ '}</text>
                <text style={{ fg: THEME.yellow, bg: '#0a0a12' }}>ENTER</text>
                <text style={{ fg: THEME.textDim, bg: '#0a0a12' }}>{' continuar' }</text>
                <text style={{ fg: THEME.textMuted, bg: '#0a0a12' }}>{' │ '}</text>
                <text style={{ fg: THEME.yellow, bg: '#0a0a12' }}>SHIFT+M</text>
                <text style={{ fg: THEME.textDim, bg: '#0a0a12' }}>{' audio  '}</text>
              </>
            )}
          </box>
        </box>
      </box>
    </box>
  )
}
