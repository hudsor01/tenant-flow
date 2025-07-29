#!/usr/bin/env node

/**
 * Bundle Analysis Script
 * 
 * This script provides detailed analysis of the Vite build output,
 * helping identify optimization opportunities and bundle size issues.
 */

import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')
const distPath = join(projectRoot, 'dist')

// ANSI colors for better console output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function colorize(text, color) {
  return `${colors[color] || ''}${text}${colors.reset}`
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

async function analyzeBundle() {
  console.log(colorize('🔍 TenantFlow Bundle Analysis', 'bold'))
  console.log(colorize('================================', 'blue'))
  console.log()

  try {
    // Check if dist directory exists
    try {
      await fs.access(distPath)
    } catch {
      console.log(colorize('⚠️  No build found. Running build first...', 'yellow'))
      execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' })
    }

    // Analyze chunks
    const staticJsPath = join(distPath, 'static', 'js')
    let jsFiles = []
    
    try {
      jsFiles = await fs.readdir(staticJsPath)
    } catch {
      // Fallback to root dist
      const allFiles = await fs.readdir(distPath)
      jsFiles = allFiles.filter(file => file.endsWith('.js'))
    }

    const chunks = []
    let totalSize = 0

    for (const file of jsFiles) {
      const filePath = join(staticJsPath, file)
      let stats
      
      try {
        stats = await fs.stat(filePath)
      } catch {
        // Try root dist
        const fallbackPath = join(distPath, file)
        stats = await fs.stat(fallbackPath)
      }
      
      chunks.push({
        name: file,
        size: stats.size,
        type: getChunkType(file)
      })
      totalSize += stats.size
    }

    // Sort by size
    chunks.sort((a, b) => b.size - a.size)

    console.log(colorize('📦 JavaScript Chunks Analysis', 'bold'))
    console.log(colorize('─'.repeat(80), 'blue'))
    
    const typeStats = {}
    chunks.forEach(chunk => {
      const sizeFormatted = formatBytes(chunk.size).padEnd(10)
      const percentage = ((chunk.size / totalSize) * 100).toFixed(1).padStart(5)
      const typeColor = getTypeColor(chunk.type)
      
      console.log(
        `${colorize(chunk.type.padEnd(15), typeColor)} ` +
        `${colorize(sizeFormatted, 'cyan')} ` +
        `${colorize(percentage + '%', 'yellow')} ` +
        `${chunk.name}`
      )

      typeStats[chunk.type] = (typeStats[chunk.type] || 0) + chunk.size
    })

    console.log()
    console.log(colorize('📊 Summary by Type', 'bold'))
    console.log(colorize('─'.repeat(40), 'blue'))
    
    Object.entries(typeStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, size]) => {
        const percentage = ((size / totalSize) * 100).toFixed(1)
        const typeColor = getTypeColor(type)
        console.log(
          `${colorize(type.padEnd(15), typeColor)} ` +
          `${colorize(formatBytes(size).padEnd(10), 'cyan')} ` +
          `${colorize(percentage + '%', 'yellow')}`
        )
      })

    console.log()
    console.log(colorize('🎯 Optimization Recommendations', 'bold'))
    console.log(colorize('─'.repeat(50), 'blue'))

    // Check for large chunks
    const largeChunks = chunks.filter(chunk => chunk.size > 500 * 1024) // > 500KB
    if (largeChunks.length > 0) {
      console.log(colorize('⚠️  Large chunks detected:', 'yellow'))
      largeChunks.forEach(chunk => {
        console.log(`   • ${chunk.name} (${formatBytes(chunk.size)})`)
      })
      console.log('   Consider code splitting these chunks further.')
      console.log()
    }

    // Check vendor chunks
    const vendorSize = typeStats['vendor'] || 0
    const vendorPercentage = (vendorSize / totalSize) * 100
    
    if (vendorPercentage > 60) {
      console.log(colorize('⚠️  Vendor chunks are too large:', 'yellow'))
      console.log(`   ${formatBytes(vendorSize)} (${vendorPercentage.toFixed(1)}%)`)
      console.log('   Consider splitting vendor chunks into smaller pieces.')
      console.log()
    }

    // Check for opportunities
    console.log(colorize('💡 Opportunities:', 'green'))
    console.log('   • Use dynamic imports for rarely used features')
    console.log('   • Consider tree-shaking unused code')
    console.log('   • Enable compression (gzip/brotli) on your server')
    console.log('   • Use lazy loading for routes and components')
    
    if (chunks.find(c => c.name.includes('lucide'))) {
      console.log('   • Consider using specific Lucide icon imports')
    }
    
    if (chunks.find(c => c.name.includes('date-fns'))) {
      console.log('   • Verify date-fns is using tree-shaking')
    }

    console.log()
    console.log(colorize(`📈 Total Bundle Size: ${formatBytes(totalSize)}`, 'bold'))
    
    // Performance recommendations
    if (totalSize > 2 * 1024 * 1024) { // > 2MB
      console.log(colorize('🚨 Bundle size is quite large for a web application', 'red'))
    } else if (totalSize > 1 * 1024 * 1024) { // > 1MB
      console.log(colorize('⚠️  Bundle size is above recommended threshold', 'yellow'))
    } else {
      console.log(colorize('✅ Bundle size is within recommended limits', 'green'))
    }

  } catch (error) {
    console.error(colorize('❌ Analysis failed:', 'red'), error.message)
    process.exit(1)
  }
}

function getChunkType(filename) {
  if (filename.includes('react-vendor')) return 'react'
  if (filename.includes('router')) return 'router'
  if (filename.includes('ui-vendor')) return 'ui'
  if (filename.includes('form-vendor')) return 'forms'
  if (filename.includes('data-vendor')) return 'data'
  if (filename.includes('utility-vendor')) return 'utilities'
  if (filename.includes('stripe-vendor')) return 'stripe'
  if (filename.includes('vendor')) return 'vendor'
  if (filename.includes('index')) return 'main'
  return 'app'
}

function getTypeColor(type) {
  const colors = {
    react: 'blue',
    router: 'magenta',
    ui: 'cyan',
    forms: 'yellow',
    data: 'green',
    utilities: 'yellow',
    stripe: 'magenta',
    vendor: 'red',
    main: 'bold',
    app: 'green'
  }
  return colors[type] || 'reset'
}

// Run analysis
analyzeBundle().catch(console.error)