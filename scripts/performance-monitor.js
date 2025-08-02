#!/usr/bin/env node

/**
 * Performance Monitor
 * 
 * Monitors performance improvements during the consolidation process.
 * Compares current metrics against baseline and tracks progress.
 */

const fs = require('fs');
const path = require('path');
const { PerformanceBaselineAnalyzer } = require('./performance-baseline-analyzer');

class PerformanceMonitor {
  constructor() {
    this.baselineFile = path.join(process.cwd(), 'performance-baseline.json');
    this.progressFile = path.join(process.cwd(), 'consolidation-progress.json');
    this.baseline = null;
    this.loadBaseline();
  }

  loadBaseline() {
    if (fs.existsSync(this.baselineFile)) {
      this.baseline = JSON.parse(fs.readFileSync(this.baselineFile, 'utf8'));
      console.log('📊 Loaded baseline metrics from', this.baselineFile);
    } else {
      console.warn('⚠️  No baseline found. Run performance-baseline-analyzer.js first.');
    }
  }

  async measureCurrentMetrics() {
    console.log('📏 Measuring current performance metrics...');
    
    const analyzer = new PerformanceBaselineAnalyzer();
    await analyzer.runAnalysis();
    
    return analyzer.metrics;
  }

  compareMetrics(current) {
    if (!this.baseline) {
      throw new Error('No baseline available for comparison');
    }

    console.log('\n🔍 Comparing metrics against baseline...');

    const comparison = {
      timestamp: new Date().toISOString(),
      baseline: this.baseline,
      current: current,
      improvements: {}
    };

    // Code duplication improvements
    if (this.baseline.codeMetrics && current.codeMetrics) {
      const baselineDuplication = this.baseline.codeMetrics.estimatedDuplication;
      const currentDuplication = current.codeMetrics.estimatedDuplication;
      const reduction = baselineDuplication - currentDuplication;
      const reductionPercentage = baselineDuplication > 0 ? 
        ((reduction / baselineDuplication) * 100).toFixed(2) : 0;

      comparison.improvements.codeDuplication = {
        baseline: baselineDuplication,
        current: currentDuplication,
        reduction: reduction,
        reductionPercentage: reductionPercentage + '%',
        status: reduction > 0 ? 'IMPROVED' : reduction < 0 ? 'REGRESSION' : 'NO_CHANGE'
      };
    }

    // Build performance improvements
    if (this.baseline.buildMetrics && current.buildMetrics) {
      const buildImprovement = this.calculateBuildImprovement(
        this.baseline.buildMetrics,
        current.buildMetrics
      );
      comparison.improvements.buildPerformance = buildImprovement;
    }

    // Bundle size improvements
    if (this.baseline.buildMetrics?.bundleSize && current.buildMetrics?.bundleSize) {
      const bundleImprovement = this.calculateBundleImprovement(
        this.baseline.buildMetrics.bundleSize,
        current.buildMetrics.bundleSize
      );
      comparison.improvements.bundleSize = bundleImprovement;
    }

    // Maintainability improvements
    if (this.baseline.maintainabilityMetrics && current.maintainabilityMetrics) {
      const maintainabilityImprovement = this.calculateMaintainabilityImprovement(
        this.baseline.maintainabilityMetrics,
        current.maintainabilityMetrics
      );
      comparison.improvements.maintainability = maintainabilityImprovement;
    }

    // TypeScript performance improvements
    if (this.baseline.typeMetrics && current.typeMetrics) {
      const typeImprovement = this.calculateTypeScriptImprovement(
        this.baseline.typeMetrics,
        current.typeMetrics
      );
      comparison.improvements.typeScript = typeImprovement;
    }

    return comparison;
  }

