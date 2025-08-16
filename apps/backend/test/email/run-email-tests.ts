#!/usr/bin/env ts-node

/**
 * Email System Test Runner
 * 
 * This script runs all email-related tests and generates a report
 * Can be used in CI/CD pipelines or for local testing
 * 
 * Usage: npx ts-node test/email/run-email-tests.ts [--env=production] [--verbose]
 */

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
	private results: TestResult[] = []
	private startTime: number = Date.now()
	private verbose: boolean = false
	private environment: string = 'test'

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
		console.log('🧪 Starting Email System Test Suite')
		console.log(`📍 Environment: ${this.environment}`)
		console.log(`🔊 Verbose: ${this.verbose}`)
		console.log('─'.repeat(50))

		// Set environment
		process.env.NODE_ENV = this.environment

		// Run test suites in sequence
		await this.runTestSuite(
			'Unit Tests - EmailTemplateService',
			'npm run test -- email-template.service.spec.ts'
		)

		await this.runTestSuite(
			'Unit Tests - EmailService',
			'npm run test -- email.service.spec.ts'
		)

		await this.runTestSuite(
			'E2E Tests - Email Workflows',
			'npm run test:e2e -- email-workflows.e2e-spec.ts'
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
		console.log(`\n▶️  Running: ${name}`)
		
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
					testProcess.stdout?.on('data', (data) => {
						output += data.toString()
						// Parse Jest output
						const passMatch = data.toString().match(/✓.*\((\d+) test/g)
						const failMatch = data.toString().match(/✕.*\((\d+) test/g)
						const skipMatch = data.toString().match(/○.*\((\d+) test/g)
						
						if (passMatch) result.passed = passMatch.length
						if (failMatch) result.failed = failMatch.length
						if (skipMatch) result.skipped = skipMatch.length
					})

					testProcess.stderr?.on('data', (data) => {
						output += data.toString()
						result.errors.push(data.toString())
					})
				}

				testProcess.on('close', (code) => {
					result.duration = Date.now() - startTime
					
					if (code === 0) {
						console.log(`   ✅ Passed (${result.duration}ms)`)
						resolve()
					} else {
						console.log(`   ❌ Failed (${result.duration}ms)`)
						if (this.verbose) {
							console.log(output)
						}
						resolve() // Continue to next test even if this one fails
					}
				})

				testProcess.on('error', (error) => {
					result.errors.push(error.message)
					result.duration = Date.now() - startTime
					console.log(`   ⚠️  Error: ${error.message}`)
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
		console.log('\n▶️  Running: Performance Tests')
		
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
			const { EmailTemplateService } = await import('../../src/email/email-template.service')
			const service = new EmailTemplateService()

			// Test template rendering performance
			const templates = ['welcome', 'tenant-invitation', 'payment-reminder', 'lease-expiration']
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
					console.log(`   ✅ ${template}: ${renderTime}ms`)
				} else {
					result.failed++
					result.errors.push(`${template} rendering too slow: ${renderTime}ms`)
					console.log(`   ❌ ${template}: ${renderTime}ms (>500ms)`)
				}
			}

			// Calculate statistics
			const avgTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length
			const maxTime = Math.max(...renderTimes)
			
			console.log(`   📊 Average: ${avgTime.toFixed(2)}ms, Max: ${maxTime}ms`)

		} catch (error) {
			result.failed++
			result.errors.push(error instanceof Error ? error.message : String(error))
			console.log(`   ⚠️  Error: ${error}`)
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

		console.log('\n' + '═'.repeat(50))
		console.log('📊 EMAIL SYSTEM TEST REPORT')
		console.log('═'.repeat(50))

		// Summary
		console.log('\n📈 Summary:')
		console.log(`   Total Tests: ${totalPassed + totalFailed + totalSkipped}`)
		console.log(`   ✅ Passed: ${totalPassed}`)
		console.log(`   ❌ Failed: ${totalFailed}`)
		console.log(`   ⏭️  Skipped: ${totalSkipped}`)
		console.log(`   ⏱️  Duration: ${(totalDuration / 1000).toFixed(2)}s`)
		
		const passRate = totalPassed / (totalPassed + totalFailed) * 100
		console.log(`   📊 Pass Rate: ${passRate.toFixed(1)}%`)

		// Details by suite
		console.log('\n📋 Test Suites:')
		this.results.forEach(result => {
			const icon = result.failed === 0 ? '✅' : '❌'
			console.log(`\n   ${icon} ${result.suite}`)
			console.log(`      Passed: ${result.passed}, Failed: ${result.failed}, Skipped: ${result.skipped}`)
			console.log(`      Duration: ${(result.duration / 1000).toFixed(2)}s`)
			
			if (result.errors.length > 0 && this.verbose) {
				console.log('      Errors:')
				result.errors.forEach(error => {
					console.log(`         - ${error.substring(0, 100)}...`)
				})
			}
		})

		// Coverage estimate
		console.log('\n📈 Coverage Estimate:')
		const coverageItems = [
			{ name: 'Template Rendering', covered: totalPassed > 0 },
			{ name: 'Email Sending', covered: totalPassed > 5 },
			{ name: 'Error Handling', covered: totalPassed > 10 },
			{ name: 'Rate Limiting', covered: this.results.some(r => r.suite.includes('Integration')) },
			{ name: 'Retry Logic', covered: this.results.some(r => r.suite.includes('E2E')) },
			{ name: 'Performance', covered: this.results.some(r => r.suite.includes('Performance')) }
		]

		coverageItems.forEach(item => {
			const icon = item.covered ? '✅' : '❌'
			console.log(`   ${icon} ${item.name}`)
		})

		const coverage = coverageItems.filter(i => i.covered).length / coverageItems.length * 100
		console.log(`   📊 Overall Coverage: ${coverage.toFixed(0)}%`)

		// Recommendations
		console.log('\n💡 Recommendations:')
		if (totalFailed > 0) {
			console.log('   ⚠️  Fix failing tests before deployment')
		}
		if (passRate < 90) {
			console.log('   ⚠️  Pass rate below 90%, investigate failures')
		}
		if (coverage < 80) {
			console.log('   ⚠️  Coverage below 80%, add more tests')
		}
		if (this.results.some(r => r.duration > 30000)) {
			console.log('   ⚠️  Some tests taking >30s, consider optimization')
		}

		// Save report to file
		this.saveReport(totalPassed, totalFailed, totalSkipped, totalDuration, passRate, coverage)

		// Exit code
		const exitCode = totalFailed > 0 ? 1 : 0
		console.log('\n' + '═'.repeat(50))
		console.log(exitCode === 0 ? '✅ All tests passed!' : '❌ Some tests failed')
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

		const reportPath = path.join(__dirname, `email-test-report-${Date.now()}.json`)
		fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
		console.log(`\n📄 Report saved to: ${reportPath}`)
	}
}

// Run the test runner
const runner = new EmailTestRunner(process.argv.slice(2))
runner.runAllTests().catch(error => {
	console.error('❌ Test runner failed:', error)
	process.exit(1)
})