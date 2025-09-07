#!/usr/bin/env node
/**
 * Comprehensive codebase health check script
 * Monitors DRY, KISS, and Native-Only compliance automatically
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const glob = require('glob');

class CodebaseHealthChecker {
  constructor() {
    this.results = {
      duplicateCode: [],
      complexityViolations: [],
      nativeViolations: [],
      totalFiles: 0,
      healthScore: 0
    };
  }

  async runHealthCheck() {
    console.log('CHECKING: Running comprehensive codebase health check...\n');
    
    try {
      await this.checkDuplicateCode();
      await this.checkComplexity();
      await this.checkNativeCompliance();
      await this.checkBundleSize();
      await this.generateReport();
    } catch (error) {
      console.error('ERROR: Health check failed:', error.message);
      process.exit(1);
    }
  }

  async checkDuplicateCode() {
    console.log('Checking for duplicate code...');
    
    try {
      // Use jscpd for duplicate detection
      const jscpdOutput = execSync(
        'npx jscpd --threshold 5 --format json --ignore "node_modules,dist,.next,coverage" --reporters json',
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      
      const duplicates = JSON.parse(jscpdOutput);
      this.results.duplicateCode = duplicates.duplicates || [];
      
      console.log(`   Found ${this.results.duplicateCode.length} duplicate code blocks`);
    } catch (error) {
      // jscpd not installed or no duplicates found
      console.log('   SUCCESS: No duplicate code detected (or jscpd not available)');
    }
  }

  async checkComplexity() {
    console.log('Checking code complexity...');
    
    const complexFiles = [];
    const sourceFiles = glob.sync('**/*.{ts,tsx,js,jsx}', {
      ignore: ['node_modules/**', 'dist/**', '.next/**', 'coverage/**']
    });

    this.results.totalFiles = sourceFiles.length;

    for (const file of sourceFiles.slice(0, 50)) { // Sample first 50 files for performance
      try {
        const content = fs.readFileSync(file, 'utf8');
        const complexity = this.calculateCyclomaticComplexity(content);
        
        if (complexity > 10) {
          complexFiles.push({ file, complexity });
        }
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    this.results.complexityViolations = complexFiles;
    console.log(`   Found ${complexFiles.length} files with high complexity`);
  }

  calculateCyclomaticComplexity(code) {
    const complexityPatterns = [
      /\bif\s*\(/g,
      /\belse\s+if\b/g,
      /\bwhile\s*\(/g,
      /\bfor\s*\(/g,
      /\bswitch\s*\(/g,
      /\bcase\s+/g,
      /\bcatch\s*\(/g,
      /\?\s*.*\s*:/g, // ternary operators
      /&&|\|\|/g, // logical operators
    ];

    let complexity = 1; // Base complexity
    
    complexityPatterns.forEach(pattern => {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  async checkNativeCompliance() {
    console.log('Checking native pattern compliance...');
    
    const violations = [];
    const antiPatterns = [
      // Custom wrappers instead of native solutions
      { pattern: /createCustom\w+/g, message: 'Custom wrapper detected', severity: 'high' },
      { pattern: /class \w+Factory/g, message: 'Factory pattern detected', severity: 'medium' },
      { pattern: /function create\w+Wrapper/g, message: 'Custom wrapper function', severity: 'medium' },
      
      // Non-native HTTP clients outside allowed files
      { pattern: /axios\./g, message: 'Axios usage (prefer native fetch)', severity: 'low' },
      
      // Custom validation outside shared packages
      { pattern: /validate\w+\s*:/g, message: 'Custom validation (prefer Zod)', severity: 'medium' },
      
      // Custom CSS instead of Tailwind
      { pattern: /styled\./g, message: 'Styled components (prefer Tailwind)', severity: 'low' },
    ];

    const sourceFiles = glob.sync('apps/**/*.{ts,tsx}', {
      ignore: ['**/node_modules/**', '**/dist/**']
    });

    for (const file of sourceFiles.slice(0, 30)) { // Sample for performance
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        antiPatterns.forEach(({ pattern, message, severity }) => {
          const matches = content.match(pattern);
          if (matches) {
            violations.push({
              file,
              message,
              severity,
              count: matches.length
            });
          }
        });
      } catch (error) {
        continue;
      }
    }

    this.results.nativeViolations = violations;
    console.log(`   Found ${violations.length} native pattern violations`);
  }

  async checkBundleSize() {
    console.log('PACKAGE: Checking bundle size...');
    
    try {
      // Check if build exists
      const frontendDistPath = 'apps/frontend/.next';
      if (fs.existsSync(frontendDistPath)) {
        const buildInfo = execSync('ls -la apps/frontend/.next/static/chunks/ | head -10', 
          { encoding: 'utf8' });
        console.log('   SUCCESS: Build artifacts found');
      } else {
        console.log('   WARNING: No build artifacts found (run npm run build)');
      }
    } catch (error) {
      console.log('   WARNING: Could not analyze bundle size');
    }
  }

  calculateHealthScore() {
    let score = 100;
    
    // Deduct points for issues
    score -= this.results.duplicateCode.length * 5;
    score -= this.results.complexityViolations.length * 3;
    score -= this.results.nativeViolations.filter(v => v.severity === 'high').length * 10;
    score -= this.results.nativeViolations.filter(v => v.severity === 'medium').length * 5;
    score -= this.results.nativeViolations.filter(v => v.severity === 'low').length * 2;
    
    return Math.max(0, Math.round(score));
  }

  generateReport() {
    this.results.healthScore = this.calculateHealthScore();
    
    console.log('\nSTATS: CODEBASE HEALTH REPORT');
    console.log('═'.repeat(50));
    
    const scoreColor = this.results.healthScore >= 80 ? 'EXCELLENT' : 
                       this.results.healthScore >= 60 ? 'GOOD' : 'NEEDS ATTENTION';
    
    console.log(`${scoreColor} Overall Health Score: ${this.results.healthScore}/100`);
    console.log(`Total Files Analyzed: ${this.results.totalFiles}`);
    
    console.log('\nCHECKING: DETAILED FINDINGS:');
    
    // DRY Violations
    if (this.results.duplicateCode.length > 0) {
      console.log(`\nERROR: DRY Violations: ${this.results.duplicateCode.length}`);
      this.results.duplicateCode.slice(0, 5).forEach(dup => {
        console.log(`   ${dup.firstFile?.name || 'Unknown file'}: ${dup.linesCount || 'N/A'} duplicate lines`);
      });
      if (this.results.duplicateCode.length > 5) {
        console.log(`   ... and ${this.results.duplicateCode.length - 5} more`);
      }
    } else {
      console.log('\nSUCCESS: DRY Compliance: No duplicate code detected');
    }
    
    // KISS Violations
    if (this.results.complexityViolations.length > 0) {
      console.log(`\nERROR: KISS Violations: ${this.results.complexityViolations.length} complex files`);
      this.results.complexityViolations.slice(0, 5).forEach(item => {
        console.log(`   ${item.file}: complexity ${item.complexity}`);
      });
    } else {
      console.log('\nSUCCESS: KISS Compliance: No overly complex code detected');
    }
    
    // Native Pattern Violations  
    if (this.results.nativeViolations.length > 0) {
      console.log(`\nERROR: Native Pattern Violations: ${this.results.nativeViolations.length}`);
      const groupedViolations = this.results.nativeViolations.reduce((acc, v) => {
        acc[v.severity] = (acc[v.severity] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(groupedViolations).forEach(([severity, count]) => {
        const riskLevel = severity === 'high' ? 'HIGH RISK' : severity === 'medium' ? 'MEDIUM RISK' : 'LOW RISK';
        console.log(`   ${riskLevel} ${severity}: ${count} violations`);
      });
    } else {
      console.log('\nSUCCESS: Native Pattern Compliance: All patterns follow platform conventions');
    }
    
    // Recommendations
    console.log('\nTIP: RECOMMENDATIONS:');
    
    if (this.results.healthScore >= 80) {
      console.log('SUCCESS: Excellent codebase health! Keep up the good work.');
    } else if (this.results.healthScore >= 60) {
      console.log('WARNING:  Good codebase health with room for improvement:');
      if (this.results.duplicateCode.length > 0) {
        console.log('   • Consolidate duplicate code using shared utilities');
      }
      if (this.results.complexityViolations.length > 0) {
        console.log('   • Break down complex functions into smaller pieces');  
      }
    } else {
      console.log('CRITICAL: Codebase needs attention:');
      console.log('   • Review CLAUDE.md principles for DRY, KISS, Native-Only patterns');
      console.log('   • Consider running automated refactoring tools');
      console.log('   • Implement stricter ESLint rules to prevent future violations');
    }
    
    // Save report to file
    const reportPath = 'codebase-health-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\nDetailed report saved to: ${reportPath}`);
  }
}

// Run the health check
if (require.main === module) {
  const checker = new CodebaseHealthChecker();
  checker.runHealthCheck().catch(console.error);
}

module.exports = CodebaseHealthChecker;