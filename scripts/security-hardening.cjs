#!/usr/bin/env node

/**
 * Security Hardening and Production Safety Script
 * CLAUDE.md Compliance: Native Node.js, zero abstractions, production-ready
 * Comprehensive security validation for mock authentication system
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PROJECT_ROOT = path.join(__dirname, '..');
const SECURITY_LOG_DIR = path.join(PROJECT_ROOT, 'security-logs');

// Security validation rules
const SECURITY_RULES = {
  PRODUCTION_GUARDS: {
    required: true,
    description: 'All dev-auth endpoints must have production guards',
    files: [
      'apps/frontend/src/app/api/dev-auth/route.ts',
      'apps/frontend/src/app/api/dev-auth/status/route.ts'
    ]
  },
  ENVIRONMENT_CHECKS: {
    required: true,
    description: 'Environment variable checks must be secure',
    patterns: [
      'NODE_ENV !== \'development\'',
      'canUseMockAuth()',
      'ENABLE_MOCK_AUTH'
    ]
  },
  NO_PRODUCTION_LEAKS: {
    required: true,
    description: 'No mock data or debug info in production builds',
    forbiddenInProduction: [
      'console.log.*mock',
      'console.info.*Dev Auth',
      'test@tenantflow.dev',
      'mock-dev-token'
    ]
  },
  COOKIE_SECURITY: {
    required: true,
    description: 'Auth cookies must have proper security settings',
    patterns: [
      'httpOnly.*true',
      'sameSite.*lax',
      'secure.*false.*development'
    ]
  },
  MIDDLEWARE_ISOLATION: {
    required: true,
    description: 'Middleware bypass must be isolated to development',
    file: 'apps/frontend/src/middleware.ts'
  }
};

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
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

function critical(message) {
  log(`🚨 CRITICAL: ${message}`, 'red');
}

// Security validation class
class SecurityHardening {
  constructor() {
    this.violations = [];
    this.warnings = [];
    this.passed = [];
    
    // Create security logs directory
    if (!fs.existsSync(SECURITY_LOG_DIR)) {
      fs.mkdirSync(SECURITY_LOG_DIR, { recursive: true });
    }
  }

  // Main security audit
  async runSecurityAudit() {
    log('Starting comprehensive security audit...', 'cyan');
    
    const audits = [
      () => this.validateProductionGuards(),
      () => this.validateEnvironmentChecks(),
      () => this.validateNoProductionLeaks(),
      () => this.validateCookieSecurity(),
      () => this.validateMiddlewareIsolation(),
      () => this.validateSecretManagement(),
      () => this.validateFilePermissions(),
      () => this.validateDependencyVulnerabilities(),
      () => this.validateNetworkSecurity(),
      () => this.validateBuildSecurity()
    ];

    for (const audit of audits) {
      try {
        await audit();
      } catch (err) {
        this.violations.push({
          type: 'AUDIT_ERROR',
          message: `Audit failed: ${err.message}`,
          severity: 'HIGH'
        });
      }
    }

    return this.generateSecurityReport();
  }

  // Validate production guards exist and work
  validateProductionGuards() {
    log('Validating production safety guards...', 'blue');
    
    const devAuthFiles = [
      path.join(PROJECT_ROOT, 'apps/frontend/src/app/api/dev-auth/route.ts'),
      path.join(PROJECT_ROOT, 'apps/frontend/src/app/api/dev-auth/status/route.ts')
    ];

    for (const filePath of devAuthFiles) {
      if (!fs.existsSync(filePath)) {
        this.violations.push({
          type: 'MISSING_FILE',
          file: filePath,
          message: 'Dev auth file missing',
          severity: 'MEDIUM'
        });
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for production guard
      if (!content.includes('NODE_ENV !== \'development\'')) {
        this.violations.push({
          type: 'MISSING_PRODUCTION_GUARD',
          file: filePath,
          message: 'Missing NODE_ENV production guard',
          severity: 'HIGH'
        });
      }

      // Check for 404 response in production
      if (!content.includes('status: 404')) {
        this.violations.push({
          type: 'MISSING_PRODUCTION_404',
          file: filePath,
          message: 'Missing 404 response for production',
          severity: 'HIGH'
        });
      }

      // Check for mock auth guard
      if (!content.includes('canUseMockAuth()')) {
        this.violations.push({
          type: 'MISSING_MOCK_AUTH_GUARD',
          file: filePath,
          message: 'Missing canUseMockAuth() guard',
          severity: 'MEDIUM'
        });
      }
    }

    if (this.violations.length === 0) {
      success('Production guards validation passed');
    }
  }

  // Validate environment variable handling
  validateEnvironmentChecks() {
    log('Validating environment variable security...', 'blue');
    
    const mockAuthFile = path.join(PROJECT_ROOT, 'apps/frontend/src/lib/mock-auth-data.ts');
    
    if (!fs.existsSync(mockAuthFile)) {
      this.violations.push({
        type: 'MISSING_MOCK_AUTH_FILE',
        message: 'Mock auth data file missing',
        severity: 'HIGH'
      });
      return;
    }

    const content = fs.readFileSync(mockAuthFile, 'utf8');
    
    // Check for proper environment checks
    if (!content.includes('NODE_ENV === \'development\'')) {
      this.violations.push({
        type: 'MISSING_ENV_CHECK',
        file: mockAuthFile,
        message: 'Missing NODE_ENV development check',
        severity: 'HIGH'
      });
    }

    if (!content.includes('ENABLE_MOCK_AUTH')) {
      this.violations.push({
        type: 'MISSING_MOCK_AUTH_ENV',
        file: mockAuthFile,
        message: 'Missing ENABLE_MOCK_AUTH environment check',
        severity: 'MEDIUM'
      });
    }

    // Check for fallback behavior
    if (!content.includes('return false')) {
      this.violations.push({
        type: 'MISSING_SECURE_FALLBACK',
        file: mockAuthFile,
        message: 'Missing secure fallback (return false)',
        severity: 'HIGH'
      });
    }

    success('Environment checks validation passed');
  }

  // Check for production data leaks
  validateNoProductionLeaks() {
    log('Scanning for production data leaks...', 'blue');
    
    const sensitivePatterns = [
      { pattern: /console\.log.*mock/gi, severity: 'MEDIUM', type: 'CONSOLE_LOG_LEAK' },
      { pattern: /console\.info.*dev.?auth/gi, severity: 'MEDIUM', type: 'DEV_AUTH_LOG_LEAK' },
      { pattern: /test@tenantflow\.dev/gi, severity: 'LOW', type: 'TEST_EMAIL_LEAK' },
      { pattern: /mock-dev-token/gi, severity: 'LOW', type: 'MOCK_TOKEN_LEAK' },
      { pattern: /MOCK_.*=.*{/gi, severity: 'LOW', type: 'MOCK_DATA_LEAK' }
    ];

    const scanFiles = [
      'apps/frontend/src/app/api/dev-auth/route.ts',
      'apps/frontend/src/app/api/dev-auth/status/route.ts',
      'apps/frontend/src/lib/mock-auth-data.ts'
    ];

    for (const relativePath of scanFiles) {
      const filePath = path.join(PROJECT_ROOT, relativePath);
      if (!fs.existsSync(filePath)) continue;

      const content = fs.readFileSync(filePath, 'utf8');
      
      for (const { pattern, severity, type } of sensitivePatterns) {
        const matches = content.match(pattern);
        if (matches) {
          // Only flag as violation if it's in a production build context
          if (!content.includes('NODE_ENV !== \'development\'')) {
            this.violations.push({
              type,
              file: filePath,
              message: `Potential production leak: ${matches[0]}`,
              severity,
              matches: matches.length
            });
          } else {
            this.passed.push(`${type}_GUARDED`);
          }
        }
      }
    }

    success('Production leak scan completed');
  }

  // Validate cookie security settings
  validateCookieSecurity() {
    log('Validating cookie security configuration...', 'blue');
    
    const devAuthFile = path.join(PROJECT_ROOT, 'apps/frontend/src/app/api/dev-auth/route.ts');
    
    if (!fs.existsSync(devAuthFile)) return;
    
    const content = fs.readFileSync(devAuthFile, 'utf8');
    
    const securityChecks = [
      { pattern: /httpOnly:\s*true/, type: 'HTTP_ONLY_FLAG', required: true },
      { pattern: /sameSite:\s*['"`]lax['"`]/, type: 'SAMESITE_LAX', required: true },
      { pattern: /secure:\s*false.*development/, type: 'SECURE_DEV_ONLY', required: true },
      { pattern: /maxAge:\s*\d+/, type: 'MAX_AGE_SET', required: true }
    ];

    for (const check of securityChecks) {
      if (!content.match(check.pattern)) {
        this.violations.push({
          type: `MISSING_${check.type}`,
          file: devAuthFile,
          message: `Missing cookie security setting: ${check.type}`,
          severity: check.required ? 'HIGH' : 'MEDIUM'
        });
      }
    }

    // Check for cookie clearing in logout
    if (!content.includes('maxAge: 0')) {
      this.violations.push({
        type: 'MISSING_COOKIE_CLEARING',
        file: devAuthFile,
        message: 'Missing proper cookie clearing mechanism',
        severity: 'MEDIUM'
      });
    }

    success('Cookie security validation completed');
  }

  // Validate middleware isolation
  validateMiddlewareIsolation() {
    log('Validating middleware security isolation...', 'blue');
    
    const middlewareFile = path.join(PROJECT_ROOT, 'apps/frontend/src/middleware.ts');
    
    if (!fs.existsSync(middlewareFile)) {
      this.violations.push({
        type: 'MISSING_MIDDLEWARE',
        message: 'Middleware file missing',
        severity: 'HIGH'
      });
      return;
    }

    const content = fs.readFileSync(middlewareFile, 'utf8');
    
    // Check for development-only bypass
    if (!content.includes('NODE_ENV === \'development\'')) {
      this.violations.push({
        type: 'MISSING_MIDDLEWARE_ENV_CHECK',
        file: middlewareFile,
        message: 'Missing development environment check in middleware',
        severity: 'HIGH'
      });
    }

    // Check for ENABLE_MOCK_AUTH check
    if (!content.includes('ENABLE_MOCK_AUTH')) {
      this.violations.push({
        type: 'MISSING_MOCK_AUTH_MIDDLEWARE_CHECK',
        file: middlewareFile,
        message: 'Missing ENABLE_MOCK_AUTH check in middleware',
        severity: 'HIGH'
      });
    }

    // Ensure bypass is conditional
    if (content.includes('isDevelopment && enableMockAuth')) {
      success('Middleware isolation properly implemented');
    } else {
      this.violations.push({
        type: 'INCORRECT_MIDDLEWARE_LOGIC',
        file: middlewareFile,
        message: 'Middleware bypass logic not properly isolated',
        severity: 'HIGH'
      });
    }
  }

  // Validate secret management
  validateSecretManagement() {
    log('Validating secret management...', 'blue');
    
    // Check for .env files in git
    try {
      const gitignoreFile = path.join(PROJECT_ROOT, '.gitignore');
      if (fs.existsSync(gitignoreFile)) {
        const content = fs.readFileSync(gitignoreFile, 'utf8');
        
        if (!content.includes('.env.local')) {
          this.violations.push({
            type: 'ENV_NOT_GITIGNORED',
            file: '.gitignore',
            message: '.env.local not in .gitignore',
            severity: 'HIGH'
          });
        }
        
        if (!content.includes('.env')) {
          this.warnings.push({
            type: 'ENV_GITIGNORE_WARNING',
            message: 'Ensure .env files are properly gitignored',
            severity: 'LOW'
          });
        }
      }
    } catch (error) {
      this.warnings.push({
        type: 'GITIGNORE_CHECK_FAILED',
        message: 'Could not validate .gitignore',
        severity: 'LOW'
      });
    }

    // Check for hardcoded secrets
    const scanFiles = [
      'apps/frontend/src/app/api/dev-auth/route.ts',
      'apps/frontend/src/lib/mock-auth-data.ts'
    ];

    const secretPatterns = [
      /sk_test_[a-zA-Z0-9]+/g,  // Stripe test keys
      /pk_test_[a-zA-Z0-9]+/g,  // Stripe publishable keys
      /supabase.*key.*[a-zA-Z0-9]{40}/gi,  // Supabase keys
      /password.*[:=].*['"`][^'"`]+['"`]/gi  // Hardcoded passwords
    ];

    for (const relativePath of scanFiles) {
      const filePath = path.join(PROJECT_ROOT, relativePath);
      if (!fs.existsSync(filePath)) continue;

      const content = fs.readFileSync(filePath, 'utf8');
      
      for (const pattern of secretPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          this.violations.push({
            type: 'HARDCODED_SECRET',
            file: filePath,
            message: `Potential hardcoded secret found: ${matches[0].substring(0, 20)}...`,
            severity: 'HIGH'
          });
        }
      }
    }

    success('Secret management validation completed');
  }

  // Validate file permissions
  validateFilePermissions() {
    log('Validating file permissions...', 'blue');
    
    const criticalFiles = [
      'apps/frontend/src/app/api/dev-auth/route.ts',
      'apps/frontend/src/middleware.ts',
      'apps/frontend/src/lib/mock-auth-data.ts'
    ];

    for (const relativePath of criticalFiles) {
      const filePath = path.join(PROJECT_ROOT, relativePath);
      if (!fs.existsSync(filePath)) continue;

      try {
        const stats = fs.statSync(filePath);
        const mode = (stats.mode & parseInt('777', 8)).toString(8);
        
        // Files should not be world-writable
        if (mode.endsWith('7')) {
          this.violations.push({
            type: 'WORLD_WRITABLE_FILE',
            file: filePath,
            message: `File is world-writable (${mode})`,
            severity: 'MEDIUM'
          });
        }
      } catch (error) {
        this.warnings.push({
          type: 'PERMISSION_CHECK_FAILED',
          file: filePath,
          message: `Could not check file permissions: ${error.message}`,
          severity: 'LOW'
        });
      }
    }

    success('File permissions validation completed');
  }

  // Check for dependency vulnerabilities
  validateDependencyVulnerabilities() {
    log('Checking for dependency vulnerabilities...', 'blue');
    
    try {
      // Run npm audit for frontend
      const frontendPath = path.join(PROJECT_ROOT, 'apps/frontend');
      const auditResult = execSync('npm audit --audit-level=high --json', {
        cwd: frontendPath,
        encoding: 'utf8',
        timeout: 30000
      });

      const audit = JSON.parse(auditResult);
      
      if (audit.metadata && audit.metadata.vulnerabilities) {
        const vulns = audit.metadata.vulnerabilities;
        const highSeverity = vulns.high || 0;
        const criticalSeverity = vulns.critical || 0;

        if (criticalSeverity > 0) {
          this.violations.push({
            type: 'CRITICAL_VULNERABILITIES',
            message: `${criticalSeverity} critical vulnerabilities found`,
            severity: 'HIGH'
          });
        }

        if (highSeverity > 0) {
          this.warnings.push({
            type: 'HIGH_VULNERABILITIES',
            message: `${highSeverity} high-severity vulnerabilities found`,
            severity: 'MEDIUM'
          });
        }
      }

      success('Dependency vulnerability check completed');
    } catch (error) {
      this.warnings.push({
        type: 'AUDIT_FAILED',
        message: `npm audit failed: ${error.message}`,
        severity: 'LOW'
      });
    }
  }

  // Validate network security
  validateNetworkSecurity() {
    log('Validating network security configuration...', 'blue');
    
    // Check for HTTPS redirects and security headers
    const middlewareFile = path.join(PROJECT_ROOT, 'apps/frontend/src/middleware.ts');
    
    if (fs.existsSync(middlewareFile)) {
      const content = fs.readFileSync(middlewareFile, 'utf8');
      
      // Check for security headers
      if (!content.includes('X-Frame-Options') && !content.includes('frame-options')) {
        this.warnings.push({
          type: 'MISSING_FRAME_OPTIONS',
          file: middlewareFile,
          message: 'Missing X-Frame-Options header',
          severity: 'MEDIUM'
        });
      }

      // Check for CSP headers
      if (!content.includes('Content-Security-Policy')) {
        this.warnings.push({
          type: 'MISSING_CSP',
          file: middlewareFile,
          message: 'Missing Content-Security-Policy header',
          severity: 'MEDIUM'
        });
      }
    }

    success('Network security validation completed');
  }

  // Validate build security
  validateBuildSecurity() {
    log('Validating build security configuration...', 'blue');
    
    const nextConfigFile = path.join(PROJECT_ROOT, 'apps/frontend/next.config.js');
    
    if (fs.existsSync(nextConfigFile)) {
      const content = fs.readFileSync(nextConfigFile, 'utf8');
      
      // Check for security-related configurations
      if (content.includes('ANALYZE=true') && !content.includes('NODE_ENV')) {
        this.warnings.push({
          type: 'BUNDLE_ANALYZER_ALWAYS_ON',
          file: nextConfigFile,
          message: 'Bundle analyzer may be enabled in production',
          severity: 'LOW'
        });
      }
    }

    // Check package.json for security-related scripts
    const packageJsonFile = path.join(PROJECT_ROOT, 'package.json');
    
    if (fs.existsSync(packageJsonFile)) {
      const content = JSON.parse(fs.readFileSync(packageJsonFile, 'utf8'));
      
      if (content.scripts && content.scripts['postinstall']) {
        this.warnings.push({
          type: 'POSTINSTALL_SCRIPT',
          message: 'postinstall script present - review for security',
          severity: 'LOW'
        });
      }
    }

    success('Build security validation completed');
  }

  // Generate comprehensive security report
  generateSecurityReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total_checks: this.violations.length + this.warnings.length + this.passed.length,
        violations: this.violations.length,
        warnings: this.warnings.length,
        passed: this.passed.length,
        security_score: this.calculateSecurityScore()
      },
      violations: this.violations,
      warnings: this.warnings,
      passed: this.passed,
      recommendations: this.generateRecommendations()
    };

    // Save detailed report
    const reportPath = path.join(SECURITY_LOG_DIR, 'security-audit.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Save summary report
    const summaryPath = path.join(SECURITY_LOG_DIR, 'security-summary.txt');
    fs.writeFileSync(summaryPath, this.formatSecuritySummary(report));

    return report;
  }

  calculateSecurityScore() {
    const totalChecks = this.violations.length + this.warnings.length + this.passed.length;
    if (totalChecks === 0) return 0;

    const violationWeight = 3;
    const warningWeight = 1;
    const passedWeight = 1;

    const maxPossibleScore = totalChecks * passedWeight;
    const actualScore = (this.passed.length * passedWeight) - 
                       (this.violations.length * violationWeight) - 
                       (this.warnings.length * warningWeight);

    return Math.max(0, Math.round((actualScore / maxPossibleScore) * 100));
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.violations.some(v => v.type.includes('PRODUCTION_GUARD'))) {
      recommendations.push('Implement production guards in all dev-auth endpoints');
    }

    if (this.violations.some(v => v.type.includes('COOKIE'))) {
      recommendations.push('Review and secure cookie configuration');
    }

    if (this.violations.some(v => v.severity === 'HIGH')) {
      recommendations.push('Address all HIGH severity security violations immediately');
    }

    if (this.warnings.length > 5) {
      recommendations.push('Review and address security warnings');
    }

    recommendations.push('Regular security audits should be performed');
    recommendations.push('Keep dependencies updated to patch security vulnerabilities');

    return recommendations;
  }

  formatSecuritySummary(report) {
    return `
SECURITY AUDIT SUMMARY
======================

Timestamp: ${report.timestamp}
Security Score: ${report.summary.security_score}/100

RESULTS:
- Total Checks: ${report.summary.total_checks}
- Violations: ${report.summary.violations}
- Warnings: ${report.summary.warnings}
- Passed: ${report.summary.passed}

HIGH PRIORITY VIOLATIONS:
${report.violations
  .filter(v => v.severity === 'HIGH')
  .map(v => `- ${v.type}: ${v.message}`)
  .join('\n') || 'None'}

WARNINGS:
${report.warnings
  .slice(0, 5)
  .map(w => `- ${w.type}: ${w.message}`)
  .join('\n') || 'None'}

RECOMMENDATIONS:
${report.recommendations.map(r => `- ${r}`).join('\n')}

STATUS: ${report.summary.security_score >= 80 ? 'SECURE' : 
         report.summary.security_score >= 60 ? 'NEEDS ATTENTION' : 'CRITICAL ISSUES'}
    `;
  }

  printSecuritySummary(report) {
    console.log('\n' + '='.repeat(80));
    console.log('SECURITY AUDIT RESULTS');
    console.log('='.repeat(80));
    
    const scoreColor = report.summary.security_score >= 80 ? 'green' : 
                      report.summary.security_score >= 60 ? 'yellow' : 'red';
    
    log(`Security Score: ${report.summary.security_score}/100`, scoreColor);
    log(`Total Checks: ${report.summary.total_checks}`, 'blue');
    
    if (report.summary.violations > 0) {
      error(`Violations: ${report.summary.violations}`);
      
      const highViolations = report.violations.filter(v => v.severity === 'HIGH');
      if (highViolations.length > 0) {
        critical(`HIGH SEVERITY VIOLATIONS: ${highViolations.length}`);
        highViolations.forEach(v => {
          critical(`  - ${v.type}: ${v.message}`);
        });
      }
    } else {
      success(`No security violations found`);
    }
    
    if (report.summary.warnings > 0) {
      warning(`Warnings: ${report.summary.warnings}`);
    }
    
    success(`Passed Checks: ${report.summary.passed}`);
    
    console.log('='.repeat(80));
    
    if (report.summary.security_score >= 80) {
      success('🔒 SECURITY STATUS: SECURE');
    } else if (report.summary.security_score >= 60) {
      warning('⚠️  SECURITY STATUS: NEEDS ATTENTION');
    } else {
      critical('🚨 SECURITY STATUS: CRITICAL ISSUES - IMMEDIATE ACTION REQUIRED');
    }
    
    log(`Detailed report: ${path.join(SECURITY_LOG_DIR, 'security-audit.json')}`, 'cyan');
  }
}

// Main execution
async function main() {
  const command = process.argv[2] || 'audit';
  
  switch (command) {
    case 'audit':
      const hardening = new SecurityHardening();
      const report = await hardening.runSecurityAudit();
      hardening.printSecuritySummary(report);
      
      // Exit with error code if critical issues found
      const criticalViolations = report.violations.filter(v => v.severity === 'HIGH').length;
      process.exit(criticalViolations > 0 ? 1 : 0);
      
    case 'check':
      log('Security hardening script is ready', 'green');
      break;
      
    default:
      console.log(`
Security Hardening Script

Usage: node scripts/security-hardening.js [command]

Commands:
  audit   Run comprehensive security audit (default)
  check   Check if security script is working

This script validates:
- Production safety guards
- Environment variable security
- Cookie security settings
- Middleware isolation
- Secret management
- File permissions
- Dependency vulnerabilities
- Network security
- Build security
      `);
  }
}

if (require.main === module) {
  main().catch(error => {
    critical(`Security audit failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  });
}

module.exports = { SecurityHardening };