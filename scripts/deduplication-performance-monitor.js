#!/usr/bin/env node

/**
 * Deduplication Performance Monitor
 * Tracks memory usage, query performance, and build metrics during deduplication
 */

const { execSync } = require('child_process')
const { writeFileSync, readFileSync, existsSync } = require('fs')
const { join } = require('path')

class DeduplicationPerformanceMonitor {
  constructor() {
    this.metricsFile = join(process.cwd(), 'monitoring-data', 'dedup-performance.json')
    this.baseline = this.loadBaseline()
  }

  loadBaseline() {
    return {
      buildTime: 2584, // ms from baseline
      typeScriptErrors: 10,
      memoryEstimate: 100, // MB estimated for service layer
      queryPatterns: 51 // error handling blocks as proxy
    }
  }

  collectPerformanceMetrics() {
    const timestamp = new Date().toISOString()
    
    return {
      timestamp,
      build: this.measureBuildPerformance(),
      typeScript: this.measureTypeScriptHealth(),
      memory: this.estimateMemoryImpact(),
      codeQuality: this.measureCodeQuality(),
      accelerate: this.checkAccelerateStatus()
    }
  }

  measureBuildPerformance() {
    try {
      console.log('📊 Measuring build performance...')
      
      const start = Date.now()
      execSync('npx turbo run typecheck --filter=@tenantflow/backend 2>/dev/null || true', { 
        cwd: process.cwd() 
      })
      const duration = Date.now() - start
      
      const improvement = ((this.baseline.buildTime - duration) / this.baseline.buildTime * 100).toFixed(1)
      
      return {
        duration,
        improvement: `${improvement}%`,
        status: duration < 3000 ? 'FAST' : 'SLOW',
        target: this.baseline.buildTime
      }
    } catch (error) {
      return {
        duration: 'unknown',
        improvement: 'unknown',
        status: 'ERROR',
        error: error.message
      }
    }
  }

  measureTypeScriptHealth() {
    try {
      console.log('🔍 Checking TypeScript health...')
      
      const result = execSync('npx tsc --noEmit --project apps/backend/tsconfig.json 2>&1 || true', {
        cwd: process.cwd(),
        encoding: 'utf8'
      })
      
      const errors = (result.match(/error TS\d+:/g) || []).length
      const warnings = (result.match(/warning TS\d+:/g) || []).length
      const improvement = Math.max(0, this.baseline.typeScriptErrors - errors)
      
      return {
        errors,
        warnings,
        improvement,
        status: errors === 0 ? 'HEALTHY' : errors < 5 ? 'IMPROVING' : 'NEEDS_WORK',
        errorReduction: `${improvement} fewer errors`
      }
    } catch (error) {
      return {
        errors: 'unknown',
        warnings: 'unknown',
        status: 'ERROR',
        error: error.message
      }
    }
  }

  estimateMemoryImpact() {
    try {
      console.log('💾 Estimating memory impact...')
      
      // Count service instances and shared patterns
      const serviceFiles = this.countServiceFiles()
      const sharedServices = this.countSharedServices()
      const duplicatePatterns = this.countDuplicatePatterns()
      
      // Rough memory estimation
      const baseMemoryPerService = 2 // MB per service
      const currentMemory = serviceFiles * baseMemoryPerService
      const optimizedMemory = (serviceFiles - sharedServices) * baseMemoryPerService + (sharedServices * 0.5)
      const memoryReduction = currentMemory - optimizedMemory
      
      return {
        estimated: {
          current: `${currentMemory}MB`,
          optimized: `${optimizedMemory.toFixed(1)}MB`,
          reduction: `${memoryReduction.toFixed(1)}MB`
        },
        serviceInstances: serviceFiles,
        sharedInstances: sharedServices,
        duplicatePatterns,
        efficiency: `${((memoryReduction / currentMemory) * 100).toFixed(1)}% improvement`
      }
    } catch (error) {
      return {
        estimated: 'unknown',
        error: error.message
      }
    }
  }

