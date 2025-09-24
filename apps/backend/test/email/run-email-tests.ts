#!/usr/bin/env ts-node

/**
 * Email System Test Runner
 *
 * This script runs all email-related tests and generates a report
 * Can be used in CI/CD pipelines or for local testing
 *
 * Usage: npx ts-node test/email/run-email-tests.ts [--env=production] [--verbose]
 */

import { Logger } from '@nestjs/common'
import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

interface TestResult {
	suite: string
	passed: number
	failed: number
	skipped: number
	duration: number
	errors: string[]
}

class EmailTestRunner {
	private readonly logger = new Logger(EmailTestRunner.name)
	private results: TestResult[] = []
	private startTime: number = Date.now()
	private verbose = false
	private environment = 'test'

	constructor(args: string[]) {
		// Parse command line arguments
		args.forEach(arg => {
			if (arg.startsWith('--env=')) {
				this.environment = arg.split('=')[1]
			}
			if (arg === '--verbose' || arg === '-v') {
				this.verbose = true
			}
		})
	}

	/**
	 * Run all email tests
	 */
	async runAllTests(): Promise<void> {
		this.logger.log('🧪 Starting Email System Test Suite')
		this.logger.log(`[LOCATION] Environment: ${this.environment}`)
		this.logger.log(`[INFO] Verbose: ${this.verbose}`)
		this.logger.log('─'.repeat(50))

		// Set environment
		process.env.NODE_ENV = this.environment

		// Run test suites in sequence
		await this.runTestSuite(
			'Unit Tests - EmailTemplateService',
			'pnpm test -- email-template.service.spec.ts'
		)

		await this.runTestSuite(
			'Unit Tests - EmailService',
			'pnpm test -- email.service.spec.ts'
		)

		await this.runTestSuite(
			'E2E Tests - Email Workflows',
			'pnpm test:e2e -- email-workflows.e2e-spec.ts'
		)

		// Run performance tests if not in CI
		if (process.env.CI !== 'true') {
			await this.runPerformanceTests()
		}

		// Generate and display report
		this.generateReport()
	}

