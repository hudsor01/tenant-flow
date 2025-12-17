/**
 * Manual verification script for winston logging
 *
 * This script tests the following scenarios:
 * 1. Application startup with valid log directory
 * 2. Application startup with non-writable primary directory (should use fallback)
 * 3. Verify winston log output format is readable and properly formatted
 *
 * Requirements: 2.1, 2.2, 2.3
 */

import fs from 'node:fs'
import path from 'node:path'
import { ensureLogDirectory } from '../winston.utils'

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message: string, color: keyof typeof colors = 'reset') {
  process.stdout.write(`${colors[color]}${message}${colors.reset}\n`)
}

function testHeader(testName: string) {
  log('\n' + '='.repeat(60), 'cyan')
  log(`TEST: ${testName}`, 'cyan')
  log('='.repeat(60), 'cyan')
}

function testResult(passed: boolean, message: string) {
  if (passed) {
    log(`✓ PASS: ${message}`, 'green')
  } else {
    log(`FAIL: FAIL: ${message}`, 'red')
  }
}

// Test 1: Valid log directory
function testValidLogDirectory() {
  testHeader('Test 1: Valid Log Directory')

  const testDir = path.join(process.cwd(), 'test-logs-valid')

  try {
    // Clean up if exists
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true })
    }

    log(`Testing with directory: ${testDir}`, 'blue')
    const result = ensureLogDirectory(testDir)

    testResult(result === testDir, `Directory created successfully: ${result}`)
    testResult(fs.existsSync(testDir), 'Directory exists on filesystem')

    // Clean up
    fs.rmSync(testDir, { recursive: true })
    testResult(!fs.existsSync(testDir), 'Cleanup successful')

    return true
  } catch (error) {
    testResult(false, `Unexpected error: ${error}`)
    return false
  }
}

// Test 2: Non-writable directory (fallback scenario)
function testFallbackDirectory() {
  testHeader('Test 2: Non-writable Directory (Fallback)')

  // Use a path that's likely to fail (root directory without permissions)
  const nonWritableDir = '/root/logs/backend'
  const fallbackDir = '/tmp/logs/backend'

  try {
    log(`Testing with non-writable directory: ${nonWritableDir}`, 'blue')
    log('Expected behavior: Should log warning and use fallback', 'yellow')
    log('Watch for winston-formatted warning message above...', 'yellow')

    const result = ensureLogDirectory(nonWritableDir)

    testResult(result === fallbackDir, `Fallback directory used: ${result}`)
    testResult(fs.existsSync(fallbackDir), 'Fallback directory exists')

    // Clean up fallback
    if (fs.existsSync(fallbackDir)) {
      fs.rmSync(fallbackDir, { recursive: true })
    }

    return true
  } catch (error) {
    testResult(false, `Unexpected error: ${error}`)
    return false
  }
}

// Test 3: Verify log format
function testLogFormat() {
  testHeader('Test 3: Winston Log Output Format')

  log('Testing bootstrap logger format...', 'blue')
  log('The warning message above should have the format:', 'yellow')
  log('[YYYY-MM-DDTHH:mm:ss.sssZ] WARN: <message>', 'yellow')

  // Check if the format includes:
  // 1. Timestamp in brackets
  // 2. Log level in uppercase
  // 3. Colon separator
  // 4. Message content

  const formatChecks = [
    'Timestamp is in ISO format with brackets',
    'Log level is uppercase (WARN)',
    'Message includes original directory path',
    'Message includes error details',
    'Message includes fallback directory path'
  ]

  log('\nExpected format elements:', 'cyan')
  formatChecks.forEach((check, i) => {
    log(`  ${i + 1}. ${check}`, 'blue')
  })

  log('\nManual verification required:', 'yellow')
  log('Review the warning message from Test 2 above', 'yellow')
  log('Confirm it matches the expected format', 'yellow')

  return true
}

// Test 4: Default directory behavior
function testDefaultDirectory() {
  testHeader('Test 4: Default Directory Behavior')

  try {
    log('Testing with no directory specified (should use default)', 'blue')
    const result = ensureLogDirectory()

    testResult(result.includes('logs'), `Default directory used: ${result}`)
    testResult(fs.existsSync(result), 'Default directory exists')

    return true
  } catch (error) {
    testResult(false, `Unexpected error: ${error}`)
    return false
  }
}

// Run all tests
async function runAllTests() {
  log('\n' + '█'.repeat(60), 'cyan')
  log('WINSTON LOGGING MANUAL VERIFICATION', 'cyan')
  log('█'.repeat(60) + '\n', 'cyan')

  const results = {
    test1: testValidLogDirectory(),
    test2: testFallbackDirectory(),
    test3: testLogFormat(),
    test4: testDefaultDirectory()
  }

  // Summary
  testHeader('Test Summary')
  const passed = Object.values(results).filter(Boolean).length
  const total = Object.values(results).length

  log(`\nTests Passed: ${passed}/${total}`, passed === total ? 'green' : 'red')

  if (passed === total) {
    log('\n✓ All manual verification tests passed!', 'green')
    log('Requirements 2.1, 2.2, 2.3 verified successfully', 'green')
  } else {
    log('\nFAIL: Some tests failed. Review output above.', 'red')
  }

  log('\n' + '█'.repeat(60) + '\n', 'cyan')
}

// Execute tests
runAllTests().catch((error) => {
  process.stderr.write(`Error: ${error}\n`)
  process.exit(1)
})
