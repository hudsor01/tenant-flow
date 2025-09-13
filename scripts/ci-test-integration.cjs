#!/usr/bin/env node

/**
 * CI/CD Test Integration Script
 * CLAUDE.md Compliance: Native Node.js, production-ready CI integration
 * Optimized for GitHub Actions, Railway, Vercel, and other CI environments
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const process = require('process');

// Configuration
const PROJECT_ROOT = path.join(__dirname, '..');
const LOG_DIR = path.join(PROJECT_ROOT, 'test-logs');
const CI_REPORT_DIR = path.join(PROJECT_ROOT, 'ci-reports');

// Detect CI environment
const CI_ENVIRONMENTS = {
  GITHUB_ACTIONS: process.env.GITHUB_ACTIONS === 'true',
  VERCEL: process.env.VERCEL === '1',
  RAILWAY: process.env.RAILWAY_ENVIRONMENT,
  NETLIFY: process.env.NETLIFY === 'true',
  GENERIC_CI: process.env.CI === 'true'
};

const IS_CI = Object.values(CI_ENVIRONMENTS).some(Boolean);

// CI-optimized logging
function ciLog(message, level = 'info') {
  const timestamp = new Date().toISOString();
  
  if (CI_ENVIRONMENTS.GITHUB_ACTIONS) {
    // GitHub Actions format
    switch (level) {
      case 'error':
        console.log(`::error::${message}`);
        break;
      case 'warning':
        console.log(`::warning::${message}`);
        break;
      case 'notice':
        console.log(`::notice::${message}`);
        break;
      default:
        console.log(`[${timestamp}] ${message}`);
    }
  } else {
    // Standard CI format
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  }
}

function ciGroup(name, fn) {
  if (CI_ENVIRONMENTS.GITHUB_ACTIONS) {
    console.log(`::group::${name}`);
  } else {
    console.log(`\n--- ${name} ---`);
  }
  
  const result = fn();
  
  if (CI_ENVIRONMENTS.GITHUB_ACTIONS) {
    console.log('::endgroup::');
  }
  
  return result;
}

// Create CI directories
function setupCIDirectories() {
  [LOG_DIR, CI_REPORT_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// CI Environment Detection and Setup
class CITestRunner {
  constructor() {
    this.environment = this.detectEnvironment();
    this.config = this.getCIConfig();
    this.results = {
      passed: [],
      failed: [],
      skipped: [],
      warnings: []
    };
    
    setupCIDirectories();
  }

  detectEnvironment() {
    if (CI_ENVIRONMENTS.GITHUB_ACTIONS) return 'github';
    if (CI_ENVIRONMENTS.VERCEL) return 'vercel';
    if (CI_ENVIRONMENTS.RAILWAY) return 'railway';
    if (CI_ENVIRONMENTS.NETLIFY) return 'netlify';
    if (CI_ENVIRONMENTS.GENERIC_CI) return 'generic';
    return 'local';
  }

  getCIConfig() {
    const baseConfig = {
      timeout: 300000, // 5 minutes
      retries: 1,
      parallel: false,
      headless: true,
      reportFormat: 'json'
    };

    switch (this.environment) {
      case 'github':
        return {
          ...baseConfig,
          parallel: true,
          timeout: 600000, // 10 minutes for GitHub Actions
          reportFormat: 'github'
        };
        
      case 'vercel':
        return {
          ...baseConfig,
          timeout: 180000, // 3 minutes for Vercel builds
          skipE2E: true // Skip E2E tests on Vercel build
        };
        
      case 'railway':
        return {
          ...baseConfig,
          timeout: 450000, // 7.5 minutes for Railway
          parallel: true
        };
        
      default:
        return baseConfig;
    }
  }

  // Environment-specific setup
  async setupEnvironment() {
    ciLog(`Setting up CI environment: ${this.environment}`, 'info');
    
    try {
      // Install Playwright browsers if needed
      if (!this.config.skipE2E) {
        ciLog('Installing Playwright browsers for CI...', 'info');
        execSync('npx playwright install --with-deps chromium', {
          cwd: path.join(PROJECT_ROOT, 'apps/frontend'),
          stdio: IS_CI ? 'pipe' : 'inherit',
          timeout: 120000 // 2 minutes timeout
        });
      }

      // Set CI environment variables
      process.env.CI = 'true';
      process.env.NODE_ENV = 'development';
      process.env.ENABLE_MOCK_AUTH = 'true';
      process.env.PLAYWRIGHT_HEADLESS = 'true';
      
      // Disable telemetry in CI
      process.env.NEXT_TELEMETRY_DISABLED = '1';
      process.env.DO_NOT_TRACK = '1';
      
      ciLog('CI environment setup completed', 'info');
      return true;
      
    } catch (error) {
      ciLog(`CI environment setup failed: ${error.message}`, 'error');
      return false;
    }
  }

  // Run CI-optimized test suite
  async runCITests() {
    const testSuites = this.getTestSuites();
    
    for (const suite of testSuites) {
      await ciGroup(`Running ${suite.name} tests`, async () => {
        try {
          const result = await this.runTestSuite(suite);
          
          if (result.success) {
            this.results.passed.push(suite.name);
            ciLog(`✓ ${suite.name} tests passed`, 'info');
          } else {
            this.results.failed.push(suite.name);
            ciLog(`✗ ${suite.name} tests failed`, 'error');
          }
          
        } catch (error) {
          this.results.failed.push(suite.name);
          ciLog(`✗ ${suite.name} tests error: ${error.message}`, 'error');
        }
      });
    }
    
    return this.generateCIReport();
  }

  getTestSuites() {
    const allSuites = [
      { name: 'unit', required: true, timeout: 60000 },
      { name: 'integration', required: true, timeout: 120000 },
      { name: 'e2e', required: !this.config.skipE2E, timeout: 240000 },
      { name: 'security', required: true, timeout: 30000 },
      { name: 'performance', required: false, timeout: 180000 },
      { name: 'accessibility', required: false, timeout: 90000 }
    ];

    return allSuites.filter(suite => {
      if (!suite.required && this.environment === 'vercel') {
        this.results.skipped.push(suite.name);
        return false;
      }
      return true;
    });
  }

  async runTestSuite(suite) {
    return new Promise((resolve) => {
      const testCommand = path.join(PROJECT_ROOT, 'scripts/test-runner.sh');
      const args = [testCommand, suite.name];
      
      ciLog(`Starting ${suite.name} test suite...`, 'info');
      
      const testProcess = spawn('bash', args, {
        cwd: PROJECT_ROOT,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: suite.timeout
      });

      let stdout = '';
      let stderr = '';
      
      testProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        if (!IS_CI) {
          process.stdout.write(data);
        }
      });

      testProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        if (!IS_CI) {
          process.stderr.write(data);
        }
      });

      testProcess.on('close', (code) => {
        // Save test output
        const logPath = path.join(LOG_DIR, `ci-${suite.name}.log`);
        fs.writeFileSync(logPath, stdout + '\n' + stderr);
        
        resolve({
          success: code === 0,
          stdout,
          stderr,
          exitCode: code,
          logPath
        });
      });

      testProcess.on('error', (error) => {
        ciLog(`Test process error: ${error.message}`, 'error');
        resolve({
          success: false,
          error: error.message
        });
      });
    });
  }

  generateCIReport() {
    const report = {
      timestamp: new Date().toISOString(),
      environment: this.environment,
      ci: IS_CI,
      config: this.config,
      results: this.results,
      summary: {
        total: this.results.passed.length + this.results.failed.length + this.results.skipped.length,
        passed: this.results.passed.length,
        failed: this.results.failed.length,
        skipped: this.results.skipped.length,
        warnings: this.results.warnings.length,
        success: this.results.failed.length === 0
      },
      artifacts: {
        logDirectory: LOG_DIR,
        reportDirectory: CI_REPORT_DIR
      }
    };

    // Save JSON report
    const reportPath = path.join(CI_REPORT_DIR, 'test-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate CI-specific outputs
    this.generateCISpecificOutputs(report);
    
    return report;
  }

  generateCISpecificOutputs(report) {
    switch (this.environment) {
      case 'github':
        this.generateGitHubOutputs(report);
        break;
        
      case 'vercel':
        this.generateVercelOutputs(report);
        break;
        
      default:
        this.generateGenericOutputs(report);
    }
  }

  generateGitHubOutputs(report) {
    // GitHub Actions step summary
    const summaryPath = path.join(CI_REPORT_DIR, 'github-summary.md');
    const summary = `
# Test Results Summary

## Overview
- **Total Tests**: ${report.summary.total}
- **Passed**: ${report.summary.passed} ✅
- **Failed**: ${report.summary.failed} ❌
- **Skipped**: ${report.summary.skipped} ⏭️

## Results by Suite
${report.results.passed.map(suite => `- ✅ **${suite}**: Passed`).join('\n')}
${report.results.failed.map(suite => `- ❌ **${suite}**: Failed`).join('\n')}
${report.results.skipped.map(suite => `- ⏭️ **${suite}**: Skipped`).join('\n')}

## Environment
- **CI Environment**: ${report.environment}
- **Node Version**: ${process.version}
- **Timestamp**: ${report.timestamp}

${report.summary.success ? '🎉 All tests passed!' : '⚠️ Some tests failed - check logs for details'}
    `;
    
    fs.writeFileSync(summaryPath, summary);
    
    if (process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
    }
  }

  generateVercelOutputs(report) {
    // Vercel build summary
    const buildSummary = {
      name: 'TenantFlow Dashboard Tests',
      conclusion: report.summary.success ? 'success' : 'failure',
      output: {
        title: `Tests: ${report.summary.passed}/${report.summary.total} passed`,
        summary: `${report.summary.failed} failed, ${report.summary.skipped} skipped`
      }
    };
    
    fs.writeFileSync(
      path.join(CI_REPORT_DIR, 'vercel-summary.json'),
      JSON.stringify(buildSummary, null, 2)
    );
  }

  generateGenericOutputs(report) {
    // Generic CI summary
    const summary = `
CI Test Results
===============

Environment: ${report.environment}
Timestamp: ${report.timestamp}

Summary:
- Total: ${report.summary.total}
- Passed: ${report.summary.passed}
- Failed: ${report.summary.failed}
- Skipped: ${report.summary.skipped}

Status: ${report.summary.success ? 'SUCCESS' : 'FAILURE'}
    `;
    
    fs.writeFileSync(path.join(CI_REPORT_DIR, 'ci-summary.txt'), summary);
  }

  printCISummary(report) {
    ciLog('\n' + '='.repeat(60), 'info');
    ciLog('CI TEST EXECUTION SUMMARY', 'info');
    ciLog('='.repeat(60), 'info');
    
    ciLog(`Environment: ${report.environment}`, 'info');
    ciLog(`Total Suites: ${report.summary.total}`, 'info');
    
    if (report.summary.passed > 0) {
      ciLog(`Passed: ${report.summary.passed} - ${report.results.passed.join(', ')}`, 'info');
    }
    
    if (report.summary.failed > 0) {
      ciLog(`Failed: ${report.summary.failed} - ${report.results.failed.join(', ')}`, 'error');
    }
    
    if (report.summary.skipped > 0) {
      ciLog(`Skipped: ${report.summary.skipped} - ${report.results.skipped.join(', ')}`, 'warning');
    }
    
    ciLog('='.repeat(60), 'info');
    
    if (report.summary.success) {
      ciLog('🎉 ALL TESTS PASSED!', 'info');
    } else {
      ciLog('⚠️ SOME TESTS FAILED', 'error');
      ciLog(`Check logs in: ${LOG_DIR}`, 'info');
    }
    
    ciLog(`Reports saved to: ${CI_REPORT_DIR}`, 'info');
  }
}

// Main CI execution
async function runCITests() {
  const runner = new CITestRunner();
  
  ciLog('Starting CI test execution...', 'info');
  ciLog(`CI Environment: ${runner.environment}`, 'info');
  
  try {
    // Setup environment
    const setupSuccess = await runner.setupEnvironment();
    if (!setupSuccess) {
      process.exit(1);
    }
    
    // Run tests
    const report = await runner.runCITests();
    
    // Print summary
    runner.printCISummary(report);
    
    // Exit with appropriate code
    process.exit(report.summary.success ? 0 : 1);
    
  } catch (error) {
    ciLog(`CI test execution failed: ${error.message}`, 'error');
    console.error(error.stack);
    process.exit(1);
  }
}

// CLI handling
if (require.main === module) {
  const command = process.argv[2] || 'run';
  
  switch (command) {
    case 'run':
      runCITests();
      break;
      
    case 'check':
      const runner = new CITestRunner();
      ciLog(`CI Environment: ${runner.environment}`, 'info');
      ciLog(`Config: ${JSON.stringify(runner.config, null, 2)}`, 'info');
      break;
      
    default:
      console.log(`
TenantFlow CI Test Integration

Usage: node scripts/ci-test-integration.js [command]

Commands:
  run     Run CI-optimized test suite (default)
  check   Check CI environment and configuration

This script is optimized for:
- GitHub Actions
- Vercel Build
- Railway Deploy  
- Netlify Build
- Generic CI environments
      `);
  }
}

module.exports = { CITestRunner, runCITests };