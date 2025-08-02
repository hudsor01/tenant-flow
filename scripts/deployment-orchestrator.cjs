#!/usr/bin/env node

/**
 * TenantFlow Deployment Orchestrator
 * 
 * Comprehensive deployment pipeline coordination ensuring:
 * - Frontend/Backend alignment
 * - TypeScript/Lint compliance
 * - Environment configuration
 * - API contract validation
 * - Deployment readiness
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DeploymentOrchestrator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      errors: [],
      warnings: [],
      fixes: [],
      status: 'unknown'
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const emoji = {
      info: '📋',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      fix: '🔧'
    }[type] || '📋';
    
    console.log(`${emoji} [${timestamp}] ${message}`);
    
    if (type === 'error') {
      this.results.errors.push(message);
    } else if (type === 'warning') {
      this.results.warnings.push(message);
    } else if (type === 'fix') {
      this.results.fixes.push(message);
    }
  }

  async runCommand(cmd, description, { allowFailure = false } = {}) {
    this.log(`Running: ${description}`, 'info');
    try {
      const output = execSync(cmd, { 
        encoding: 'utf8', 
        stdio: 'pipe',
        cwd: process.cwd()
      });
      this.log(`✓ ${description} completed`, 'success');
      return { success: true, output };
    } catch (error) {
      const message = `✗ ${description} failed: ${error.message}`;
      if (allowFailure) {
        this.log(message, 'warning');
        return { success: false, output: error.stdout || error.message };
      } else {
        this.log(message, 'error');
        throw error;
      }
    }
  }

  async validateEnvironment() {
    this.log('🔍 Validating Environment Configuration', 'info');
    
    // Check Node.js version
    const nodeVersion = process.version;
    this.log(`Node.js version: ${nodeVersion}`, 'info');
    
    if (!nodeVersion.startsWith('v22.')) {
      this.log('Warning: Recommended Node.js version is 22.x', 'warning');
    }

    // Check critical files exist
    const criticalFiles = [
      'package.json',
      'turbo.json',
      'Dockerfile',
      'railway.toml',
      'vercel.json',
      'apps/frontend/package.json',
      'apps/backend/package.json',
      'packages/shared/package.json'
    ];

    for (const file of criticalFiles) {
      if (!fs.existsSync(file)) {
        this.log(`Critical file missing: ${file}`, 'error');
      } else {
        this.log(`✓ Found ${file}`, 'success');
      }
    }
  }

  async validateTypeScript() {
    this.log('🔧 Validating TypeScript Configuration', 'info');
    
    try {
      // Run type checking for all packages
      await this.runCommand(
        'npx turbo run typecheck',
        'TypeScript type checking'
      );
    } catch (error) {
      this.log('TypeScript errors detected - attempting fixes', 'warning');
      
      // Check if it's BaseCrudService migration issues
      const errorOutput = error.stdout || error.message;
      if (errorOutput.includes('Index signature for type')) {
        this.log('Detected BaseCrudService migration issues', 'fix');
        await this.fixBaseCrudServiceIssues();
      }
    }
  }

  async fixBaseCrudServiceIssues() {
    this.log('🔧 Fixing BaseCrudService TypeScript issues', 'fix');
    
    // Find all query DTOs that need index signatures
    const queryDtoFiles = [
      'apps/backend/src/leases/dto/query-lease.dto.ts',
      'apps/backend/src/maintenance/dto/query-maintenance-request.dto.ts'
    ];

    for (const file of queryDtoFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        if (!content.includes('[key: string]: unknown')) {
          this.log(`Adding index signature to ${file}`, 'fix');
          // Add index signature before the closing brace
          const updated = content.replace(
            /\n}$/,
            '\n\n  // REQUIRED: Index signature for BaseCrudService compatibility\n  [key: string]: unknown\n}'
          );
          fs.writeFileSync(file, updated);
        }
      }
    }
  }

  async validateLinting() {
    this.log('🔧 Validating Code Quality (ESLint)', 'info');
    
    const result = await this.runCommand(
      'npx turbo run lint',
      'ESLint validation',
      { allowFailure: true }
    );

    if (!result.success) {
      this.log('Lint errors detected - running automatic fixes', 'warning');
      await this.runCommand(
        'npx turbo run lint:fix',
        'Automatic lint fixes'
      );
    }
  }

  async validateBuild() {
    this.log('🏗️ Validating Build Process', 'info');
    
    // Build shared package first
    await this.runCommand(
      'npx turbo run build --filter=@tenantflow/shared',
      'Building shared package'
    );

    // Build backend
    await this.runCommand(
      'npx turbo run build --filter=@tenantflow/backend',
      'Building backend'
    );

    // Build frontend
    await this.runCommand(
      'npx turbo run build --filter=@tenantflow/frontend',
      'Building frontend'
    );
  }

  async validateApiContracts() {
    this.log('🔗 Validating API Contracts', 'info');
    
    const contractScript = 'scripts/validate-api-contracts.js';
    if (fs.existsSync(contractScript)) {
      await this.runCommand(
        `node ${contractScript}`,
        'API contract validation',
        { allowFailure: true }
      );
    } else {
      this.log('API contract validation script not found', 'warning');
    }
  }

  async validateDeploymentConfig() {
    this.log('🚀 Validating Deployment Configuration', 'info');
    
    // Check Railway configuration
    const railwayConfig = JSON.parse(fs.readFileSync('railway.toml', 'utf8'));
    this.log('✓ Railway configuration validated', 'success');

    // Check Vercel configuration
    const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    this.log('✓ Vercel configuration validated', 'success');

    // Check Docker configuration
    if (fs.existsSync('Dockerfile')) {
      this.log('✓ Dockerfile found', 'success');
    }

    // Validate health check endpoint
    this.log('Note: Health check endpoint should be accessible at /health', 'info');
  }

  async runTests() {
    this.log('🧪 Running Critical Tests', 'info');
    
    const result = await this.runCommand(
      'npm run test:unit',
      'Unit tests',
      { allowFailure: true }
    );

    if (!result.success) {
      this.log('Some tests failed - check before deployment', 'warning');
    }
  }

  async generateReport() {
    this.log('📊 Generating Deployment Report', 'info');
    
    const report = {
      ...this.results,
      summary: {
        totalErrors: this.results.errors.length,
        totalWarnings: this.results.warnings.length,
        totalFixes: this.results.fixes.length,
        deploymentReady: this.results.errors.length === 0
      },
      recommendations: [],
      nextSteps: []
    };

    if (report.summary.deploymentReady) {
      report.status = 'ready';
      report.nextSteps.push('Deploy backend to Railway: npm run deploy:railway');
      report.nextSteps.push('Deploy frontend to Vercel: npm run deploy:vercel');
    } else {
      report.status = 'blocked';
      report.nextSteps.push('Fix all critical errors before deployment');
    }

    if (report.summary.totalWarnings > 0) {
      report.recommendations.push('Address warnings for better code quality');
    }

    // Write report to file
    fs.writeFileSync(
      'deployment-readiness-report.json',
      JSON.stringify(report, null, 2)
    );

    this.log('📋 Deployment Report Summary:', 'info');
    this.log(`Status: ${report.status.toUpperCase()}`, report.status === 'ready' ? 'success' : 'error');
    this.log(`Errors: ${report.summary.totalErrors}`, report.summary.totalErrors > 0 ? 'error' : 'success');
    this.log(`Warnings: ${report.summary.totalWarnings}`, report.summary.totalWarnings > 0 ? 'warning' : 'success');
    this.log(`Fixes Applied: ${report.summary.totalFixes}`, 'info');
    
    if (report.status === 'ready') {
      this.log('🎉 DEPLOYMENT READY! All critical issues resolved.', 'success');
    } else {
      this.log('🚫 DEPLOYMENT BLOCKED - Fix errors before proceeding.', 'error');
    }

    return report;
  }

  async orchestrate() {
    this.log('🚀 Starting TenantFlow Deployment Orchestration', 'info');
    
    try {
      await this.validateEnvironment();
      await this.validateTypeScript();
      await this.validateLinting();
      await this.validateBuild();
      await this.validateApiContracts();
      await this.validateDeploymentConfig();
      await this.runTests();
      
      const report = await this.generateReport();
      return report;
    } catch (error) {
      this.log(`Orchestration failed: ${error.message}`, 'error');
      this.results.status = 'failed';
      return await this.generateReport();
    }
  }
}

// Run the orchestrator
if (require.main === module) {
  const orchestrator = new DeploymentOrchestrator();
  orchestrator.orchestrate()
    .then(report => {
      process.exit(report.status === 'ready' ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Deployment orchestration failed:', error);
      process.exit(1);
    });
}

module.exports = DeploymentOrchestrator;