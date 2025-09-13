#!/usr/bin/env node

/**
 * NPM Test Integration Script
 * CLAUDE.md Compliance: Native Node.js script, integrates with existing npm workflow
 * Extends package.json scripts with comprehensive testing capabilities
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ROOT = path.join(__dirname, '..');
const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'scripts');
const LOG_DIR = path.join(PROJECT_ROOT, 'test-logs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m'
};

function log(message, color = 'blue') {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

function warning(message) {
  log(`⚠ ${message}`, 'yellow');
}

// Create test logs directory
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Test runner wrapper functions
class TestRunner {
  constructor() {
    this.testRunnerPath = path.join(SCRIPTS_DIR, 'test-runner.sh');
    this.results = {
      passed: [],
      failed: [],
      warnings: []
    };
  }

  // Execute test runner script
  async runTestSuite(testType) {
    return new Promise((resolve, reject) => {
      log(`Starting ${testType} test suite...`);
      
      const process = spawn('bash', [this.testRunnerPath, testType], {
        cwd: PROJECT_ROOT,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        // Real-time output for user feedback
        if (process.env.VERBOSE || testType === 'all') {
          console.log(output.trim());
        }
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          this.results.passed.push(testType);
          success(`${testType} tests completed successfully`);
          resolve({ success: true, stdout, stderr });
        } else {
          this.results.failed.push(testType);
          error(`${testType} tests failed with exit code ${code}`);
          if (stderr) {
            console.error(stderr);
          }
          resolve({ success: false, stdout, stderr, exitCode: code });
        }
      });

      process.on('error', (err) => {
        error(`Failed to start ${testType} tests: ${err.message}`);
        reject(err);
      });
    });
  }

  // Quick validation tests
  async validateEnvironment() {
    log('Validating test environment...');
    
    try {
      // Check if test runner exists and is executable
      if (!fs.existsSync(this.testRunnerPath)) {
        throw new Error('Test runner script not found');
      }

      // Check Node.js version
      const nodeVersion = process.version;
      log(`Node.js version: ${nodeVersion}`);
      
      if (!nodeVersion.startsWith('v22') && !nodeVersion.startsWith('v20')) {
        warning('Recommended Node.js version is 22.x or 20.x');
      }

      // Check npm packages
      try {
        execSync('npm list playwright @playwright/test', { 
          cwd: path.join(PROJECT_ROOT, 'apps/frontend'),
          stdio: 'pipe' 
        });
        success('Playwright testing dependencies available');
      } catch (e) {
        warning('Playwright may need installation - run: npm install');
      }

      // Check for Doppler (optional)
      try {
        execSync('doppler --version', { stdio: 'pipe' });
        success('Doppler CLI available for environment management');
      } catch (e) {
        warning('Doppler CLI not available - using fallback environment variables');
      }

      return true;
    } catch (err) {
      error(`Environment validation failed: ${err.message}`);
      return false;
    }
  }

  // Generate test report
  generateReport() {
    const reportPath = path.join(LOG_DIR, 'test-summary.json');
    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        cwd: PROJECT_ROOT
      },
      results: this.results,
      summary: {
        totalSuites: this.results.passed.length + this.results.failed.length,
        passed: this.results.passed.length,
        failed: this.results.failed.length,
        warnings: this.results.warnings.length
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`Test report saved to: ${reportPath}`);
    
    return report;
  }

  // Print summary
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST EXECUTION SUMMARY');
    console.log('='.repeat(60));
    
    if (this.results.passed.length > 0) {
      success(`Passed (${this.results.passed.length}): ${this.results.passed.join(', ')}`);
    }
    
    if (this.results.failed.length > 0) {
      error(`Failed (${this.results.failed.length}): ${this.results.failed.join(', ')}`);
    }
    
    if (this.results.warnings.length > 0) {
      warning(`Warnings (${this.results.warnings.length}): ${this.results.warnings.join(', ')}`);
    }
    
    console.log('='.repeat(60));
    
    const report = this.generateReport();
    return report.summary.failed === 0;
  }
}

// Main execution functions
async function runQuickTests() {
  log('Running quick validation tests...');
  const runner = new TestRunner();
  
  if (!await runner.validateEnvironment()) {
    process.exit(1);
  }

  const results = await Promise.allSettled([
    runner.runTestSuite('unit'),
    runner.runTestSuite('security')
  ]);

  return runner.printSummary();
}

async function runComprehensiveTests() {
  log('Running comprehensive test suite...');
  const runner = new TestRunner();
  
  if (!await runner.validateEnvironment()) {
    process.exit(1);
  }

  // Run all tests via the test runner
  const result = await runner.runTestSuite('all');
  
  return runner.printSummary();
}

async function runSpecificTest(testType) {
  log(`Running ${testType} tests...`);
  const runner = new TestRunner();
  
  if (!await runner.validateEnvironment()) {
    process.exit(1);
  }

  const result = await runner.runTestSuite(testType);
  
  return runner.printSummary();
}

// Server status check
async function checkServerStatus() {
  log('Checking server status...');
  const runner = new TestRunner();
  
  const result = await runner.runTestSuite('--check');
  return result.success;
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  try {
    switch (command) {
      case 'quick':
        const quickSuccess = await runQuickTests();
        process.exit(quickSuccess ? 0 : 1);
        
      case 'comprehensive':
      case 'all':
        const allSuccess = await runComprehensiveTests();
        process.exit(allSuccess ? 0 : 1);
        
      case 'unit':
      case 'integration':
      case 'e2e':
      case 'performance':
      case 'accessibility':
      case 'visual':
      case 'security':
        const specificSuccess = await runSpecificTest(command);
        process.exit(specificSuccess ? 0 : 1);
        
      case 'check':
        const serverOk = await checkServerStatus();
        process.exit(serverOk ? 0 : 1);
        
      case 'validate':
        const runner = new TestRunner();
        const valid = await runner.validateEnvironment();
        process.exit(valid ? 0 : 1);
        
      case 'help':
      default:
        console.log(`
TenantFlow Dashboard Test Integration

Usage: node scripts/npm-test-integration.js <command>

Commands:
  quick           Run quick validation tests (unit + security)
  comprehensive   Run all test suites with full reporting
  all             Alias for comprehensive
  
  unit            Run unit tests only
  integration     Run integration tests only
  e2e             Run end-to-end tests only
  performance     Run performance tests only
  accessibility   Run accessibility tests only
  visual          Run visual regression tests only
  security        Run security validation tests only
  
  check           Check server status
  validate        Validate test environment
  help            Show this help message

Examples:
  npm run test:dashboard              # Quick tests
  npm run test:dashboard:all          # All tests  
  npm run test:dashboard:e2e          # E2E only
  node scripts/npm-test-integration.js check
        `);
        process.exit(0);
    }
  } catch (err) {
    error(`Test execution failed: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = {
  TestRunner,
  runQuickTests,
  runComprehensiveTests,
  runSpecificTest,
  checkServerStatus
};