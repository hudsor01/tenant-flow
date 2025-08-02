#!/usr/bin/env node

/**
 * Bundle Performance Analyzer
 * Analyzes Vite build output for performance optimizations
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distPath = path.join(__dirname, '../dist')

// Performance thresholds (in KB)
const THRESHOLDS = {
  CRITICAL_JS: 200,    // Critical path JS chunks
  VENDOR_JS: 300,      // Vendor chunks
  ROUTE_JS: 150,       // Route-specific chunks
  CSS: 50,             // CSS files
  INITIAL_LOAD: 500    // Total initial load size
}

class BundleAnalyzer {
  constructor() {
    this.stats = {
      totalSize: 0,
      chunkSizes: new Map(),
      assetSizes: new Map(),
      initialLoad: 0,
      warnings: [],
      recommendations: []
    }
  }

  /**
   * Analyze the dist directory
   */
  async analyze() {
    if (!fs.existsSync(distPath)) {
      console.error('❌ Build output not found. Run "npm run build" first.')
      process.exit(1)
    }

    this.scanDirectory(distPath)
    this.calculateInitialLoad()
    this.generateRecommendations()
    this.printReport()
  }

  /**
   * Recursively scan directory for assets
   */
  scanDirectory(dir, relativePath = '') {
    const files = fs.readdirSync(dir)

    for (const file of files) {
      const fullPath = path.join(dir, file)
      const relativeFile = path.join(relativePath, file)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        this.scanDirectory(fullPath, relativeFile)
      } else {
        this.analyzeFile(fullPath, relativeFile, stat.size)
      }
    }
  }

  /**
   * Analyze individual file
   */
  analyzeFile(fullPath, relativePath, size) {
    const sizeKB = Math.round(size / 1024)
    this.stats.totalSize += sizeKB

    const ext = path.extname(relativePath)
    const basename = path.basename(relativePath, ext)

    if (ext === '.js') {
      this.analyzeJSChunk(relativePath, basename, sizeKB)
    } else if (ext === '.css') {
      this.analyzeCSSAsset(relativePath, basename, sizeKB)
    } else {
      this.stats.assetSizes.set(relativePath, sizeKB)
    }
  }

  /**
   * Analyze JavaScript chunks
   */
  analyzeJSChunk(filePath, basename, sizeKB) {
    this.stats.chunkSizes.set(filePath, sizeKB)

    // Determine chunk type and check thresholds
    if (basename.includes('react-vendor')) {
      this.checkThreshold('React Vendor', sizeKB, THRESHOLDS.VENDOR_JS, filePath)
      this.stats.initialLoad += sizeKB // React is critical path
    } else if (basename.includes('router-vendor')) {
      this.checkThreshold('Router Vendor', sizeKB, THRESHOLDS.VENDOR_JS, filePath)
      this.stats.initialLoad += sizeKB // Router is critical path
    } else if (basename.includes('ui-vendor')) {
      this.checkThreshold('UI Vendor', sizeKB, THRESHOLDS.VENDOR_JS, filePath)
      this.stats.initialLoad += sizeKB // UI components are critical
    } else if (basename.includes('vendor')) {
      this.checkThreshold('Vendor Chunk', sizeKB, THRESHOLDS.VENDOR_JS, filePath)
    } else if (basename.includes('routes')) {
      this.checkThreshold('Route Chunk', sizeKB, THRESHOLDS.ROUTE_JS, filePath)
    } else if (basename.includes('index') || basename.includes('main')) {
      this.checkThreshold('Main Chunk', sizeKB, THRESHOLDS.CRITICAL_JS, filePath)
      this.stats.initialLoad += sizeKB // Main chunk is critical path
    }
  }

  /**
   * Analyze CSS assets
   */
  analyzeCSSAsset(filePath, basename, sizeKB) {
    this.stats.assetSizes.set(filePath, sizeKB)
    this.checkThreshold('CSS', sizeKB, THRESHOLDS.CSS, filePath)
    
    if (basename.includes('index') || basename.includes('main')) {
      this.stats.initialLoad += sizeKB // Critical CSS
    }
  }

  /**
   * Check if size exceeds threshold
   */
  checkThreshold(type, size, threshold, filePath) {
    if (size > threshold) {
      this.stats.warnings.push({
        type,
        file: filePath,
        size,
        threshold,
        severity: size > threshold * 1.5 ? 'high' : 'medium'
      })
    }
  }

  /**
   * Calculate initial load size
   */
  calculateInitialLoad() {
    // Check total initial load threshold
    if (this.stats.initialLoad > THRESHOLDS.INITIAL_LOAD) {
      this.stats.warnings.push({
        type: 'Initial Load',
        file: 'Total critical path resources',
        size: this.stats.initialLoad,
        threshold: THRESHOLDS.INITIAL_LOAD,
        severity: 'high'
      })
    }
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations() {
    const vendorChunks = Array.from(this.stats.chunkSizes.entries())
      .filter(([path]) => path.includes('vendor'))
      .sort(([, a], [, b]) => b - a)

    if (vendorChunks.length > 0 && vendorChunks[0][1] > 400) {
      this.stats.recommendations.push(
        '📦 Consider splitting large vendor chunks further or using dynamic imports'
      )
    }

    const routeChunks = Array.from(this.stats.chunkSizes.entries())
      .filter(([path]) => path.includes('routes'))
    
    if (routeChunks.some(([, size]) => size > 200)) {
      this.stats.recommendations.push(
        '🚀 Large route chunks detected - consider lazy loading components within routes'
      )
    }

    if (this.stats.initialLoad > 400) {
      this.stats.recommendations.push(
        '⚡ Initial load size is large - consider deferring non-critical resources'
      )
    }

    const cssFiles = Array.from(this.stats.assetSizes.entries())
      .filter(([path]) => path.endsWith('.css'))
    
    if (cssFiles.some(([, size]) => size > 100)) {
      this.stats.recommendations.push(
        '🎨 Large CSS files detected - consider CSS code splitting or tree shaking'
      )
    }
  }

  /**
   * Print analysis report
   */
  printReport() {
    console.log('\n🔍 Bundle Performance Analysis\n')
    console.log('═'.repeat(50))

    // Summary
    console.log(`📊 Total Bundle Size: ${this.stats.totalSize} KB`)
    console.log(`⚡ Initial Load Size: ${this.stats.initialLoad} KB`)
    console.log(`📦 Number of JS Chunks: ${this.stats.chunkSizes.size}`)
    console.log(`🎨 Number of CSS Files: ${Array.from(this.stats.assetSizes.keys()).filter(k => k.endsWith('.css')).length}`)

    // Largest chunks
    console.log('\n🏆 Largest JavaScript Chunks:')
    const topChunks = Array.from(this.stats.chunkSizes.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    topChunks.forEach(([file, size], index) => {
      const indicator = size > 300 ? '🔴' : size > 200 ? '🟡' : '🟢'
      console.log(`${indicator} ${index + 1}. ${path.basename(file)}: ${size} KB`)
    })

    // Warnings
    if (this.stats.warnings.length > 0) {
      console.log('\n⚠️  Performance Warnings:')
      this.stats.warnings.forEach(warning => {
        const severity = warning.severity === 'high' ? '🔴' : '🟡'
        console.log(`${severity} ${warning.type}: ${path.basename(warning.file)} (${warning.size} KB > ${warning.threshold} KB)`)
      })
    } else {
      console.log('\n✅ No performance warnings detected!')
    }

    // Recommendations
    if (this.stats.recommendations.length > 0) {
      console.log('\n💡 Optimization Recommendations:')
      this.stats.recommendations.forEach(rec => console.log(`   ${rec}`))
    }

    // Performance grade
    const grade = this.calculateGrade()
    console.log(`\n🎯 Performance Grade: ${grade.letter} (${grade.score}/100)`)
    console.log('═'.repeat(50))

    // Exit with error code if performance is poor
    if (grade.score < 70) {
      console.log('\n❌ Bundle performance needs improvement')
      process.exit(1)
    } else {
      console.log('\n✅ Bundle performance looks good!')
    }
  }

  /**
   * Calculate performance grade
   */
  calculateGrade() {
    let score = 100

    // Deduct points for size issues
    score -= this.stats.warnings.filter(w => w.severity === 'high').length * 15
    score -= this.stats.warnings.filter(w => w.severity === 'medium').length * 10

    // Deduct for overall size
    if (this.stats.totalSize > 2000) score -= 20
    else if (this.stats.totalSize > 1500) score -= 10

    if (this.stats.initialLoad > 600) score -= 25
    else if (this.stats.initialLoad > 400) score -= 15

    // Grade letter
    let letter = 'F'
    if (score >= 90) letter = 'A'
    else if (score >= 80) letter = 'B'
    else if (score >= 70) letter = 'C'
    else if (score >= 60) letter = 'D'

    return { score: Math.max(0, score), letter }
  }
}

// Run analysis
const analyzer = new BundleAnalyzer()
analyzer.analyze().catch(console.error)