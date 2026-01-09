#!/usr/bin/env bun
/**
 * Scale ASCII art files by 2x factor - simple approach
 * Creates .ascii.x2.txt files with doubled dimensions
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const ASSETS_DIR = './assets'

function scaleAsciiArt(content: string, factor = 2): string {
  const lines = content.split('\n')
  const scaledLines: string[] = []

  for (const line of lines) {
    // Duplicar cada carácter horizontalmente
    const expandedLine = line.split('').map(char => char.repeat(factor)).join('')

    // Duplicar la línea verticalmente
    for (let i = 0; i < factor; i++) {
      scaledLines.push(expandedLine)
    }
  }

  return scaledLines.join('\n')
}

function processFile(fileName: string) {
  const inputPath = join(ASSETS_DIR, fileName)
  const outputPath = join(ASSETS_DIR, fileName.replace('.txt', '.x2.txt'))

  try {
    const content = readFileSync(inputPath, 'utf-8')
    const scaled = scaleAsciiArt(content, 2)

    writeFileSync(outputPath, scaled, 'utf-8')
    console.log(`✅ ${fileName} → ${fileName.replace('.txt', '.x2.txt')}`)

    // Mostrar stats
    const originalLines = content.split('\n').length
    const scaledLines = scaled.split('\n').length
    console.log(`   ${originalLines} líneas → ${scaledLines} líneas (escala 2x)`)
  } catch (error) {
    console.error(`❌ Error procesando ${fileName}:`, error)
  }
}

function main() {
  console.log('🔍 Escalando archivos ASCII...\n')

  const files = ['devil2.ascii.txt', 'waxin.ascii.txt']

  for (const file of files) {
    processFile(file)
  }

  console.log('\n✨ Archivos .x2.txt generados en ./assets/')
}

main()
