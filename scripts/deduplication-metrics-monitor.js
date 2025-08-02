#!/usr/bin/env node

/**
 * Backend Deduplication Metrics Monitor
 * Tracks real-time progress of code deduplication efforts
 */

import { execSync } from 'child_process'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

class DeduplicationMetricsMonitor {
  constructor() {
    this.metricsFile = join(process.cwd(), 'monitoring-data', 'deduplication-metrics.json')
    this.ensureMetricsDirectory()
    this.baseline = this.loadBaseline()
  }

  ensureMetricsDirectory() {
    try {
      execSync('mkdir -p monitoring-data', { cwd: process.cwd() })
    } catch (error) {
      console.warn('Could not create monitoring-data directory:', error.message)
    }
  }

  loadBaseline() {
    return {
      totalLines: 34902,
      serviceLines: 11842,
      serviceFiles: 39,
      duplicateLines: 1908,
      errorHandlingBlocks: 51,
      targetReduction: 1130,
      migratedServices: ['properties'],
      pendingServices: ['leases', 'maintenance', 'documents', 'tenants', 'units', 'users']
    }
  }

  collectCurrentMetrics() {
    const metrics = {
      timestamp: new Date().toISOString(),
      fileMetrics: this.getFileMetrics(),
      duplicationMetrics: this.getDuplicationMetrics(),
      typeScriptMetrics: this.getTypeScriptMetrics(),
      buildMetrics: this.getBuildMetrics(),
      performanceMetrics: this.getPerformanceMetrics()
    }

    return metrics
  }

  getFileMetrics() {
    try {
      const totalLines = this.countLines('**/*.ts')
      const serviceLines = this.countLines('**/*.service.ts')
      const serviceFiles = this.countFiles('**/*.service.ts')

      return {
        totalLines,
        serviceLines,
        serviceFiles,
        servicePercentage: ((serviceLines / totalLines) * 100).toFixed(2),
        reductionFromBaseline: this.baseline.serviceLines - serviceLines,
        targetProgress: (((this.baseline.serviceLines - serviceLines) / this.baseline.targetReduction) * 100).toFixed(2)
      }
    } catch (error) {
      console.warn('Error collecting file metrics:', error.message)
      return { error: error.message }
    }
  }

  getDuplicationMetrics() {
    try {
      const crudMethods = this.countDuplicateCrudMethods()
      const errorHandling = this.countErrorHandlingBlocks()
      const validationPatterns = this.countValidationPatterns()
      const baseCrudUsage = this.countBaseCrudUsage()

      const totalDuplication = crudMethods + errorHandling + validationPatterns
      const reductionFromBaseline = this.baseline.duplicateLines - totalDuplication

      return {
        crudMethods,
        errorHandling,
        validationPatterns,
        totalDuplication,
        reductionFromBaseline,
        reductionPercentage: ((reductionFromBaseline / this.baseline.duplicateLines) * 100).toFixed(2),
        baseCrudUsage,
        migrationProgress: ((baseCrudUsage.migratedCount / baseCrudUsage.totalServices) * 100).toFixed(2)
      }
    } catch (error) {
      console.warn('Error collecting duplication metrics:', error.message)
      return { error: error.message }
    }
  }

  getTypeScriptMetrics() {
    try {
      const typeCheckResult = execSync('npx tsc --noEmit --project apps/backend/tsconfig.json 2>&1 || true', {
        cwd: process.cwd(),
        encoding: 'utf8'
      })

      const errorCount = (typeCheckResult.match(/error TS\d+:/g) || []).length
      const hasErrors = errorCount > 0

      return {
        errorCount,
        hasErrors,
        errorImprovement: Math.max(0, 10 - errorCount), // Baseline was ~10 errors
        typeCheckStatus: hasErrors ? 'FAILING' : 'PASSING'
      }
    } catch (error) {
      return {
        errorCount: 'unknown',
        hasErrors: true,
        error: error.message,
        typeCheckStatus: 'ERROR'
      }
    }
  }

