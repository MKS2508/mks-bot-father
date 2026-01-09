#!/usr/bin/env bun
/**
 * Optimize animated GIFs and WebPs for faster loading
 */

import { readdirSync, statSync } from 'fs'
import { join } from 'path'

const ASSETS_DIR = './assets'

async function run(cmd: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(['sh', '-c', cmd], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited

  return { stdout, stderr, exitCode }
}

async function checkCommand(cmd: string): Promise<boolean> {
  const { exitCode } = await run(`which ${cmd}`)
  return exitCode === 0
}

async function optimizeGif(inputPath: string, outputPath: string): Promise<void> {
  const hasGifsicle = await checkCommand('gifsicle')

  if (hasGifsicle) {
    console.log(`   [gifsicle] Optimizing...`)
    await run(`gifsicle --optimize=3 --lossy=80 --colors=64 "${inputPath}" -o "${outputPath}"`)
  } else {
    // Fallback con ImageMagick
    console.log(`   [convert] Optimizing...`)
    await run(`convert "${inputPath}" -coalesce -fuzz 8% -layers OptimizeFrame -layers OptimizeTransparency "${outputPath}"`)
  }
}

async function optimizeWebP(inputPath: string, outputPath: string): Promise<void> {
  const hasFfmpeg = await checkCommand('ffmpeg')

  if (hasFfmpeg) {
    console.log(`   [ffmpeg] Optimizing...`)
    await run(`ffmpeg -y -i "${inputPath}" -vcodec libwebp -quality 60 -vsync 0 "${outputPath}" 2>/dev/null`)
  } else {
    // Fallback con ImageMagick
    console.log(`   [convert] Optimizing...`)
    await run(`convert "${inputPath}" -quality 60 "${outputPath}"`)
  }
}

async function main() {
  console.log('🖼️  Optimizing animated images...\n')

  // Leer directorio
  const files = readdirSync(ASSETS_DIR)
  const images = files.filter(f => f.endsWith('.gif') || f.endsWith('.webp'))

  if (images.length === 0) {
    console.log('❌ No GIF or WebP files found')
    return
  }

  console.log(`📁 Found ${images.length} files\n`)

  // Verificar herramientas
  const hasGifsicle = await checkCommand('gifsicle')
  const hasFfmpeg = await checkCommand('ffmpeg')
  const hasConvert = await checkCommand('convert')

  console.log('🔧 Tools:')
  console.log(`   ${hasGifsicle ? '✅' : '❌'} gifsicle`)
  console.log(`   ${hasFfmpeg ? '✅' : '❌'} ffmpeg`)
  console.log(`   ${hasConvert ? '✅' : '❌'} ImageMagick`)
  console.log()

  let totalSaved = 0

  for (const fileName of images) {
    const filePath = join(ASSETS_DIR, fileName)
    const originalSize = statSync(filePath).size
    const sizeInMB = (originalSize / 1024 / 1024).toFixed(2)

    console.log(`📄 ${fileName} (${sizeInMB}MB)`)

    // Backup
    const backupPath = `${filePath}.backup`
    await run(`cp "${filePath}" "${backupPath}"`)

    // Optimizar
    const tempPath = `${filePath}.tmp`
    try {
      if (fileName.endsWith('.gif')) {
        await optimizeGif(filePath, tempPath)
      } else if (fileName.endsWith('.webp')) {
        await optimizeWebP(filePath, tempPath)
      }

      // Verificar tamaño
      const newSize = statSync(tempPath).size
      const sizeSaved = originalSize - newSize

      if (sizeSaved > 0) {
        await run(`mv "${tempPath}" "${filePath}"`)
        await run(`rm "${backupPath}"`)

        const savedMB = (sizeSaved / 1024 / 1024).toFixed(2)
        const newMB = (newSize / 1024 / 1024).toFixed(2)
        const percentSaved = ((sizeSaved / originalSize) * 100).toFixed(0)

        console.log(`   ✅ ${sizeInMB}MB → ${newMB}MB (saved ${savedMB}MB, ${percentSaved}%)\n`)
        totalSaved += sizeSaved
      } else {
        await run(`rm "${tempPath}"`)
        await run(`rm "${backupPath}"`)
        console.log(`   ⏭️  Already optimized\n`)
      }
    } catch (error) {
      console.error(`   ❌ Error:`, error)
      await run(`mv "${backupPath}" "${filePath}"`).catch(() => {})
      await run(`rm "${tempPath}"`).catch(() => {})
    }
  }

  const savedMB = (totalSaved / 1024 / 1024).toFixed(2)
  console.log(`\n🎉 Total saved: ${savedMB}MB`)

  if (!hasGifsicle) {
    console.log('\n💡 brew install gifsicle')
  }
  if (!hasFfmpeg) {
    console.log('💡 brew install ffmpeg')
  }
}

main().catch(console.error)