  measureCodeQuality() {
    try {
      console.log('🎯 Measuring code quality...')
      
      const duplicateMethods = this.countDuplicateCrudMethods()
      const errorBlocks = this.countErrorHandlingBlocks()
      const validationPatterns = this.countValidationPatterns()
      const baseCrudUsage = this.countBaseCrudUsage()
      
      const totalDuplication = duplicateMethods + errorBlocks + validationPatterns
      const duplicationReduction = Math.max(0, 100 - totalDuplication) // Rough calculation
      
      return {
        duplication: {
          crudMethods: duplicateMethods,
          errorBlocks,
          validationPatterns,
          total: totalDuplication
        },
        consolidation: {
          baseCrudServices: baseCrudUsage,
          consolidationRate: `${((baseCrudUsage / 6) * 100).toFixed(1)}%`
        },
        qualityScore: {
          score: Math.max(0, 100 - (totalDuplication / 2)), // Simplified score
          status: totalDuplication < 50 ? 'EXCELLENT' : totalDuplication < 100 ? 'GOOD' : 'NEEDS_IMPROVEMENT'
        }
      }
    } catch (error) {
      return {
        error: error.message
      }
    }
  }

  checkAccelerateStatus() {
    try {
      console.log('⚡ Checking Prisma Accelerate status...')
      
      // Check if accelerate middleware is in use
      const accelerateFiles = execSync('find apps/backend/src -name "*accelerate*" -type f | wc -l', {
        cwd: process.cwd(),
        encoding: 'utf8'
      })
      
      const accelerateUsage = parseInt(accelerateFiles.trim()) > 0
      
      // Check cache configuration
      const cacheConfig = this.checkCacheConfiguration()
      
      return {
        middleware: accelerateUsage ? 'ACTIVE' : 'INACTIVE',
        cacheConfig,
        monitoring: 'BASELINE',
        optimizationPotential: accelerateUsage ? 'CONFIGURED' : 'NEEDS_SETUP'
      }
    } catch (error) {
      return {
        status: 'ERROR',
        error: error.message
      }
    }
  }

  checkCacheConfiguration() {
    try {
      const result = execSync('grep -r "ttl:" apps/backend/src --include="*.ts" | wc -l', {
        cwd: process.cwd(),
        encoding: 'utf8'
      })
      const cacheRules = parseInt(result.trim())
      
      return {
        rules: cacheRules,
        status: cacheRules > 0 ? 'CONFIGURED' : 'BASIC'
      }
    } catch {
      return {
        rules: 0,
        status: 'UNKNOWN'
      }
    }
  }

  // Helper methods
  countServiceFiles() {
    try {
      const result = execSync('find apps/backend/src -name "*.service.ts" | wc -l', {
        cwd: process.cwd(),
        encoding: 'utf8'
      })
      return parseInt(result.trim())
    } catch {
      return 39
    }
  }

  countSharedServices() {
    try {
      const result = execSync('grep -r "extends BaseCrudService" apps/backend/src --include="*.service.ts" | wc -l', {
        cwd: process.cwd(),
        encoding: 'utf8'
      })
      return parseInt(result.trim())
    } catch {
      return 1
    }
  }

  countDuplicatePatterns() {
    try {
      const result = execSync('grep -r "async getByOwner\\|async create\\|async update" apps/backend/src --include="*.service.ts" | wc -l', {
        cwd: process.cwd(),
        encoding: 'utf8'
      })
      return parseInt(result.trim())
    } catch {
      return 50
    }
  }

  countDuplicateCrudMethods() {
    try {
      const result = execSync('grep -r "async getByOwner\\|async getStats\\|async create" apps/backend/src --include="*.service.ts" | grep -v BaseCrudService | wc -l', {
        cwd: process.cwd(),
        encoding: 'utf8'
      })
      return parseInt(result.trim())
    } catch {
      return 40
    }
  }

