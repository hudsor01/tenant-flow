#!/usr/bin/env node

/**
 * Quick ESLint Configuration Validation
 * Checks that ESLint is properly configured across the monorepo
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT_DIR = join(__dirname, '..')

// Colors
const green = (s) => `\x1b[32m${s}\x1b[0m`
const red = (s) => `\x1b[31m${s}\x1b[0m`
const yellow = (s) => `\x1b[33m${s}\x1b[0m`
const blue = (s) => `\x1b[34m${s}\x1b[0m`
const bold = (s) => `\x1b[1m${s}\x1b[0m`

console.log(bold(blue('\n🔍 ESLint Configuration Validation\n')))

let passed = 0
let failed = 0
let warnings = 0

// 1. Check core files exist
console.log(bold('1. Core Configuration Files'))
const coreFiles = [
  'eslint.config.js',
  'packages/eslint-config/base.js',
  'packages/eslint-config/nextjs.js',
  'packages/eslint-config/nestjs.js',
  'apps/frontend/eslint.config.mjs',
  'apps/backend/eslint.config.mjs'
]

coreFiles.forEach(file => {
  const path = join(ROOT_DIR, file)
  if (existsSync(path)) {
    console.log(green('✓'), file)
    passed++
  } else {
    console.log(red('✗'), file)
    failed++
  }
})

// 2. Check ESLint v9 flat config format
console.log(bold('\n2. ESLint v9 Flat Config Format'))
const configs = [
  'packages/eslint-config/base.js',
  'packages/eslint-config/nextjs.js',
  'packages/eslint-config/nestjs.js'
]

configs.forEach(file => {
  const path = join(ROOT_DIR, file)
  if (existsSync(path)) {
    const content = readFileSync(path, 'utf8')
    const hasExportDefault = /export default\s+\[/.test(content)
    const hasNamedConfigs = /name:\s+['"]/m.test(content)
    const usesTypescriptEslint = /typescript-eslint/.test(content)
    
    console.log(`  ${file.split('/').pop()}:`)
    
    if (hasExportDefault) {
      console.log(green('    ✓'), 'Uses flat config array export')
      passed++
    } else {
      console.log(red('    ✗'), 'Not using flat config format')
      failed++
    }
    
    if (hasNamedConfigs) {
      console.log(green('    ✓'), 'Has named configurations')
      passed++
    } else {
      console.log(yellow('    ⚠'), 'Missing named configurations')
      warnings++
    }
    
    if (file.includes('base') && usesTypescriptEslint) {
      console.log(green('    ✓'), 'Uses typescript-eslint package')
      passed++
    }
  }
})

// 3. Check package dependencies
console.log(bold('\n3. Package Dependencies'))
const packages = [
  { name: 'Frontend', path: 'apps/frontend/package.json' },
  { name: 'Backend', path: 'apps/backend/package.json' }
]

packages.forEach(({ name, path }) => {
  const fullPath = join(ROOT_DIR, path)
  if (existsSync(fullPath)) {
    const pkg = JSON.parse(readFileSync(fullPath, 'utf8'))
    const hasSharedConfig = pkg.devDependencies?.['@repo/eslint-config'] || 
                           pkg.dependencies?.['@repo/eslint-config']
    
    console.log(`  ${name}:`)
    if (hasSharedConfig) {
      console.log(green('    ✓'), 'Uses @repo/eslint-config')
      passed++
    } else {
      console.log(red('    ✗'), 'Missing @repo/eslint-config')
      failed++
    }
    
    const eslintVersion = pkg.devDependencies?.eslint || pkg.dependencies?.eslint
    if (eslintVersion?.includes('9')) {
      console.log(green('    ✓'), `ESLint v9 (${eslintVersion})`)
      passed++
    }
  }
})

// 4. Check Turbo pipeline
console.log(bold('\n4. Turbo Pipeline'))
const turboPath = join(ROOT_DIR, 'turbo.json')
if (existsSync(turboPath)) {
  const turbo = JSON.parse(readFileSync(turboPath, 'utf8'))
  const lintTask = turbo.tasks?.lint || turbo.pipeline?.lint
  
  if (lintTask) {
    console.log(green('  ✓'), 'Lint task configured')
    passed++
    
    if (lintTask.cache !== false) {
      console.log(green('  ✓'), 'Caching enabled')
      passed++
    } else {
      console.log(yellow('  ⚠'), 'Caching disabled')
      warnings++
    }
  } else {
    console.log(red('  ✗'), 'No lint task found')
    failed++
  }
}

// 5. Quick ESLint test
console.log(bold('\n5. ESLint Execution Test'))
try {
  execSync('npx eslint --version', { 
    cwd: ROOT_DIR, 
    stdio: 'pipe',
    timeout: 5000 
  })
  console.log(green('  ✓'), 'ESLint executable found')
  passed++
  
  // Test one package quickly
  try {
    execSync('npx eslint packages/shared --max-warnings=0 --format=compact', {
      cwd: ROOT_DIR,
      stdio: 'pipe',
      timeout: 10000
    })
    console.log(green('  ✓'), 'Shared package lints successfully')
    passed++
  } catch (e) {
    const output = e.stdout?.toString() || ''
    if (output.includes('warning')) {
      console.log(yellow('  ⚠'), 'Shared package has warnings')
      warnings++
    } else if (output.includes('error')) {
      console.log(red('  ✗'), 'Shared package has errors')
      failed++
    }
  }
} catch (e) {
  console.log(red('  ✗'), 'ESLint not found or misconfigured')
  failed++
}

// Summary
console.log(bold('\n📊 Summary'))
console.log('─'.repeat(40))

const total = passed + failed + warnings
const score = Math.round((passed / total) * 100)

console.log(`Score: ${score >= 80 ? green(score + '%') : score >= 60 ? yellow(score + '%') : red(score + '%')}`)
console.log(green(`✓ Passed: ${passed}`))
console.log(yellow(`⚠ Warnings: ${warnings}`))
console.log(red(`✗ Failed: ${failed}`))

// Recommendations
console.log(bold('\n💡 Recommendations'))
if (score >= 80) {
  console.log(green('✓'), 'Configuration is healthy and well-aligned')
  console.log('  • Consider adding git hooks for pre-commit linting')
  console.log('  • Monitor lint performance as codebase grows')
} else if (score >= 60) {
  console.log(yellow('⚠'), 'Configuration needs some improvements')
  console.log('  • Fix any missing dependencies')
  console.log('  • Enable Turbo caching for better performance')
  console.log('  • Add named configurations for better debugging')
} else {
  console.log(red('✗'), 'Configuration has critical issues')
  console.log('  • Ensure all packages use @repo/eslint-config')
  console.log('  • Fix any configuration errors')
  console.log('  • Update to ESLint v9 flat config format')
}

// Save report
const report = {
  timestamp: new Date().toISOString(),
  score,
  passed,
  warnings,
  failed,
  health: score >= 80 ? 'healthy' : score >= 60 ? 'moderate' : 'critical'
}

try {
  const fs = await import('fs')
  fs.writeFileSync(
    join(ROOT_DIR, 'eslint-validation-report.json'),
    JSON.stringify(report, null, 2)
  )
  console.log(`\n${blue('Report saved to eslint-validation-report.json')}`)
} catch (e) {
  // Silent fail
}

process.exit(failed > 0 ? 1 : 0)