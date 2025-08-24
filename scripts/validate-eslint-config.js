#!/usr/bin/env node

/**
 * ESLint Configuration Validation Script
 * Verifies that ESLint is properly configured across the monorepo
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT_DIR = join(__dirname, '..')

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  bold: '\x1b[1m'
}

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bold}${colors.blue}${msg}${colors.reset}`),
  subsection: (msg) => console.log(`\n${colors.bold}  ${msg}${colors.reset}`)
}

// Track validation results
const results = {
  passed: [],
  warnings: [],
  errors: []
}

/**
 * Execute command and return output
 */
function exec(cmd, options = {}) {
  try {
    return execSync(cmd, { 
      encoding: 'utf8', 
      cwd: ROOT_DIR,
      stdio: 'pipe',
      ...options 
    }).trim()
  } catch (error) {
    return error.stdout?.toString() || error.message
  }
}

/**
 * Check if file exists
 */
function checkFile(path, description) {
  const fullPath = join(ROOT_DIR, path)
  if (existsSync(fullPath)) {
    log.success(`${description}: ${path}`)
    results.passed.push(`File exists: ${path}`)
    return true
  } else {
    log.error(`${description} not found: ${path}`)
    results.errors.push(`Missing file: ${path}`)
    return false
  }
}

/**
 * Parse JSON file safely
 */
function parseJSON(path) {
  try {
    const content = readFileSync(join(ROOT_DIR, path), 'utf8')
    return JSON.parse(content)
  } catch (error) {
    return null
  }
}

/**
 * 1. Check Core Configuration Files
 */
function validateCoreFiles() {
  log.section('1. Core Configuration Files')
  
  const coreFiles = [
    ['eslint.config.js', 'Root ESLint config'],
    ['packages/eslint-config/package.json', 'ESLint config package'],
    ['packages/eslint-config/base.js', 'Base ESLint config'],
    ['packages/eslint-config/nextjs.js', 'Next.js ESLint config'],
    ['packages/eslint-config/nestjs.js', 'NestJS ESLint config'],
    ['apps/frontend/eslint.config.mjs', 'Frontend ESLint config'],
    ['apps/backend/eslint.config.mjs', 'Backend ESLint config']
  ]
  
  coreFiles.forEach(([path, description]) => {
    checkFile(path, description)
  })
}

/**
 * 2. Validate Package Dependencies
 */
function validateDependencies() {
  log.section('2. Package Dependencies Alignment')
  
  const packages = [
    'apps/frontend/package.json',
    'apps/backend/package.json',
    'packages/eslint-config/package.json'
  ]
  
  packages.forEach(pkgPath => {
    const pkg = parseJSON(pkgPath)
    if (!pkg) {
      log.error(`Could not parse ${pkgPath}`)
      results.errors.push(`Invalid package.json: ${pkgPath}`)
      return
    }
    
    log.subsection(`  ${pkg.name}`)
    
    // Check for @repo/eslint-config dependency
    if (pkgPath.includes('apps/')) {
      const hasEslintConfig = 
        pkg.devDependencies?.['@repo/eslint-config'] ||
        pkg.dependencies?.['@repo/eslint-config']
      
      if (hasEslintConfig) {
        log.success(`Has @repo/eslint-config dependency`)
        results.passed.push(`${pkg.name} uses shared ESLint config`)
      } else {
        log.warning(`Missing @repo/eslint-config dependency`)
        results.warnings.push(`${pkg.name} missing shared ESLint config`)
      }
    }
    
    // Check ESLint version consistency
    const eslintVersion = pkg.devDependencies?.eslint || pkg.dependencies?.eslint
    if (eslintVersion) {
      const majorVersion = eslintVersion.match(/\^?(\d+)/)?.[1]
      if (majorVersion === '9') {
        log.success(`Using ESLint v9 (${eslintVersion})`)
        results.passed.push(`${pkg.name} uses ESLint v9`)
      } else if (majorVersion) {
        log.warning(`Using ESLint v${majorVersion} (expected v9)`)
        results.warnings.push(`${pkg.name} uses ESLint v${majorVersion}`)
      }
    }
  })
}

/**
 * 3. Check ESLint v9 Flat Config Format
 */