  countErrorHandlingBlocks() {
    try {
      const result = execSync('grep -r "errorHandler.handleErrorEnhanced" apps/backend/src --include="*.service.ts" | wc -l', {
        cwd: process.cwd(),
        encoding: 'utf8'
      })
      return parseInt(result.trim())
    } catch {
      return 51
    }
  }

  countValidationPatterns() {
    try {
      const result = execSync('grep -r "validateOwnerId\\|validateCreateData" apps/backend/src --include="*.service.ts" | wc -l', {
        cwd: process.cwd(),
        encoding: 'utf8'
      })
      return parseInt(result.trim())
    } catch {
      return 10
    }
  }

  countBaseCrudUsage() {
    try {
      const result = execSync('grep -r "extends BaseCrudService" apps/backend/src --include="*.service.ts" | wc -l', {
        cwd: process.cwd(),
        encoding: 'utf8'
      })
      return parseInt(result.trim())
    } catch {
      return 1
    }
  }

  generatePerformanceReport() {
    console.log('\n⚡ DEDUPLICATION PERFORMANCE ANALYSIS')
    console.log('=====================================')
    
    const metrics = this.collectPerformanceMetrics()
    
    console.log(`⏰ Timestamp: ${metrics.timestamp}`)
    
    console.log('\n🏗️ BUILD PERFORMANCE:')
    console.log(`   Duration: ${metrics.build.duration}ms`)
    console.log(`   Improvement: ${metrics.build.improvement}`)
    console.log(`   Status: ${metrics.build.status}`)
    
    console.log('\n📝 TYPESCRIPT HEALTH:')
    console.log(`   Errors: ${metrics.typeScript.errors}`)
    console.log(`   Warnings: ${metrics.typeScript.warnings}`)
    console.log(`   Status: ${metrics.typeScript.status}`)
    
    console.log('\n💾 MEMORY IMPACT:')
    console.log(`   Current Estimate: ${metrics.memory.estimated.current}`)
    console.log(`   Optimized Estimate: ${metrics.memory.estimated.optimized}`)
    console.log(`   Efficiency Gain: ${metrics.memory.efficiency}`)
    
    console.log('\n🎯 CODE QUALITY:')
    console.log(`   Duplicate Methods: ${metrics.codeQuality.duplication.crudMethods}`)
    console.log(`   Error Blocks: ${metrics.codeQuality.duplication.errorBlocks}`)
    console.log(`   Quality Score: ${metrics.codeQuality.qualityScore.score.toFixed(1)}/100`)
    console.log(`   Status: ${metrics.codeQuality.qualityScore.status}`)
    
    console.log('\n⚡ ACCELERATE STATUS:')
    console.log(`   Middleware: ${metrics.accelerate.middleware}`)
    console.log(`   Cache Rules: ${metrics.accelerate.cacheConfig.rules}`)
    console.log(`   Optimization: ${metrics.accelerate.optimizationPotential}`)
    
    this.saveMetrics(metrics)
    
    return metrics
  }

  saveMetrics(metrics) {
    try {
      execSync('mkdir -p monitoring-data', { cwd: process.cwd() })
      
      let history = []
      if (existsSync(this.metricsFile)) {
        try {
          const data = JSON.parse(readFileSync(this.metricsFile, 'utf8'))
          history = data.history || []
        } catch {}
      }
      
      history.push(metrics)
      if (history.length > 20) history = history.slice(-20)
      
      writeFileSync(this.metricsFile, JSON.stringify({
        baseline: this.baseline,
        latest: metrics,
        history
      }, null, 2))
      
      console.log(`\n💾 Performance metrics saved to: ${this.metricsFile}`)
    } catch (error) {
      console.warn('Could not save performance metrics:', error.message)
    }
  }
}

// CLI interface
const monitor = new DeduplicationPerformanceMonitor()
const command = process.argv[2] || 'report'

switch (command) {
  case 'report':
    monitor.generatePerformanceReport()
    break
  case 'baseline':
    console.log('📋 Performance Baseline:', JSON.stringify(monitor.baseline, null, 2))
    break
  default:
    console.log('Usage: node deduplication-performance-monitor.js [report|baseline]')
}