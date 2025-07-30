#!/usr/bin/env node

/**
 * RLS Security Audit Script Wrapper
 * Wrapper that calls the main RLS audit script from the root directory
 */

// Skip in CI environment
if (process.env.CI || process.env.GITHUB_ACTIONS || process.env.RUNNER_OS) {
  console.log('🚧 Running in CI environment - skipping RLS security audit')
  console.log('✅ RLS security audit skipped in CI (database connection not available)')
  process.exit(0)
}

// In non-CI environments, delegate to the main script
const { spawn } = require('child_process')
const path = require('path')

const mainScript = path.join(__dirname, '../../../scripts/audit-rls-security.js')

const child = spawn('node', [mainScript], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '../../..')
})

child.on('exit', (code) => {
  process.exit(code)
})