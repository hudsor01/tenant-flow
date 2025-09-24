#!/usr/bin/env node

/**
 * Bulletproof Backend Health Test for Pre-Commit Validation
 *
 * Tests that the backend can start successfully with Railway production environment
 * and validates all critical systems are operational before allowing commit.
 *
 * Exit codes:
 * - 0: Success - backend is healthy and ready
 * - 1: Failure - backend has critical issues
 */

import { spawn } from 'child_process'
import { setTimeout as delay } from 'timers/promises'

const BACKEND_PORT = 4600
const STARTUP_TIMEOUT = 45000 // 45 seconds max startup time
const HEALTH_CHECK_TIMEOUT = 10000 // 10 seconds for health checks

class BackendHealthTester {
	constructor() {
		this.backendProcess = null
		this.isStarted = false
		this.startupLogs = []
	}

	log(message) {
		console.log(`[HEALTH-TEST] ${message}`)
	}

	error(message) {
		console.error(`[HEALTH-TEST] ❌ ${message}`)
	}

	success(message) {
		console.log(`[HEALTH-TEST] ✅ ${message}`)
	}

	async startBackend() {
		this.log('Starting backend with Railway production environment...')

		return new Promise((resolve, reject) => {
			// Use Railway environment for production validation
			this.backendProcess = spawn(
				'railway',
				['run', 'pnpm', '--filter', '@repo/backend', 'start'],
				{
					env: { ...process.env, PORT: BACKEND_PORT.toString() },
					stdio: 'pipe'
				}
			)

			let startupTimer = setTimeout(() => {
				this.error(
					'Backend startup timeout - failed to start within 45 seconds'
				)
				this.cleanup()
				reject(new Error('Startup timeout'))
			}, STARTUP_TIMEOUT)

			// Monitor stdout for startup confirmation
			this.backendProcess.stdout.on('data', data => {
				const output = data.toString()
				this.startupLogs.push(output)

				// Look for successful startup indicators
				if (
					output.includes('EXPRESS SERVER: Listening') ||
					output.includes('Nest application successfully started')
				) {
					clearTimeout(startupTimer)
					this.isStarted = true
					this.success('Backend started successfully!')
					resolve()
				}

				// Check for critical errors during startup
				if (
					output.includes('Cannot set property query') ||
					output.includes('TypeError:') ||
					output.includes('ReferenceError:') ||
					output.includes('Module not found')
				) {
					clearTimeout(startupTimer)
					this.error('Critical startup error detected:')
					console.error(output)
					this.cleanup()
					reject(new Error('Startup error'))
				}
			})

			// Monitor stderr for errors
			this.backendProcess.stderr.on('data', data => {
				const error = data.toString()
				// Ignore Railway connection messages and other noise
				if (
					!error.includes('Railway') &&
					!error.includes('warning') &&
					!error.includes('deprecated')
				) {
					this.error(`Stderr: ${error}`)
				}
			})

			this.backendProcess.on('error', error => {
				clearTimeout(startupTimer)
				this.error(`Process error: ${error.message}`)
				reject(error)
			})

			this.backendProcess.on('exit', code => {
				clearTimeout(startupTimer)
				if (code !== 0 && code !== null) {
					this.error(`Backend exited with code ${code}`)
					reject(new Error(`Exit code ${code}`))
				}
			})
		})
	}

	async validateCriticalSystems() {
		this.log('Validating critical systems...')

		// Give the server a moment to fully initialize
		await delay(3000)

		const validations = [
			this.validateBasicHealth(),
			this.validateEnvironment(),
			this.validateMiddleware()
		]

		const results = await Promise.allSettled(validations)
		const failures = results.filter(result => result.status === 'rejected')

		if (failures.length > 0) {
			this.error(`${failures.length} critical system validation(s) failed`)
			failures.forEach((failure, index) => {
				this.error(`Validation ${index + 1}: ${failure.reason.message}`)
			})
			throw new Error('Critical system validation failed')
		}

		this.success('All critical systems validated successfully')
	}

	async validateBasicHealth() {
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error('Health check timeout'))
			}, HEALTH_CHECK_TIMEOUT)

			// Try to connect to the server
			import('http').then(http => {
				const req = http.request(
					{
						hostname: 'localhost',
						port: BACKEND_PORT,
						path: '/health',
						method: 'GET',
						timeout: HEALTH_CHECK_TIMEOUT
					},
					res => {
						clearTimeout(timeout)
						if (res.statusCode >= 200 && res.statusCode < 500) {
							resolve('Health endpoint responding')
						} else {
							reject(new Error(`Health endpoint returned ${res.statusCode}`))
						}
					}
				)

				req.on('error', error => {
					clearTimeout(timeout)
					reject(new Error(`Health check failed: ${error.message}`))
				})

				req.end()
			})
		})
	}

	async validateEnvironment() {
		// Check startup logs for environment validation
		const logs = this.startupLogs.join('')

		if (!logs.includes('production')) {
			throw new Error('Backend not running in production environment')
		}

		if (!logs.includes('Supabase')) {
			throw new Error('Supabase integration not detected')
		}

		if (!logs.includes('Stripe SDK initialized')) {
			throw new Error('Stripe SDK not initialized')
		}

		return 'Environment validation passed'
	}

	async validateMiddleware() {
		// Check for critical middleware initialization
		const logs = this.startupLogs.join('')

		if (!logs.includes('Input sanitization enabled')) {
			throw new Error('Input sanitization middleware not enabled')
		}

		if (!logs.includes('CORS enabled')) {
			throw new Error('CORS not enabled')
		}

		if (!logs.includes('Security exception filter enabled')) {
			throw new Error('Security exception filter not enabled')
		}

		return 'Middleware validation passed'
	}

	cleanup() {
		if (this.backendProcess && !this.backendProcess.killed) {
			this.log('Stopping backend process...')
			this.backendProcess.kill('SIGTERM')

			// Force kill after 5 seconds if graceful shutdown fails
			setTimeout(() => {
				if (this.backendProcess && !this.backendProcess.killed) {
					this.backendProcess.kill('SIGKILL')
				}
			}, 5000)
		}
	}

	async run() {
		try {
			this.log('🏥 Starting bulletproof backend health validation...')

			// Step 1: Start backend with Railway environment
			await this.startBackend()

			// Step 2: Validate all critical systems
			await this.validateCriticalSystems()

			this.success(
				'🎉 Backend health validation PASSED - ready for production!'
			)
		} catch (error) {
			this.error(`Health validation FAILED: ${error.message}`)

			// Print startup logs for debugging
			if (this.startupLogs.length > 0) {
				console.log('\n--- Backend Startup Logs ---')
				console.log(this.startupLogs.join(''))
				console.log('--- End Logs ---\n')
			}

			process.exit(1)
		} finally {
			this.cleanup()
		}
	}
}

// Run the health test
const tester = new BackendHealthTester()

process.on('SIGINT', () => {
	console.log('\n[HEALTH-TEST] Received SIGINT, cleaning up...')
	tester.cleanup()
	process.exit(1)
})

process.on('SIGTERM', () => {
	console.log('\n[HEALTH-TEST] Received SIGTERM, cleaning up...')
	tester.cleanup()
	process.exit(1)
})

tester.run()
