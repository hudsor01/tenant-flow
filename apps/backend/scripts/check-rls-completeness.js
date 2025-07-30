#!/usr/bin/env node

/**
 * RLS Completeness Check Script Wrapper
 * Wrapper that calls the main RLS completeness script from the root directory
 */

// Skip in CI environment
if (process.env.CI || process.env.GITHUB_ACTIONS || process.env.RUNNER_OS) {
  console.log('🚧 Running in CI environment - skipping RLS completeness check')
  console.log('✅ RLS completeness check skipped in CI (database connection not available)')
  process.exit(0)
}

// In non-CI environments, delegate to the main script
const { spawn } = require('child_process')
const path = require('path')

const mainScript = path.join(__dirname, '../../../scripts/check-rls-completeness.js')

const child = spawn('node', [mainScript], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '../../..')
})

child.on('exit', (code) => {
  process.exit(code)
})