  getBuildMetrics() {
    try {
      const buildStart = Date.now()
      execSync('npm run typecheck --silent 2>/dev/null || true', { cwd: process.cwd() })
      const buildTime = Date.now() - buildStart

      return {
        buildTime,
        buildImprovement: Math.max(0, 2584 - buildTime), // Baseline was ~2.6s
        buildStatus: buildTime < 3000 ? 'FAST' : 'SLOW'
      }
    } catch (error) {
      return {
        buildTime: 'unknown',
        error: error.message,
        buildStatus: 'ERROR'
      }
    }
  }

  getPerformanceMetrics() {
    // Mock performance metrics - in real implementation, this would connect to monitoring
    return {
      queryOptimization: 'BASELINE',
      memoryUsage: 'MONITORING',
      cacheEfficiency: 'BASELINE',
      errorHandlingEfficiency: 'MEASURING'
    }
  }

  countLines(pattern) {
    try {
      const result = execSync(`find apps/backend/src -name "${pattern}" -type f | xargs wc -l | tail -1`, {
        cwd: process.cwd(),
        encoding: 'utf8'
      })
      const match = result.match(/(\d+)\s+total/)
      return match ? parseInt(match[1]) : 0
    } catch {
      return 0
    }
  }

  countFiles(pattern) {
    try {
      const result = execSync(`find apps/backend/src -name "${pattern}" -type f | wc -l`, {
        cwd: process.cwd(),
        encoding: 'utf8'
      })
      return parseInt(result.trim())
    } catch {
      return 0
    }
  }

  countDuplicateCrudMethods() {
    try {
      const result = execSync('grep -n "async getByOwner\\|async getStats\\|async getByIdOrThrow\\|async create\\|async update\\|async delete" apps/backend/src/**/*.service.ts | grep -v base-crud | wc -l', {
        cwd: process.cwd(),
        encoding: 'utf8'
      })
      return parseInt(result.trim()) * 6 // Estimated 6 lines per method
    } catch {
      return 0
    }
  }

  countErrorHandlingBlocks() {
    try {
      const result = execSync('grep -n "errorHandler.handleErrorEnhanced" apps/backend/src/**/*.service.ts | wc -l', {
        cwd: process.cwd(),
        encoding: 'utf8'
      })
      return parseInt(result.trim()) * 8 // Estimated 8 lines per error block
    } catch {
      return 0
    }
  }

  countValidationPatterns() {
    try {
      const result = execSync('grep -n "validateOwnerId\\|validateCreateData\\|validateUpdateData" apps/backend/src/**/*.service.ts | wc -l', {
        cwd: process.cwd(),
        encoding: 'utf8'
      })
      return parseInt(result.trim()) * 5 // Estimated 5 lines per validation
    } catch {
      return 0
    }
  }

  countBaseCrudUsage() {
    try {
      const extendsBaseCrud = execSync('grep -l "extends BaseCrudService" apps/backend/src/**/*.service.ts | wc -l', {
        cwd: process.cwd(),
        encoding: 'utf8'
      })
      
      return {
        migratedCount: parseInt(extendsBaseCrud.trim()),
        totalServices: 6, // Target services for migration
        migratedServices: this.findMigratedServices()
      }
    } catch {
      return { migratedCount: 1, totalServices: 6, migratedServices: ['properties'] }
    }
  }

  findMigratedServices() {
    try {
      const result = execSync('grep -l "extends BaseCrudService" apps/backend/src/**/*.service.ts', {
        cwd: process.cwd(),
        encoding: 'utf8'
      })
      
      return result.split('\n')
        .filter(line => line.trim())
        .map(file => file.split('/').pop().replace('.service.ts', ''))
    } catch {
      return ['properties']
    }
  }