function validateFlatConfig() {
  log.section('3. ESLint v9 Flat Config Format')
  
  const configFiles = [
    'packages/eslint-config/base.js',
    'packages/eslint-config/nextjs.js',
    'packages/eslint-config/nestjs.js'
  ]
  
  configFiles.forEach(configPath => {
    const fullPath = join(ROOT_DIR, configPath)
    if (!existsSync(fullPath)) return
    
    const content = readFileSync(fullPath, 'utf8')
    const fileName = configPath.split('/').pop()
    
    log.subsection(`  ${fileName}`)
    
    // Check for flat config indicators
    const checks = [
      {
        pattern: /export default\s+\[/,
        description: 'Exports array (flat config)',
        required: true
      },
      {
        pattern: /name:\s+['"]/,
        description: 'Named configurations',
        required: false
      },
      {
        pattern: /typescript-eslint/,
        description: 'Uses typescript-eslint package',
        required: configPath.includes('base')
      },
      {
        pattern: /extends:\s+\[/,
        description: 'Uses extends in flat config',
        required: false
      },
      {
        pattern: /languageOptions:/,
        description: 'Uses languageOptions (v9 format)',
        required: false
      },
      {
        pattern: /plugins:\s+\{/,
        description: 'Plugins as object (v9 format)',
        required: false
      }
    ]
    
    checks.forEach(check => {
      if (check.pattern.test(content)) {
        log.success(check.description)
        results.passed.push(`${fileName}: ${check.description}`)
      } else if (check.required) {
        log.error(`Missing: ${check.description}`)
        results.errors.push(`${fileName}: Missing ${check.description}`)
      }
    })
    
    // Check for legacy patterns (should NOT exist)
    const legacyPatterns = [
      { pattern: /module\.exports/, description: 'CommonJS export' },
      { pattern: /extends:\s+['"]/, description: 'String extends (legacy)' },
      { pattern: /parserOptions\.ecmaVersion:\s+\d{4}/, description: 'Year-based ecmaVersion' }
    ]
    
    legacyPatterns.forEach(legacy => {
      if (legacy.pattern.test(content)) {
        log.warning(`Found legacy pattern: ${legacy.description}`)
        results.warnings.push(`${fileName}: ${legacy.description}`)
      }
    })
  })
}

/**
 * 4. Validate Turbo Pipeline Integration
 */
function validateTurboPipeline() {
  log.section('4. Turbo Pipeline Integration')
  
  const turboConfig = parseJSON('turbo.json')
  if (!turboConfig) {
    log.error('Could not parse turbo.json')
    results.errors.push('Invalid turbo.json')
    return
  }
  
  // Check if lint task is defined
  if (turboConfig.tasks?.lint || turboConfig.pipeline?.lint) {
    log.success('Lint task defined in turbo.json')
    results.passed.push('Turbo lint pipeline configured')
    
    const lintConfig = turboConfig.tasks?.lint || turboConfig.pipeline?.lint
    
    // Check cache configuration
    if (lintConfig.cache !== false) {
      log.success('Lint caching enabled')
      results.passed.push('Turbo lint caching enabled')
    } else {
      log.warning('Lint caching disabled')
      results.warnings.push('Turbo lint caching disabled')
    }
    
    // Check inputs
    if (lintConfig.inputs) {
      log.info(`Lint inputs: ${JSON.stringify(lintConfig.inputs)}`)
    }
  } else {
    log.error('No lint task in turbo.json')
    results.errors.push('Missing turbo lint pipeline')
  }
}

/**
 * 5. Test ESLint Execution
 */
async function testESLintExecution() {
  log.section('5. ESLint Execution Tests')
  
  const testPackages = [
    { name: 'Frontend', path: 'apps/frontend', cmd: 'npx eslint . --max-warnings=0 --format=compact' },
    { name: 'Backend', path: 'apps/backend', cmd: 'npx eslint . --max-warnings=0 --format=compact' },
    { name: 'Shared', path: 'packages/shared', cmd: 'npx eslint . --max-warnings=0 --format=compact' }
  ]
  
  for (const pkg of testPackages) {
    log.subsection(`  ${pkg.name}`)
    
    const output = exec(pkg.cmd, { cwd: join(ROOT_DIR, pkg.path) })
    
    if (output.includes('error') || output.includes('Error')) {
      const errorCount = (output.match(/\d+\s+error/)?.[0] || '').trim()
      const warningCount = (output.match(/\d+\s+warning/)?.[0] || '').trim()
      
      if (errorCount) {
        log.error(`Has ${errorCount}`)
        results.errors.push(`${pkg.name}: ${errorCount}`)
      }
      if (warningCount) {
        log.warning(`Has ${warningCount}`)
        results.warnings.push(`${pkg.name}: ${warningCount}`)
      }
    } else if (output.includes('Oops! Something went wrong')) {
      log.error('ESLint configuration error')
      results.errors.push(`${pkg.name}: Configuration error`)
    } else {
      log.success('ESLint runs successfully')
      results.passed.push(`${pkg.name}: ESLint executes`)
    }
  }
}

/**
 * 6. Check for Conflicts and Redundancies
 */
function checkConflictsAndRedundancies() {
  log.section('6. Configuration Conflicts & Redundancies')
  
  // Check for duplicate ESLint configs
  const eslintConfigs = exec('find . -name "eslint.config.*" -o -name ".eslintrc.*" 2>/dev/null | grep -v node_modules').split('\n').filter(Boolean)
  
  log.subsection('  ESLint Config Files')
  eslintConfigs.forEach(config => {
    if (config.includes('.eslintrc')) {
      log.warning(`Legacy config found: ${config}`)
      results.warnings.push(`Legacy ESLint config: ${config}`)
    } else {
      log.info(`Found: ${config}`)
    }
  })
  
  // Check for conflicting dependencies
  log.subsection('  Dependency Conflicts')
  
  const packages = ['apps/frontend', 'apps/backend', 'packages/shared']
  const eslintDeps = new Map()
  
  packages.forEach(pkgPath => {
    const pkg = parseJSON(`${pkgPath}/package.json`)
    if (!pkg) return
    
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    Object.entries(deps).forEach(([name, version]) => {
      if (name.includes('eslint')) {
        if (!eslintDeps.has(name)) {
          eslintDeps.set(name, new Set())
        }
        eslintDeps.get(name).add(`${pkg.name}:${version}`)
      }
    })
  })
  
  eslintDeps.forEach((versions, depName) => {
    if (versions.size > 1) {
      log.warning(`Version mismatch for ${depName}: ${Array.from(versions).join(', ')}`)
      results.warnings.push(`Dependency conflict: ${depName}`)
    }
  })
}

/**
 * 7. Performance Metrics
 */
function checkPerformance() {
  log.section('7. Performance Metrics')
  
  // Measure lint execution time
  const packages = [
    { name: 'Frontend', path: 'apps/frontend' },
    { name: 'Backend', path: 'apps/backend' },
    { name: 'All (Turbo)', path: '.', cmd: 'npx turbo run lint --force' }
  ]
  
  packages.forEach(pkg => {
    const startTime = Date.now()
    const cmd = pkg.cmd || `npx eslint . --format=compact --quiet`
    
    exec(cmd, { cwd: join(ROOT_DIR, pkg.path), stdio: 'ignore' })
    
    const duration = Date.now() - startTime
    const seconds = (duration / 1000).toFixed(2)
    
    if (duration < 5000) {
      log.success(`${pkg.name}: ${seconds}s`)
      results.passed.push(`${pkg.name} lint: ${seconds}s`)
    } else if (duration < 10000) {
      log.warning(`${pkg.name}: ${seconds}s (could be optimized)`)
      results.warnings.push(`${pkg.name} lint slow: ${seconds}s`)
    } else {
      log.error(`${pkg.name}: ${seconds}s (too slow)`)
      results.errors.push(`${pkg.name} lint very slow: ${seconds}s`)
    }
  })
}

/**
 * 8. Generate Summary Report
 */
function generateReport() {
  log.section('📊 VALIDATION SUMMARY')
  
  const total = results.passed.length + results.warnings.length + results.errors.length
  const score = Math.round((results.passed.length / total) * 100)
  
  console.log(`
${colors.bold}Overall Health Score: ${score >= 80 ? colors.green : score >= 60 ? colors.yellow : colors.red}${score}%${colors.reset}

${colors.green}✓ Passed: ${results.passed.length}${colors.reset}
${colors.yellow}⚠ Warnings: ${results.warnings.length}${colors.reset}
${colors.red}✗ Errors: ${results.errors.length}${colors.reset}

${colors.bold}Key Findings:${colors.reset}`)
  
  // Report critical issues
  if (results.errors.length > 0) {
    console.log(`\n${colors.red}Critical Issues:${colors.reset}`)
    results.errors.slice(0, 5).forEach(error => {
      console.log(`  • ${error}`)
    })
  }
  
  // Report warnings
  if (results.warnings.length > 0) {
    console.log(`\n${colors.yellow}Warnings:${colors.reset}`)
    results.warnings.slice(0, 5).forEach(warning => {
      console.log(`  • ${warning}`)
    })
  }
  
  // Recommendations
  console.log(`\n${colors.bold}Recommendations:${colors.reset}`)
  
  if (score < 60) {
    console.log('  • Fix critical configuration errors first')
    console.log('  • Ensure all packages use @repo/eslint-config')
    console.log('  • Remove legacy .eslintrc files')
  } else if (score < 80) {
    console.log('  • Address version mismatches in dependencies')
    console.log('  • Optimize performance for slow packages')
    console.log('  • Consider enabling Turbo caching for lint')
  } else {
    console.log('  • Configuration is healthy and well-aligned')
    console.log('  • Consider adding pre-commit hooks')
    console.log('  • Monitor performance as codebase grows')
  }
  
  // Export detailed report
  const reportPath = join(ROOT_DIR, 'eslint-validation-report.json')
  const report = {
    timestamp: new Date().toISOString(),
    score,
    results,
    recommendations: score < 60 ? 'critical' : score < 80 ? 'moderate' : 'healthy'
  }
  
  try {
    require('fs').writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`\n${colors.gray}Detailed report saved to: eslint-validation-report.json${colors.reset}`)
  } catch (e) {
    // Silent fail for report writing
  }
}

/**
 * Main execution
 */
async function main() {
  console.log(`${colors.bold}${colors.blue}
╔══════════════════════════════════════════════╗
║   ESLint Configuration Validation Suite      ║
║   Turbo Monorepo Full-Stack Project         ║
╚══════════════════════════════════════════════╝${colors.reset}`)
  
  validateCoreFiles()
  validateDependencies()
  validateFlatConfig()
  validateTurboPipeline()
  await testESLintExecution()
  checkConflictsAndRedundancies()
  checkPerformance()
  generateReport()
  
  process.exit(results.errors.length > 0 ? 1 : 0)
}

// Run validation
main().catch(console.error)