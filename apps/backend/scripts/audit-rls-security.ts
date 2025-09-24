#!/usr/bin/env ts-node

/**
 * RLS Security Audit Script Wrapper
 * Wrapper that calls the main RLS audit script from the root directory
 */

import { Logger } from '@nestjs/common'
import { spawn } from 'child_process'
import * as path from 'path'

const rlsAuditLogger = new Logger('RLSAudit')

// Skip in CI environment
if (process.env.CI || process.env.GITHUB_ACTIONS || process.env.RUNNER_OS) {
	rlsAuditLogger.log('Running in CI environment - skipping RLS security audit')
	rlsAuditLogger.log(
		'SUCCESS: RLS security audit skipped in CI (database connection not available)'
	)
	process.exit(0)
}

// In non-CI environments, delegate to the main script
const mainScript = path.join(
	__dirname,
	'../../../scripts/audit-rls-security.js'
)

const child = spawn('node', [mainScript], {
	stdio: 'inherit',
	cwd: path.join(__dirname, '../../..')
})

child.on('exit', code => {
	process.exit(code || 0)
})