  calculateProgress() {
    const current = this.collectCurrentMetrics()
    
    const lineReduction = this.baseline.serviceLines - current.fileMetrics.serviceLines
    const duplicationReduction = this.baseline.duplicateLines - current.duplicationMetrics.totalDuplication
    
    return {
      overall: ((lineReduction / this.baseline.targetReduction) * 100).toFixed(2),
      duplicationProgress: ((duplicationReduction / this.baseline.duplicateLines) * 100).toFixed(2),
      migrationProgress: current.duplicationMetrics.migrationProgress,
      typeScriptProgress: ((10 - current.typeScriptMetrics.errorCount) / 10 * 100).toFixed(2)
    }
  }

  saveMetrics(metrics) {
    try {
      const history = this.loadMetricsHistory()
      history.push(metrics)
      
      // Keep only last 100 entries
      if (history.length > 100) {
        history.splice(0, history.length - 100)
      }
      
      writeFileSync(this.metricsFile, JSON.stringify({
        lastUpdated: new Date().toISOString(),
        baseline: this.baseline,
        current: metrics,
        history
      }, null, 2))
    } catch (error) {
      console.warn('Could not save metrics:', error.message)
    }
  }

  loadMetricsHistory() {
    try {
      if (existsSync(this.metricsFile)) {
        const data = JSON.parse(readFileSync(this.metricsFile, 'utf8'))
        return data.history || []
      }
    } catch (error) {
      console.warn('Could not load metrics history:', error.message)
    }
    return []
  }

  generateReport() {
    const metrics = this.collectCurrentMetrics()
    const progress = this.calculateProgress()
    
    console.log('\n🔍 BACKEND DEDUPLICATION METRICS REPORT')
    console.log('==========================================')
    console.log(`⏰ Timestamp: ${metrics.timestamp}`)
    console.log(`📈 Overall Progress: ${progress.overall}%`)
    console.log(`🔄 Migration Progress: ${progress.migrationProgress}%`)
    console.log(`🎯 Duplication Reduction: ${progress.duplicationProgress}%`)
    console.log(`📝 TypeScript Improvements: ${progress.typeScriptProgress}%`)
    
    console.log('\n📊 CURRENT METRICS:')
    console.log(`   Total Lines: ${metrics.fileMetrics.totalLines}`)
    console.log(`   Service Lines: ${metrics.fileMetrics.serviceLines}`)
    console.log(`   Reduction from Baseline: ${metrics.fileMetrics.reductionFromBaseline} lines`)
    console.log(`   Duplicate Lines: ${metrics.duplicationMetrics.totalDuplication}`)
    console.log(`   TypeScript Errors: ${metrics.typeScriptMetrics.errorCount}`)
    
    console.log('\n🚀 MIGRATION STATUS:')
    console.log(`   Migrated Services: ${metrics.duplicationMetrics.baseCrudUsage.migratedCount}/${metrics.duplicationMetrics.baseCrudUsage.totalServices}`)
    console.log(`   Services: ${metrics.duplicationMetrics.baseCrudUsage.migratedServices.join(', ')}`)
    
    this.saveMetrics(metrics)
    
    return metrics
  }

  watchMode() {
    console.log('🔍 Starting deduplication metrics monitoring...')
    
    // Initial report
    this.generateReport()
    
    // Watch every 30 seconds
    setInterval(() => {
      console.log('\n🔄 Updating metrics...')
      this.generateReport()
    }, 30000)
  }
}

// CLI interface
const monitor = new DeduplicationMetricsMonitor()

const command = process.argv[2] || 'report'

switch (command) {
  case 'watch':
    monitor.watchMode()
    break
  case 'report':
    monitor.generateReport()
    break
  case 'baseline':
    console.log('📋 Baseline Metrics:', JSON.stringify(monitor.baseline, null, 2))
    break
  default:
    console.log('Usage: node deduplication-metrics-monitor.js [report|watch|baseline]')
}