	/**
	 * Run a single test suite
	 */
	private async runTestSuite(name: string, command: string): Promise<void> {
		this.logger.log(`\n▶️  Running: ${name}`)

		const startTime = Date.now()
		const result: TestResult = {
			suite: name,
			passed: 0,
			failed: 0,
			skipped: 0,
			duration: 0,
			errors: []
		}

		try {
			await new Promise<void>((resolve, reject) => {
				const [cmd, ...args] = command.split(' ')
				const testProcess = spawn(cmd, args, {
					stdio: this.verbose ? 'inherit' : 'pipe',
					shell: true
				})

				let output = ''

				if (!this.verbose) {
					testProcess.stdout?.on('data', data => {
						output += data.toString()
						// Parse Jest output
						const passMatch = data.toString().match(/[PASS].*\((\d+) test/g)
						const failMatch = data.toString().match(/[FAIL].*\((\d+) test/g)
						const skipMatch = data.toString().match(/○.*\((\d+) test/g)

						if (passMatch) result.passed = passMatch.length
						if (failMatch) result.failed = failMatch.length
						if (skipMatch) result.skipped = skipMatch.length
					})

					testProcess.stderr?.on('data', data => {
						output += data.toString()
						result.errors.push(data.toString())
					})
				}

				testProcess.on('close', code => {
					result.duration = Date.now() - startTime

					if (code === 0) {
						this.logger.log(`   [OK] Passed (${result.duration}ms)`)
						resolve()
					} else {
						this.logger.log(`   [ERROR] Failed (${result.duration}ms)`)
						if (this.verbose) {
							this.logger.log(output)
						}
						resolve() // Continue to next test even if this one fails
					}
				})

				testProcess.on('error', error => {
					result.errors.push(error.message)
					result.duration = Date.now() - startTime
					this.logger.log(`   [WARNING]  Error: ${error.message}`)
					resolve()
				})
			})
		} catch (error) {
			result.failed++
			result.errors.push(error instanceof Error ? error.message : String(error))
			result.duration = Date.now() - startTime
		}

		this.results.push(result)
	}

	/**
	 * Run performance tests
	 */
	private async runPerformanceTests(): Promise<void> {
		this.logger.log('\n▶️  Running: Performance Tests')

		const result: TestResult = {
			suite: 'Performance Tests',
			passed: 0,
			failed: 0,
			skipped: 0,
			duration: 0,
			errors: []
		}

		const startTime = Date.now()

		try {
			// Import and run performance tests
			const { EmailTemplateService } = await import(
				'../../src/email/email-template.service'
			)
			const service = new EmailTemplateService()

			// Test template rendering performance
			const templates = [
				'welcome',
				'tenant-invitation',
				'payment-reminder',
				'lease-expiration'
			]
			const renderTimes: number[] = []

			for (const template of templates) {
				const templateStart = Date.now()

				await service.renderTemplate(template as any, {
					email: 'perf@test.com',
					name: 'Performance Test',
					tenantName: 'Test Tenant',
					propertyAddress: '123 Test St',
					invitationLink: 'https://test.com',
					landlordName: 'Test Landlord',
					amountDue: 1000,
					dueDate: new Date().toISOString(),
					paymentLink: 'https://pay.test.com',
					expirationDate: new Date().toISOString(),
					renewalLink: 'https://renew.test.com'
				})

				const renderTime = Date.now() - templateStart
				renderTimes.push(renderTime)

				if (renderTime < 500) {
					result.passed++
					this.logger.log(`   [OK] ${template}: ${renderTime}ms`)
				} else {
					result.failed++
					result.errors.push(`${template} rendering too slow: ${renderTime}ms`)
					this.logger.log(`   [ERROR] ${template}: ${renderTime}ms (>500ms)`)
				}
			}

			// Calculate statistics
			const avgTime =
				renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length
			const maxTime = Math.max(...renderTimes)

			this.logger.log(
				`   [STATS] Average: ${avgTime.toFixed(2)}ms, Max: ${maxTime}ms`
			)
		} catch (error) {
			result.failed++
			result.errors.push(error instanceof Error ? error.message : String(error))
			this.logger.log(`   [WARNING]  Error: ${error}`)
		}

		result.duration = Date.now() - startTime
		this.results.push(result)
	}

	/**
	 * Generate test report
	 */
	private generateReport(): void {
		const totalDuration = Date.now() - this.startTime
		const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0)
		const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0)
		const totalSkipped = this.results.reduce((sum, r) => sum + r.skipped, 0)

		this.logger.log('\n' + '═'.repeat(50))
		this.logger.log('[STATS] EMAIL SYSTEM TEST REPORT')
		this.logger.log('═'.repeat(50))

		// Summary
		this.logger.log('\n[METRICS] Summary:')
		this.logger.log(`   Total Tests: ${totalPassed + totalFailed + totalSkipped}`)
		this.logger.log(`   [OK] Passed: ${totalPassed}`)
		this.logger.log(`   [ERROR] Failed: ${totalFailed}`)
		this.logger.log(`   ⏭️  Skipped: ${totalSkipped}`)
		this.logger.log(`   ⏱️  Duration: ${(totalDuration / 1000).toFixed(2)}s`)

		const passRate = (totalPassed / (totalPassed + totalFailed)) * 100
		this.logger.log(`   [STATS] Pass Rate: ${passRate.toFixed(1)}%`)

		// Details by suite
		this.logger.log('\n[REPORT] Test Suites:')
		this.results.forEach(result => {
			const icon = result.failed === 0 ? '[OK]' : '[ERROR]'
			this.logger.log(`\n   ${icon} ${result.suite}`)
			this.logger.log(
				`      Passed: ${result.passed}, Failed: ${result.failed}, Skipped: ${result.skipped}`
			)
			this.logger.log(`      Duration: ${(result.duration / 1000).toFixed(2)}s`)

			if (result.errors.length > 0 && this.verbose) {
				this.logger.log('      Errors:')
				result.errors.forEach(error => {
					this.logger.log(`         - ${error.substring(0, 100)}...`)
				})
			}
		})

		// Coverage estimate
		this.logger.log('\n[METRICS] Coverage Estimate:')
		const coverageItems = [
			{ name: 'Template Rendering', covered: totalPassed > 0 },
			{ name: 'Email Sending', covered: totalPassed > 5 },
			{ name: 'Error Handling', covered: totalPassed > 10 },
			{
				name: 'Rate Limiting',
				covered: this.results.some(r => r.suite.includes('Integration'))
			},
			{
				name: 'Retry Logic',
				covered: this.results.some(r => r.suite.includes('E2E'))
			},
			{
				name: 'Performance',
				covered: this.results.some(r => r.suite.includes('Performance'))
			}
		]

		coverageItems.forEach(item => {
			const icon = item.covered ? '[OK]' : '[ERROR]'
			this.logger.log(`   ${icon} ${item.name}`)
		})

		const coverage =
			(coverageItems.filter(i => i.covered).length / coverageItems.length) * 100
		this.logger.log(`   [STATS] Overall Coverage: ${coverage.toFixed(0)}%`)

		// Recommendations
		this.logger.log('\n[TIP] Recommendations:')
		if (totalFailed > 0) {
			this.logger.log('   [WARNING]  Fix failing tests before deployment')
		}
		if (passRate < 90) {
			this.logger.log('   [WARNING]  Pass rate below 90%, investigate failures')
		}
		if (coverage < 80) {
			this.logger.log('   [WARNING]  Coverage below 80%, add more tests')
		}
		if (this.results.some(r => r.duration > 30000)) {
			this.logger.log('   [WARNING]  Some tests taking >30s, consider optimization')
		}

		// Save report to file
		this.saveReport(
			totalPassed,
			totalFailed,
			totalSkipped,
			totalDuration,
			passRate,
			coverage
		)

		// Exit code
		const exitCode = totalFailed > 0 ? 1 : 0
		this.logger.log('\n' + '═'.repeat(50))
		this.logger.log(
			exitCode === 0 ? '[OK] All tests passed!' : '[ERROR] Some tests failed'
		)
		process.exit(exitCode)
	}

	/**
	 * Save report to JSON file
	 */
	private saveReport(
		passed: number,
		failed: number,
		skipped: number,
		duration: number,
		passRate: number,
		coverage: number
	): void {
		const report = {
			timestamp: new Date().toISOString(),
			environment: this.environment,
			summary: {
				totalTests: passed + failed + skipped,
				passed,
				failed,
				skipped,
				duration,
				passRate,
				coverage
			},
			suites: this.results,
			metadata: {
				nodeVersion: process.version,
				platform: process.platform,
				ci: process.env.CI === 'true'
			}
		}

		const reportPath = path.join(
			__dirname,
			`email-test-report-${Date.now()}.json`
		)
		fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
		this.logger.log(`\n[DOC] Report saved to: ${reportPath}`)
	}
}

// Run the test runner
const moduleLogger = new Logger('EmailTestRunner')
const runner = new EmailTestRunner(process.argv.slice(2))
runner.runAllTests().catch(error => {
	moduleLogger.error('[ERROR] Test runner failed:', error)
	process.exit(1)
})