  calculateBuildImprovement(baseline, current) {
    const improvements = {};

    if (baseline.fullBuildTime && current.fullBuildTime) {
      const reduction = baseline.fullBuildTime - current.fullBuildTime;
      const reductionPercentage = baseline.fullBuildTime > 0 ? 
        ((reduction / baseline.fullBuildTime) * 100).toFixed(2) : 0;

      improvements.fullBuild = {
        baseline: baseline.fullBuildTime,
        current: current.fullBuildTime,
        reduction: reduction,
        reductionPercentage: reductionPercentage + '%',
        status: reduction > 0 ? 'IMPROVED' : reduction < 0 ? 'REGRESSION' : 'NO_CHANGE'
      };
    }

    if (baseline.typeCheckTime && current.typeCheckTime) {
      const reduction = baseline.typeCheckTime - current.typeCheckTime;
      const reductionPercentage = baseline.typeCheckTime > 0 ? 
        ((reduction / baseline.typeCheckTime) * 100).toFixed(2) : 0;

      improvements.typeCheck = {
        baseline: baseline.typeCheckTime,
        current: current.typeCheckTime,
        reduction: reduction,
        reductionPercentage: reductionPercentage + '%',
        status: reduction > 0 ? 'IMPROVED' : reduction < 0 ? 'REGRESSION' : 'NO_CHANGE'
      };
    }

    return improvements;
  }

  calculateBundleImprovement(baseline, current) {
    const improvements = {};

    if (baseline.backendBytes && current.backendBytes) {
      const reduction = baseline.backendBytes - current.backendBytes;
      const reductionPercentage = baseline.backendBytes > 0 ? 
        ((reduction / baseline.backendBytes) * 100).toFixed(2) : 0;

      improvements.backend = {
        baseline: baseline.backend,
        current: current.backend,
        reduction: this.formatBytes(reduction),
        reductionPercentage: reductionPercentage + '%',
        status: reduction > 0 ? 'IMPROVED' : reduction < 0 ? 'REGRESSION' : 'NO_CHANGE'
      };
    }

    if (baseline.frontendBytes && current.frontendBytes) {
      const reduction = baseline.frontendBytes - current.frontendBytes;
      const reductionPercentage = baseline.frontendBytes > 0 ? 
        ((reduction / baseline.frontendBytes) * 100).toFixed(2) : 0;

      improvements.frontend = {
        baseline: baseline.frontend,
        current: current.frontend,
        reduction: this.formatBytes(reduction),
        reductionPercentage: reductionPercentage + '%',
        status: reduction > 0 ? 'IMPROVED' : reduction < 0 ? 'REGRESSION' : 'NO_CHANGE'
      };
    }

    return improvements;
  }

  calculateMaintainabilityImprovement(baseline, current) {
    const improvements = {};

    // Maintainability index improvement
    if (baseline.maintainabilityIndex && current.maintainabilityIndex) {
      const improvement = current.maintainabilityIndex - baseline.maintainabilityIndex;
      const improvementPercentage = baseline.maintainabilityIndex > 0 ? 
        ((improvement / baseline.maintainabilityIndex) * 100).toFixed(2) : 0;

      improvements.maintainabilityIndex = {
        baseline: baseline.maintainabilityIndex,
        current: current.maintainabilityIndex,
        improvement: improvement,
        improvementPercentage: improvementPercentage + '%',
        status: improvement > 0 ? 'IMPROVED' : improvement < 0 ? 'REGRESSION' : 'NO_CHANGE'
      };
    }

    // Complexity improvement
    if (baseline.cyclomaticComplexity && current.cyclomaticComplexity) {
      const reduction = baseline.cyclomaticComplexity.average - current.cyclomaticComplexity.average;
      const reductionPercentage = baseline.cyclomaticComplexity.average > 0 ? 
        ((reduction / baseline.cyclomaticComplexity.average) * 100).toFixed(2) : 0;

      improvements.cyclomaticComplexity = {
        baseline: baseline.cyclomaticComplexity.average,
        current: current.cyclomaticComplexity.average,
        reduction: reduction,
        reductionPercentage: reductionPercentage + '%',
        status: reduction > 0 ? 'IMPROVED' : reduction < 0 ? 'REGRESSION' : 'NO_CHANGE'
      };
    }

    // Duplicate code improvement
    if (baseline.duplicateCode && current.duplicateCode) {
      const reduction = baseline.duplicateCode.percentage - current.duplicateCode.percentage;
      const reductionPercentage = baseline.duplicateCode.percentage > 0 ? 
        ((reduction / baseline.duplicateCode.percentage) * 100).toFixed(2) : 0;

      improvements.duplicateCode = {
        baseline: baseline.duplicateCode.percentage,
        current: current.duplicateCode.percentage,
        reduction: reduction,
        reductionPercentage: reductionPercentage + '%',
        status: reduction > 0 ? 'IMPROVED' : reduction < 0 ? 'REGRESSION' : 'NO_CHANGE'
      };
    }

    return improvements;
  }

