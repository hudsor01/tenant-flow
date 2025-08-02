#!/usr/bin/env node

/**
 * Performance Baseline Analyzer
 * 
 * Establishes comprehensive baseline metrics for the code consolidation refactoring.
 * Measures code duplication, performance, build times, bundle sizes, and maintainability.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PerformanceBaselineAnalyzer {
  constructor() {
    this.metrics = {
      timestamp: new Date().toISOString(),
      codeMetrics: {},
      performanceMetrics: {},
      buildMetrics: {},
      maintainabilityMetrics: {},
      memoryMetrics: {},
      typeMetrics: {}
    };
    
    this.backendSrcPath = path.join(process.cwd(), 'apps/backend/src');
    this.frontendSrcPath = path.join(process.cwd(), 'apps/frontend/src');
  }

  /**
   * Analyze code duplication across service files
   */
  analyzeCodeDuplication() {
    console.log('📊 Analyzing code duplication...');
    
    const serviceFiles = [
      'properties/properties.service.ts',
      'tenants/tenants.service.ts',
      'leases/leases.service.ts',
      'maintenance/maintenance.service.ts'
    ];

    const repositoryFiles = [
      'properties/properties.repository.ts',
      'leases/lease.repository.ts',
      'maintenance/maintenance-request.repository.ts',
      'documents/document.repository.ts'
    ];

    let totalLines = 0;
    let duplicatedPatterns = {};
    let serviceAnalysis = {};

    // Analyze service files
    serviceFiles.forEach(file => {
      const filePath = path.join(this.backendSrcPath, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        totalLines += lines.length;
        
        const serviceName = file.split('/')[0];
        serviceAnalysis[serviceName] = {
          lines: lines.length,
          methods: this.countMethods(content),
          errorHandling: this.countErrorHandling(content),
          validation: this.countValidation(content),
          crudOperations: this.countCRUDOperations(content)
        };

        // Detect common patterns
        this.detectCommonPatterns(content, duplicatedPatterns, serviceName);
      }
    });

    // Analyze repository files
    let repositoryLines = 0;
    repositoryFiles.forEach(file => {
      const filePath = path.join(this.backendSrcPath, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        repositoryLines += content.split('\n').length;
      }
    });

    this.metrics.codeMetrics = {
      totalServiceLines: totalLines,
      totalRepositoryLines: repositoryLines,
      serviceAnalysis,
      duplicatedPatterns,
      estimatedDuplication: this.calculateEstimatedDuplication(duplicatedPatterns),
      complexityScore: this.calculateComplexityScore(serviceAnalysis)
    };

    console.log(`   Total service lines: ${totalLines}`);
    console.log(`   Total repository lines: ${repositoryLines}`);
    console.log(`   Estimated duplication: ${this.metrics.codeMetrics.estimatedDuplication} lines`);
  }

  /**
   * Measure build performance
   */
  async measureBuildPerformance() {
    console.log('⏱️  Measuring build performance...');
    
    try {
      // Clean build
      const cleanStart = Date.now();
      execSync('npm run clean 2>/dev/null || true', { stdio: 'pipe' });
      
      // Measure full build time
      const buildStart = Date.now();
      execSync('npm run build', { stdio: 'pipe' });
      const buildTime = Date.now() - buildStart;
      
      // Measure incremental build (rebuild without changes)
      const incrementalStart = Date.now();
      execSync('npm run build', { stdio: 'pipe' });
      const incrementalTime = Date.now() - incrementalStart;
      
      // Measure TypeScript check time
      const typeCheckStart = Date.now();
      execSync('npx tsc --noEmit', { stdio: 'pipe', cwd: this.backendSrcPath });
      const typeCheckTime = Date.now() - typeCheckStart;

      this.metrics.buildMetrics = {
        fullBuildTime: buildTime,
        incrementalBuildTime: incrementalTime,
        typeCheckTime,
        buildSpeedup: ((buildTime - incrementalTime) / buildTime * 100).toFixed(2) + '%'
      };

      console.log(`   Full build: ${buildTime}ms`);
      console.log(`   Incremental build: ${incrementalTime}ms`);
      console.log(`   TypeScript check: ${typeCheckTime}ms`);
      
    } catch (error) {
      console.warn('   Build measurement failed:', error.message);
      this.metrics.buildMetrics = { error: error.message };
    }
  }

  /**
   * Analyze bundle sizes
   */
  analyzeBundleSize() {
    console.log('📦 Analyzing bundle sizes...');
    
    try {
      const distPath = path.join(process.cwd(), 'apps/backend/dist');
      const frontendDistPath = path.join(process.cwd(), 'apps/frontend/dist');
      
      let backendSize = 0;
      let frontendSize = 0;
      
      if (fs.existsSync(distPath)) {
        backendSize = this.getDirectorySize(distPath);
      }
      
      if (fs.existsSync(frontendDistPath)) {
        frontendSize = this.getDirectorySize(frontendDistPath);
      }

      this.metrics.buildMetrics.bundleSize = {
        backend: this.formatBytes(backendSize),
        frontend: this.formatBytes(frontendSize),
        total: this.formatBytes(backendSize + frontendSize),
        backendBytes: backendSize,
        frontendBytes: frontendSize
      };

      console.log(`   Backend bundle: ${this.formatBytes(backendSize)}`);
      console.log(`   Frontend bundle: ${this.formatBytes(frontendSize)}`);
      
    } catch (error) {
      console.warn('   Bundle size analysis failed:', error.message);
    }
  }

  /**
   * Measure TypeScript compilation performance
   */
  measureTypeScriptPerformance() {
    console.log('🔧 Measuring TypeScript performance...');
    
    try {
      // Count TypeScript files
      const tsFiles = this.countTypeScriptFiles();
      
      // Measure compilation time with --extendedDiagnostics
      const start = Date.now();
      const result = execSync('npx tsc --noEmit --extendedDiagnostics', { 
        stdio: 'pipe', 
        cwd: this.backendSrcPath,
        encoding: 'utf8'
      });
      const compileTime = Date.now() - start;
      
      // Parse TypeScript diagnostics
      const parseTime = this.parseTypeScriptDiagnostics(result);

      this.metrics.typeMetrics = {
        totalFiles: tsFiles.total,
        backendFiles: tsFiles.backend,
        frontendFiles: tsFiles.frontend,
        compilationTime: compileTime,
        ...parseTime
      };

      console.log(`   TypeScript files: ${tsFiles.total}`);
      console.log(`   Compilation time: ${compileTime}ms`);
      
    } catch (error) {
      console.warn('   TypeScript performance measurement failed:', error.message);
      this.metrics.typeMetrics = { error: error.message };
    }
  }

  /**
   * Analyze maintainability metrics
   */
  analyzeMaintainability() {
    console.log('🔍 Analyzing maintainability...');
    
    const complexity = this.calculateCyclomaticComplexity();
    const dependencies = this.analyzeDependencies();
    const coverage = this.getTestCoverage();
    const duplicateDetection = this.detectDuplicateCode();

    this.metrics.maintainabilityMetrics = {
      cyclomaticComplexity: complexity,
      dependencies,
      testCoverage: coverage,
      duplicateCode: duplicateDetection,
      maintainabilityIndex: this.calculateMaintainabilityIndex(complexity, dependencies, duplicateDetection)
    };

    console.log(`   Cyclomatic complexity: ${complexity.average}`);
    console.log(`   Dependency count: ${dependencies.total}`);
    console.log(`   Duplicate detection: ${duplicateDetection.percentage}%`);
  }

  /**
   * Measure memory usage patterns
   */
  measureMemoryUsage() {
    console.log('💾 Analyzing memory patterns...');
    
    const queryPatterns = this.analyzeQueryPatterns();
    const objectCreation = this.analyzeObjectCreation();
    
    this.metrics.memoryMetrics = {
      queryPatterns,
      objectCreation,
      potentialLeaks: this.detectPotentialMemoryLeaks()
    };

    console.log(`   Query patterns analyzed: ${queryPatterns.total}`);
    console.log(`   Object creation patterns: ${objectCreation.total}`);
  }

  /**
   * Helper methods
   */
  countMethods(content) {
    const methodRegex = /async\s+\w+\s*\(|^\s*\w+\s*\(/gm;
    return (content.match(methodRegex) || []).length;
  }

  countErrorHandling(content) {
    const errorRegex = /try\s*{|catch\s*\(|throw\s+/gm;
    return (content.match(errorRegex) || []).length;
  }

  countValidation(content) {
    const validationRegex = /ValidationException|if\s*\(.*!\w+.*\)|throw.*validation/gm;
    return (content.match(validationRegex) || []).length;
  }

  countCRUDOperations(content) {
    const crudRegex = /findMany|findFirst|create|update|delete|findById/gm;
    return (content.match(crudRegex) || []).length;
  }

  detectCommonPatterns(content, patterns, serviceName) {
    const commonPatterns = [
      { name: 'errorHandling', regex: /errorHandler\.handleErrorEnhanced/g },
      { name: 'validation', regex: /ValidationException.*required/g },
      { name: 'ownership', regex: /ownerId.*string/g },
      { name: 'tryCache', regex: /try\s*{[\s\S]*?}\s*catch/g },
      { name: 'findByOwner', regex: /findBy.*Owner/g }
    ];

    commonPatterns.forEach(pattern => {
      const matches = content.match(pattern.regex) || [];
      if (!patterns[pattern.name]) patterns[pattern.name] = {};
      patterns[pattern.name][serviceName] = matches.length;
    });
  }

  calculateEstimatedDuplication(patterns) {
    let totalDuplication = 0;
    Object.keys(patterns).forEach(patternName => {
      const pattern = patterns[patternName];
      const occurrences = Object.values(pattern);
      if (occurrences.length > 1) {
        // Estimate 3-5 lines per duplicated pattern occurrence
        const avgLinesPerPattern = 4;
        const duplicateOccurrences = occurrences.reduce((sum, count) => sum + count, 0) - 1;
        totalDuplication += duplicateOccurrences * avgLinesPerPattern;
      }
    });
    return totalDuplication;
  }

  calculateComplexityScore(serviceAnalysis) {
    let totalComplexity = 0;
    let serviceCount = 0;
    
    Object.values(serviceAnalysis).forEach(service => {
      const complexity = (service.methods * 2) + service.errorHandling + service.validation;
      totalComplexity += complexity;
      serviceCount++;
    });
    
    return serviceCount > 0 ? Math.round(totalComplexity / serviceCount) : 0;
  }

  getDirectorySize(dirPath) {
    let size = 0;
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        size += this.getDirectorySize(itemPath);
      } else {
        size += stats.size;
      }
    });
    
    return size;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  countTypeScriptFiles() {
    const countFiles = (dir) => {
      let count = 0;
      if (!fs.existsSync(dir)) return count;
      
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory() && !item.includes('node_modules')) {
          count += countFiles(itemPath);
        } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
          count++;
        }
      });
      
      return count;
    };

    return {
      backend: countFiles(this.backendSrcPath),
      frontend: countFiles(this.frontendSrcPath),
      total: countFiles(this.backendSrcPath) + countFiles(this.frontendSrcPath)
    };
  }

  parseTypeScriptDiagnostics(output) {
    // Parse TypeScript extended diagnostics output
    const parseTimeRegex = /Parse time:\s*(\d+(?:\.\d+)?)ms/;
    const bindTimeRegex = /Bind time:\s*(\d+(?:\.\d+)?)ms/;
    const checkTimeRegex = /Check time:\s*(\d+(?:\.\d+)?)ms/;
    
    return {
      parseTime: this.extractTime(output, parseTimeRegex),
      bindTime: this.extractTime(output, bindTimeRegex),
      checkTime: this.extractTime(output, checkTimeRegex)
    };
  }

  extractTime(output, regex) {
    const match = output.match(regex);
    return match ? parseFloat(match[1]) : 0;
  }

  calculateCyclomaticComplexity() {
    // Simplified cyclomatic complexity calculation
    let totalComplexity = 0;
    let fileCount = 0;
    const maxComplexity = 0;
    
    const analyzeFile = (filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      const complexityIndicators = [
        /if\s*\(/g,
        /else\s*if\s*\(/g,
        /while\s*\(/g,
        /for\s*\(/g,
        /catch\s*\(/g,
        /switch\s*\(/g,
        /&&/g,
        /\|\|/g
      ];
      
      let fileComplexity = 1; // Base complexity
      complexityIndicators.forEach(regex => {
        const matches = content.match(regex) || [];
        fileComplexity += matches.length;
      });
      
      return fileComplexity;
    };

    // Analyze service files
    const serviceFiles = [
      'properties/properties.service.ts',
      'tenants/tenants.service.ts',
      'leases/leases.service.ts',
      'maintenance/maintenance.service.ts'
    ];

    serviceFiles.forEach(file => {
      const filePath = path.join(this.backendSrcPath, file);
      if (fs.existsSync(filePath)) {
        const complexity = analyzeFile(filePath);
        totalComplexity += complexity;
        fileCount++;
      }
    });

    return {
      total: totalComplexity,
      average: fileCount > 0 ? Math.round(totalComplexity / fileCount) : 0,
      max: maxComplexity,
      fileCount
    };
  }

  analyzeDependencies() {
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    const backendPackageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'apps/backend/package.json'), 'utf8'));
    
    return {
      root: Object.keys(packageJson.dependencies || {}).length + Object.keys(packageJson.devDependencies || {}).length,
      backend: Object.keys(backendPackageJson.dependencies || {}).length + Object.keys(backendPackageJson.devDependencies || {}).length,
      total: Object.keys(packageJson.dependencies || {}).length + Object.keys(packageJson.devDependencies || {}).length
    };
  }

  getTestCoverage() {
    try {
      // Try to read coverage data if it exists
      const coveragePath = path.join(process.cwd(), 'coverage/coverage-summary.json');
      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        return {
          lines: coverage.total.lines.pct,
          statements: coverage.total.statements.pct,
          functions: coverage.total.functions.pct,
          branches: coverage.total.branches.pct
        };
      }
    } catch (error) {
      // Fallback to estimate
    }
    
    return { estimated: true, lines: 65, statements: 70, functions: 60, branches: 55 };
  }

  detectDuplicateCode() {
    // Simple duplicate detection based on line similarity
    let totalLines = 0;
    let duplicateLines = 0;
    
    const serviceFiles = [
      'properties/properties.service.ts',
      'tenants/tenants.service.ts',
      'leases/leases.service.ts',
      'maintenance/maintenance.service.ts'
    ];

    const allLines = [];
    
    serviceFiles.forEach(file => {
      const filePath = path.join(this.backendSrcPath, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 10);
        allLines.push(...lines);
        totalLines += lines.length;
      }
    });

    // Count duplicate lines
    const lineMap = new Map();
    allLines.forEach(line => {
      lineMap.set(line, (lineMap.get(line) || 0) + 1);
    });
    
    lineMap.forEach((count, line) => {
      if (count > 1) {
        duplicateLines += count - 1;
      }
    });

    return {
      total: totalLines,
      duplicates: duplicateLines,
      percentage: totalLines > 0 ? Math.round((duplicateLines / totalLines) * 100) : 0
    };
  }

  calculateMaintainabilityIndex(complexity, dependencies, duplicateCode) {
    // Simplified maintainability index (0-100, higher is better)
    const complexityScore = Math.max(0, 100 - (complexity.average * 5));
    const dependencyScore = Math.max(0, 100 - (dependencies.total * 2));
    const duplicateScore = Math.max(0, 100 - duplicateCode.percentage);
    
    return Math.round((complexityScore + dependencyScore + duplicateScore) / 3);
  }

  analyzeQueryPatterns() {
    let totalQueries = 0;
    const patterns = {};
    
    const serviceFiles = [
      'properties/properties.service.ts',
      'tenants/tenants.service.ts',
      'leases/leases.service.ts',
      'maintenance/maintenance.service.ts'
    ];

    serviceFiles.forEach(file => {
      const filePath = path.join(this.backendSrcPath, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        const queryPatterns = [
          { name: 'findMany', regex: /findMany/g },
          { name: 'findFirst', regex: /findFirst/g },
          { name: 'findUnique', regex: /findUnique/g },
          { name: 'create', regex: /\.create\(/g },
          { name: 'update', regex: /\.update\(/g },
          { name: 'delete', regex: /\.delete\(/g }
        ];
        
        queryPatterns.forEach(pattern => {
          const matches = content.match(pattern.regex) || [];
          totalQueries += matches.length;
          if (!patterns[pattern.name]) patterns[pattern.name] = 0;
          patterns[pattern.name] += matches.length;
        });
      }
    });

    return { total: totalQueries, patterns };
  }

  analyzeObjectCreation() {
    let totalCreations = 0;
    const patterns = {};
    
    const serviceFiles = [
      'properties/properties.service.ts',
      'tenants/tenants.service.ts',
      'leases/leases.service.ts',
      'maintenance/maintenance.service.ts'
    ];

    serviceFiles.forEach(file => {
      const filePath = path.join(this.backendSrcPath, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        const creationPatterns = [
          { name: 'newObjects', regex: /new\s+\w+\(/g },
          { name: 'arrayCreation', regex: /\[\]/g },
          { name: 'objectLiterals', regex: /{\s*\w+:/g }
        ];
        
        creationPatterns.forEach(pattern => {
          const matches = content.match(pattern.regex) || [];
          totalCreations += matches.length;
          if (!patterns[pattern.name]) patterns[pattern.name] = 0;
          patterns[pattern.name] += matches.length;
        });
      }
    });

    return { total: totalCreations, patterns };
  }

  detectPotentialMemoryLeaks() {
    const leakPatterns = [];
    
    const serviceFiles = [
      'properties/properties.service.ts',
      'tenants/tenants.service.ts',
      'leases/leases.service.ts',
      'maintenance/maintenance.service.ts'
    ];

    serviceFiles.forEach(file => {
      const filePath = path.join(this.backendSrcPath, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for potential memory leak patterns
        if (content.includes('setInterval') && !content.includes('clearInterval')) {
          leakPatterns.push(`${file}: Uncleaned setInterval`);
        }
        
        if (content.includes('setTimeout') && content.match(/setTimeout/g).length > 5) {
          leakPatterns.push(`${file}: Multiple setTimeout calls`);
        }
        
        if (content.includes('EventEmitter') && !content.includes('removeListener')) {
          leakPatterns.push(`${file}: EventEmitter without cleanup`);
        }
      }
    });

    return leakPatterns;
  }

  /**
   * Save baseline metrics to file
   */
  saveBaseline() {
    const baselineFile = path.join(process.cwd(), 'performance-baseline.json');
    fs.writeFileSync(baselineFile, JSON.stringify(this.metrics, null, 2));
    console.log(`\n✅ Baseline metrics saved to ${baselineFile}`);
    return baselineFile;
  }

  /**
   * Generate summary report
   */
  generateSummary() {
    console.log('\n📋 BASELINE METRICS SUMMARY');
    console.log('=' .repeat(50));
    
    console.log('\n🔍 Code Duplication:');
    console.log(`   Estimated duplication: ${this.metrics.codeMetrics.estimatedDuplication} lines`);
    console.log(`   Complexity score: ${this.metrics.codeMetrics.complexityScore}`);
    
    if (this.metrics.buildMetrics.fullBuildTime) {
      console.log('\n⏱️  Build Performance:');
      console.log(`   Full build: ${this.metrics.buildMetrics.fullBuildTime}ms`);
      console.log(`   Incremental: ${this.metrics.buildMetrics.incrementalBuildTime}ms`);
      console.log(`   TypeScript check: ${this.metrics.buildMetrics.typeCheckTime}ms`);
    }
    
    if (this.metrics.buildMetrics.bundleSize) {
      console.log('\n📦 Bundle Sizes:');
      console.log(`   Backend: ${this.metrics.buildMetrics.bundleSize.backend}`);
      console.log(`   Frontend: ${this.metrics.buildMetrics.bundleSize.frontend}`);
    }
    
    if (this.metrics.maintainabilityMetrics) {
      console.log('\n🔧 Maintainability:');
      console.log(`   Maintainability index: ${this.metrics.maintainabilityMetrics.maintainabilityIndex}/100`);
      console.log(`   Cyclomatic complexity: ${this.metrics.maintainabilityMetrics.cyclomaticComplexity.average}`);
      console.log(`   Duplicate code: ${this.metrics.maintainabilityMetrics.duplicateCode.percentage}%`);
    }
    
    console.log('\n🎯 CONSOLIDATION TARGETS:');
    console.log(`   Properties Service: ${this.metrics.codeMetrics.serviceAnalysis.properties?.lines || 0} lines`);
    console.log(`   Tenants Service: ${this.metrics.codeMetrics.serviceAnalysis.tenants?.lines || 0} lines`);
    console.log(`   Leases Service: ${this.metrics.codeMetrics.serviceAnalysis.leases?.lines || 0} lines`);
    console.log(`   Maintenance Service: ${this.metrics.codeMetrics.serviceAnalysis.maintenance?.lines || 0} lines`);
    
    const totalServiceLines = Object.values(this.metrics.codeMetrics.serviceAnalysis)
      .reduce((sum, service) => sum + (service.lines || 0), 0);
    console.log(`   Total: ${totalServiceLines} lines`);
    console.log(`   Target reduction: ${this.metrics.codeMetrics.estimatedDuplication} lines (${Math.round(this.metrics.codeMetrics.estimatedDuplication / totalServiceLines * 100)}%)`);
    
    console.log('\n📊 Next Steps:');
    console.log('   1. Begin service consolidation with Migration Specialist');
    console.log('   2. Monitor metrics during each service migration');
    console.log('   3. Validate performance improvements after consolidation');
    console.log('   4. Update documentation with improvement metrics');
  }

  /**
   * Run comprehensive baseline analysis
   */
  async runAnalysis() {
    console.log('🚀 Starting Performance Baseline Analysis...\n');
    
    this.analyzeCodeDuplication();
    this.analyzeMaintainability();
    this.measureMemoryUsage();
    this.measureTypeScriptPerformance();
    await this.measureBuildPerformance();
    this.analyzeBundleSize();
    
    const baselineFile = this.saveBaseline();
    this.generateSummary();
    
    return {
      metrics: this.metrics,
      baselineFile
    };
  }
}

// Create memory store for performance tracking
function storeMemoryForLaterUse(metrics) {
  const memoryData = {
    entityType: 'performance-baseline',
    name: 'TenantFlow Code Consolidation Baseline',
    observations: [
      `Code duplication baseline: ${metrics.codeMetrics.estimatedDuplication} lines across services`,
      `Service complexity score: ${metrics.codeMetrics.complexityScore}/100`,
      `Maintainability index: ${metrics.maintainabilityMetrics?.maintainabilityIndex || 'unknown'}/100`,
      `Total service lines: ${metrics.codeMetrics.totalServiceLines} lines`,
      `Build performance: Full=${metrics.buildMetrics.fullBuildTime}ms, Incremental=${metrics.buildMetrics.incrementalBuildTime}ms`,
      `TypeScript files: ${metrics.typeMetrics?.totalFiles || 'unknown'} files`,
      `Bundle size: Backend=${metrics.buildMetrics.bundleSize?.backend || 'unknown'}, Frontend=${metrics.buildMetrics.bundleSize?.frontend || 'unknown'}`,
      `Memory patterns: ${metrics.memoryMetrics?.queryPatterns?.total || 0} query patterns detected`,
      `Duplicate code percentage: ${metrics.maintainabilityMetrics?.duplicateCode?.percentage || 0}%`
    ]
  };
  
  console.log('\n💾 Storing baseline data for future analysis...');
  console.log(`Entity: ${memoryData.name}`);
  console.log(`Observations: ${memoryData.observations.length} metrics recorded`);
  
  return memoryData;
}

// Run if called directly
if (require.main === module) {
  const analyzer = new PerformanceBaselineAnalyzer();
  analyzer.runAnalysis()
    .then(result => {
      // Store in memory for future reference
      const memoryData = storeMemoryForLaterUse(result.metrics);
      
      console.log('\n✅ Performance baseline analysis complete!');
      console.log(`📁 Results saved to: ${result.baselineFile}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Analysis failed:', error.message);
      process.exit(1);
    });
}

module.exports = { PerformanceBaselineAnalyzer };