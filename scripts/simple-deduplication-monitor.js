#!/usr/bin/env node

/**
 * Simple Backend Deduplication Metrics Monitor
 * Tracks real-time progress of code deduplication efforts
 */

const { execSync } = require('child_process')
const { writeFileSync, readFileSync, existsSync } = require('fs')
const { join } = require('path')

class SimpleDeduplicationMonitor {
  constructor() {
    this.baseline = {
      totalLines: 34902,
      serviceLines: 11842,
      serviceFiles: 39,
      duplicateLines: 1908,
      targetReduction: 1130,
      migratedServices: 1
    }
  }

  getCurrentMetrics() {
    const timestamp = new Date().toISOString()
    
    // Count current service lines
    const serviceLines = this.countServiceLines()
    const serviceFiles = this.countServiceFiles()
    const totalLines = this.countTotalLines()
    
    // Count duplication patterns
    const crudMethods = this.countCrudDuplication()
    const errorBlocks = this.countErrorBlocks()
    const migratedServices = this.countMigratedServices()
    
    // Calculate progress
    const lineReduction = this.baseline.serviceLines - serviceLines
    const progressPercent = ((lineReduction / this.baseline.targetReduction) * 100).toFixed(1)
    const migrationPercent = ((migratedServices / 6) * 100).toFixed(1)
    
    return {
      timestamp,
      current: {
        totalLines,
        serviceLines,
        serviceFiles,
        lineReduction,
        crudMethods,
        errorBlocks,
        migratedServices
      },
      progress: {
        overall: progressPercent,
        migration: migrationPercent
      }
    }
  }

  countServiceLines() {
    try {
      const result = execSync('find apps/backend/src -name "*.service.ts" -exec cat {} \\; | wc -l', {
        cwd: process.cwd(),
        encoding: 'utf8'
      })
      return parseInt(result.trim())
    } catch {
      return this.baseline.serviceLines
    }
  }

  countServiceFiles() {
    try {
      const result = execSync('find apps/backend/src -name "*.service.ts" | wc -l', {
        cwd: process.cwd(),
        encoding: 'utf8'
      })
      return parseInt(result.trim())
    } catch {
      return this.baseline.serviceFiles
    }
  }

  countTotalLines() {
    try {
      const result = execSync('find apps/backend/src -name "*.ts" -exec cat {} \\; | wc -l', {
        cwd: process.cwd(),
        encoding: 'utf8'
      })
      return parseInt(result.trim())
    } catch {
      return this.baseline.totalLines
    }
  }

  countCrudDuplication() {
    try {
      const result = execSync('grep -r "async getByOwner\\|async getStats\\|async create\\|async update\\|async delete" apps/backend/src --include="*.service.ts" | grep -v BaseCrudService | wc -l', {
        cwd: process.cwd(),
        encoding: 'utf8'
      })
      return parseInt(result.trim())
    } catch {
      return 40 // Estimated
    }
  }

  countErrorBlocks() {
    try {
      const result = execSync('grep -r "errorHandler.handleErrorEnhanced" apps/backend/src --include="*.service.ts" | wc -l', {
        cwd: process.cwd(),
        encoding: 'utf8'
      })
      return parseInt(result.trim())
    } catch {
      return 51 // Baseline
    }
  }

  countMigratedServices() {
    try {
      const result = execSync('grep -r "extends BaseCrudService" apps/backend/src --include="*.service.ts" | wc -l', {
        cwd: process.cwd(),
        encoding: 'utf8'
      })
      return parseInt(result.trim())
    } catch {
      return 1 // At least properties
    }
  }

  generateReport() {
    const metrics = this.getCurrentMetrics()
    
    console.log('\n🔍 BACKEND DEDUPLICATION METRICS REPORT')
    console.log('==========================================')
    console.log(`⏰ ${metrics.timestamp}`)
    console.log(`📈 Overall Progress: ${metrics.progress.overall}%`)
    console.log(`🔄 Migration Progress: ${metrics.progress.migration}%`)
    
    console.log('\n📊 CURRENT STATE:')
    console.log(`   Total Lines: ${metrics.current.totalLines.toLocaleString()}`)
    console.log(`   Service Lines: ${metrics.current.serviceLines.toLocaleString()}`)
    console.log(`   Service Files: ${metrics.current.serviceFiles}`)
    console.log(`   Line Reduction: ${metrics.current.lineReduction.toLocaleString()}`)
    
    console.log('\n🎯 DUPLICATION TRACKING:')
    console.log(`   CRUD Method Instances: ${metrics.current.crudMethods}`)
    console.log(`   Error Handling Blocks: ${metrics.current.errorBlocks}`)
    console.log(`   Migrated Services: ${metrics.current.migratedServices}/6`)
    
    console.log('\n📋 TARGET ANALYSIS:')
    const remaining = this.baseline.targetReduction - metrics.current.lineReduction
    console.log(`   Target Reduction: ${this.baseline.targetReduction.toLocaleString()} lines`)
    console.log(`   Achieved: ${metrics.current.lineReduction.toLocaleString()} lines`)
    console.log(`   Remaining: ${remaining.toLocaleString()} lines`)
    console.log(`   Status: ${remaining <= 0 ? '✅ TARGET EXCEEDED' : '🎯 IN PROGRESS'}`)
    
    return metrics
  }

  saveMetrics(metrics) {
    try {
      const metricsFile = join(process.cwd(), 'monitoring-data', 'deduplication-simple.json')
      execSync('mkdir -p monitoring-data', { cwd: process.cwd() })
      
      let history = []
      if (existsSync(metricsFile)) {
        try {
          const data = JSON.parse(readFileSync(metricsFile, 'utf8'))
          history = data.history || []
        } catch {}
      }
      
      history.push(metrics)
      if (history.length > 50) history = history.slice(-50)
      
      writeFileSync(metricsFile, JSON.stringify({
        baseline: this.baseline,
        latest: metrics,
        history
      }, null, 2))
      
      console.log(`\n💾 Metrics saved to: ${metricsFile}`)
    } catch (error) {
      console.warn('Could not save metrics:', error.message)
    }
  }
}

// CLI interface
const monitor = new SimpleDeduplicationMonitor()
const command = process.argv[2] || 'report'

switch (command) {
  case 'report':
    const metrics = monitor.generateReport()
    monitor.saveMetrics(metrics)
    break
  case 'baseline':
    console.log('📋 Baseline:', JSON.stringify(monitor.baseline, null, 2))
    break
  default:
    console.log('Usage: node simple-deduplication-monitor.js [report|baseline]')
}