  calculateTypeScriptImprovement(baseline, current) {
    const improvements = {};

    if (baseline.compilationTime && current.compilationTime) {
      const reduction = baseline.compilationTime - current.compilationTime;
      const reductionPercentage = baseline.compilationTime > 0 ? 
        ((reduction / baseline.compilationTime) * 100).toFixed(2) : 0;

      improvements.compilation = {
        baseline: baseline.compilationTime,
        current: current.compilationTime,
        reduction: reduction,
        reductionPercentage: reductionPercentage + '%',
        status: reduction > 0 ? 'IMPROVED' : reduction < 0 ? 'REGRESSION' : 'NO_CHANGE'
      };
    }

    return improvements;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  saveProgress(comparison) {
    // Load existing progress
    let progress = { measurements: [] };
    if (fs.existsSync(this.progressFile)) {
      progress = JSON.parse(fs.readFileSync(this.progressFile, 'utf8'));
    }

    // Add new measurement
    progress.measurements.push(comparison);

    // Save updated progress
    fs.writeFileSync(this.progressFile, JSON.stringify(progress, null, 2));
    console.log(`📁 Progress saved to ${this.progressFile}`);

    return this.progressFile;
  }

  generateProgressReport(comparison) {
    console.log('\n📈 PROGRESS REPORT');
    console.log('=' .repeat(50));

    // Code duplication progress
    if (comparison.improvements.codeDuplication) {
      const cd = comparison.improvements.codeDuplication;
      console.log('\n🔍 Code Duplication:');
      console.log(`   Baseline: ${cd.baseline} lines`);
      console.log(`   Current: ${cd.current} lines`);
      console.log(`   Reduction: ${cd.reduction} lines (${cd.reductionPercentage})`);
      console.log(`   Status: ${this.getStatusIcon(cd.status)} ${cd.status}`);
    }

    // Build performance progress
    if (comparison.improvements.buildPerformance) {
      const bp = comparison.improvements.buildPerformance;
      console.log('\n⏱️  Build Performance:');
      
      if (bp.fullBuild) {
        console.log(`   Full Build: ${bp.fullBuild.baseline}ms → ${bp.fullBuild.current}ms (${bp.fullBuild.reductionPercentage})`);
        console.log(`   Status: ${this.getStatusIcon(bp.fullBuild.status)} ${bp.fullBuild.status}`);
      }
      
      if (bp.typeCheck) {
        console.log(`   TypeScript: ${bp.typeCheck.baseline}ms → ${bp.typeCheck.current}ms (${bp.typeCheck.reductionPercentage})`);
        console.log(`   Status: ${this.getStatusIcon(bp.typeCheck.status)} ${bp.typeCheck.status}`);
      }
    }

    // Bundle size progress
    if (comparison.improvements.bundleSize) {
      const bs = comparison.improvements.bundleSize;
      console.log('\n📦 Bundle Size:');
      
      if (bs.backend) {
        console.log(`   Backend: ${bs.backend.baseline} → ${bs.backend.current} (${bs.backend.reductionPercentage})`);
        console.log(`   Status: ${this.getStatusIcon(bs.backend.status)} ${bs.backend.status}`);
      }
    }

    // Maintainability progress
    if (comparison.improvements.maintainability) {
      const mt = comparison.improvements.maintainability;
      console.log('\n🔧 Maintainability:');
      
      if (mt.maintainabilityIndex) {
        console.log(`   Index: ${mt.maintainabilityIndex.baseline} → ${mt.maintainabilityIndex.current} (${mt.maintainabilityIndex.improvementPercentage})`);
        console.log(`   Status: ${this.getStatusIcon(mt.maintainabilityIndex.status)} ${mt.maintainabilityIndex.status}`);
      }
      
      if (mt.duplicateCode) {
        console.log(`   Duplicate Code: ${mt.duplicateCode.baseline}% → ${mt.duplicateCode.current}% (${mt.duplicateCode.reductionPercentage})`);
        console.log(`   Status: ${this.getStatusIcon(mt.duplicateCode.status)} ${mt.duplicateCode.status}`);
      }
    }

    // Overall assessment
    console.log('\n🎯 Overall Assessment:');
    const overallStatus = this.calculateOverallStatus(comparison.improvements);
    console.log(`   Status: ${this.getStatusIcon(overallStatus)} ${overallStatus}`);
    
    // Recommendations
    this.generateRecommendations(comparison.improvements);
  }

  getStatusIcon(status) {
    switch (status) {
      case 'IMPROVED': return '✅';
      case 'REGRESSION': return '❌';
      case 'NO_CHANGE': return '⏸️';
      default: return '❓';
    }
  }

  calculateOverallStatus(improvements) {
    const statuses = [];
    
    Object.values(improvements).forEach(category => {
      if (typeof category === 'object') {
        Object.values(category).forEach(metric => {
          if (metric.status) {
            statuses.push(metric.status);
          }
        });
      }
    });

    const improved = statuses.filter(s => s === 'IMPROVED').length;
    const regression = statuses.filter(s => s === 'REGRESSION').length;
    const noChange = statuses.filter(s => s === 'NO_CHANGE').length;

    if (improved > regression && improved > 0) {
      return 'IMPROVED';
    } else if (regression > improved) {
      return 'REGRESSION';
    } else {
      return 'NO_CHANGE';
    }
  }

  generateRecommendations(improvements) {
    console.log('\n💡 Recommendations:');
    
    const recommendations = [];

    // Check code duplication
    if (improvements.codeDuplication?.status === 'IMPROVED') {
      recommendations.push('Continue consolidating shared patterns in remaining services');
    } else if (improvements.codeDuplication?.status === 'REGRESSION') {
      recommendations.push('Review recent changes - code duplication has increased');
    }

    // Check build performance
    if (improvements.buildPerformance?.fullBuild?.status === 'REGRESSION') {
      recommendations.push('Investigate build performance regression - consider dependency optimization');
    }

    // Check maintainability
    if (improvements.maintainability?.maintainabilityIndex?.status === 'IMPROVED') {
      recommendations.push('Maintainability improving - document new patterns for team adoption');
    }

    // Check bundle size
    if (improvements.bundleSize?.backend?.status === 'REGRESSION') {
      recommendations.push('Backend bundle size increased - review dependency additions');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring metrics as consolidation progresses');
      recommendations.push('Focus on next service migration phase');
    }

    recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }

  /**
   * Monitor specific service migration
   */
  async monitorServiceMigration(serviceName) {
    console.log(`\n🔄 Monitoring ${serviceName} service migration...`);
    
    const current = await this.measureCurrentMetrics();
    const comparison = this.compareMetrics(current);
    
    // Add service-specific analysis
    comparison.serviceFocus = serviceName;
    comparison.serviceMetrics = this.analyzeServiceSpecificMetrics(serviceName, current);
    
    this.saveProgress(comparison);
    this.generateProgressReport(comparison);
    
    return comparison;
  }

  analyzeServiceSpecificMetrics(serviceName, current) {
    const serviceMetrics = {
      serviceName,
      timestamp: new Date().toISOString()
    };

    // Analyze specific service if it exists in current metrics
    if (current.codeMetrics?.serviceAnalysis?.[serviceName]) {
      const service = current.codeMetrics.serviceAnalysis[serviceName];
      serviceMetrics.lines = service.lines;
      serviceMetrics.methods = service.methods;
      serviceMetrics.errorHandling = service.errorHandling;
      serviceMetrics.validation = service.validation;
      serviceMetrics.crudOperations = service.crudOperations;
    }

    return serviceMetrics;
  }

  /**
   * Generate final consolidation report
   */
  generateFinalReport() {
    if (!fs.existsSync(this.progressFile)) {
      throw new Error('No progress data available. Run monitoring during consolidation first.');
    }

    const progress = JSON.parse(fs.readFileSync(this.progressFile, 'utf8'));
    const measurements = progress.measurements;

    if (measurements.length === 0) {
      throw new Error('No measurements available for final report.');
    }

    console.log('\n📊 FINAL CONSOLIDATION REPORT');
    console.log('=' .repeat(60));

    const baseline = measurements[0].baseline;
    const final = measurements[measurements.length - 1].current;

    console.log(`\n📅 Analysis Period: ${baseline.timestamp} → ${final.timestamp}`);
    console.log(`📏 Measurements: ${measurements.length} data points`);

    // Calculate total improvements
    const totalImprovements = this.calculateTotalImprovements(baseline, final);
    
    console.log('\n🎯 TOTAL IMPROVEMENTS:');
    console.log(`   Code Duplication: ${totalImprovements.codeDuplication.reduction} lines (${totalImprovements.codeDuplication.reductionPercentage})`);
    console.log(`   Maintainability Index: ${totalImprovements.maintainability.improvement} points (${totalImprovements.maintainability.improvementPercentage})`);
    
    if (totalImprovements.buildPerformance) {
      console.log(`   Build Time: ${totalImprovements.buildPerformance.reduction}ms (${totalImprovements.buildPerformance.reductionPercentage})`);
    }

    // Success metrics
    console.log('\n✅ SUCCESS METRICS:');
    console.log(`   Target achieved: ${totalImprovements.targetAchieved ? 'YES' : 'IN PROGRESS'}`);
    console.log(`   Quality improved: ${totalImprovements.qualityImproved ? 'YES' : 'NO'}`);
    console.log(`   Performance maintained: ${totalImprovements.performanceMaintained ? 'YES' : 'NO'}`);

    // Save final report
    const reportFile = path.join(process.cwd(), 'consolidation-final-report.json');
    fs.writeFileSync(reportFile, JSON.stringify({
      period: {
        start: baseline.timestamp,
        end: final.timestamp,
        measurements: measurements.length
      },
      improvements: totalImprovements,
      rawData: { baseline, final, measurements }
    }, null, 2));

    console.log(`\n📁 Final report saved to ${reportFile}`);
    return reportFile;
  }

  calculateTotalImprovements(baseline, final) {
    const improvements = {};

    // Code duplication
    if (baseline.codeMetrics && final.codeMetrics) {
      const reduction = baseline.codeMetrics.estimatedDuplication - final.codeMetrics.estimatedDuplication;
      const reductionPercentage = baseline.codeMetrics.estimatedDuplication > 0 ? 
        ((reduction / baseline.codeMetrics.estimatedDuplication) * 100).toFixed(2) : 0;

      improvements.codeDuplication = {
        baseline: baseline.codeMetrics.estimatedDuplication,
        final: final.codeMetrics.estimatedDuplication,
        reduction,
        reductionPercentage: reductionPercentage + '%'
      };
    }

    // Maintainability
    if (baseline.maintainabilityMetrics && final.maintainabilityMetrics) {
      const improvement = final.maintainabilityMetrics.maintainabilityIndex - baseline.maintainabilityMetrics.maintainabilityIndex;
      const improvementPercentage = baseline.maintainabilityMetrics.maintainabilityIndex > 0 ? 
        ((improvement / baseline.maintainabilityMetrics.maintainabilityIndex) * 100).toFixed(2) : 0;

      improvements.maintainability = {
        baseline: baseline.maintainabilityMetrics.maintainabilityIndex,
        final: final.maintainabilityMetrics.maintainabilityIndex,
        improvement,
        improvementPercentage: improvementPercentage + '%'
      };
    }

    // Build performance
    if (baseline.buildMetrics?.fullBuildTime && final.buildMetrics?.fullBuildTime) {
      const reduction = baseline.buildMetrics.fullBuildTime - final.buildMetrics.fullBuildTime;
      const reductionPercentage = baseline.buildMetrics.fullBuildTime > 0 ? 
        ((reduction / baseline.buildMetrics.fullBuildTime) * 100).toFixed(2) : 0;

      improvements.buildPerformance = {
        baseline: baseline.buildMetrics.fullBuildTime,
        final: final.buildMetrics.fullBuildTime,
        reduction,
        reductionPercentage: reductionPercentage + '%'
      };
    }

    // Success criteria
    improvements.targetAchieved = improvements.codeDuplication?.reduction > 500; // Target: 500+ lines reduced
    improvements.qualityImproved = improvements.maintainability?.improvement > 0;
    improvements.performanceMaintained = !improvements.buildPerformance || improvements.buildPerformance.reduction >= 0;

    return improvements;
  }

  /**
   * Run continuous monitoring
   */
  async runMonitoring() {
    console.log('🔄 Running performance monitoring...\n');
    
    const current = await this.measureCurrentMetrics();
    const comparison = this.compareMetrics(current);
    
    this.saveProgress(comparison);
    this.generateProgressReport(comparison);
    
    return comparison;
  }
}

// Store monitoring data for memory system
function storeMonitoringData(comparison) {
  const improvements = comparison.improvements;
  
  const memoryData = {
    entityType: 'performance-monitoring',
    name: 'TenantFlow Consolidation Progress',
    observations: [
      `Code duplication status: ${improvements.codeDuplication?.status || 'unknown'} - ${improvements.codeDuplication?.reductionPercentage || '0%'} reduction`,
      `Build performance: ${improvements.buildPerformance?.fullBuild?.status || 'unknown'} - ${improvements.buildPerformance?.fullBuild?.reductionPercentage || '0%'} improvement`,
      `Maintainability index: ${improvements.maintainability?.maintainabilityIndex?.status || 'unknown'} - ${improvements.maintainability?.maintainabilityIndex?.improvementPercentage || '0%'} improvement`,
      `Bundle size backend: ${improvements.bundleSize?.backend?.status || 'unknown'} - ${improvements.bundleSize?.backend?.reductionPercentage || '0%'} reduction`,
      `TypeScript compilation: ${improvements.typeScript?.compilation?.status || 'unknown'} - ${improvements.typeScript?.compilation?.reductionPercentage || '0%'} improvement`,
      `Duplicate code: ${improvements.maintainability?.duplicateCode?.status || 'unknown'} - ${improvements.maintainability?.duplicateCode?.reductionPercentage || '0%'} reduction`,
      `Monitoring timestamp: ${comparison.timestamp}`,
      `Overall status trending: ${comparison.improvements ? 'positive' : 'needs_attention'}`
    ]
  };
  
  console.log('\n💾 Storing monitoring data...');
  console.log(`Entity: ${memoryData.name}`);
  console.log(`Observations: ${memoryData.observations.length} metrics tracked`);
  
  return memoryData;
}

// CLI handling
if (require.main === module) {
  const command = process.argv[2];
  const monitor = new PerformanceMonitor();

  switch (command) {
    case 'service':
      const serviceName = process.argv[3];
      if (!serviceName) {
        console.error('Usage: node performance-monitor.js service <serviceName>');
        process.exit(1);
      }
      monitor.monitorServiceMigration(serviceName)
        .then(result => {
          const memoryData = storeMonitoringData(result);
          console.log('\n✅ Service monitoring complete!');
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Service monitoring failed:', error.message);
          process.exit(1);
        });
      break;

    case 'final':
      try {
        const reportFile = monitor.generateFinalReport();
        console.log('✅ Final report generated!');
        process.exit(0);
      } catch (error) {
        console.error('❌ Final report generation failed:', error.message);
        process.exit(1);
      }
      break;

    default:
      monitor.runMonitoring()
        .then(result => {
          const memoryData = storeMonitoringData(result);
          console.log('\n✅ Performance monitoring complete!');
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Monitoring failed:', error.message);
          process.exit(1);
        });
  }
}

module.exports = { PerformanceMonitor };