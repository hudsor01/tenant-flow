import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { CSPReportBody } from '@repo/shared'
import { SecurityController } from './security.controller'

describe('SecurityController', () => {
	let controller: SecurityController

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [SecurityController]
		}).compile()

		controller = module.get<SecurityController>(SecurityController)
	})

	it('should be defined', () => {
		expect(controller).toBeDefined()
	})

	describe('handleCSPReport', () => {
		const validCSPReport: CSPReportBody = {
			'csp-report': {
				'document-uri': 'https://example.com',
				referrer: 'https://example.com',
				'violated-directive': 'script-src',
				'effective-directive': 'script-src',
				'original-policy': "default-src 'self'",
				disposition: 'enforce',
				'blocked-uri': 'https://malicious.com/script.js',
				'source-file': 'https://example.com/app.js',
				'line-number': 42,
				'column-number': 10,
				'status-code': 200,
				'script-sample': ''
			}
		}

		it('should handle valid CSP report', async () => {
			// No return value expected - just ensure it doesn't throw
			await expect(
				controller.handleCSPReport(validCSPReport)
			).resolves.toBeUndefined()
		})

		it('should handle CSP report with minimal data', async () => {
			const minimalReport: CSPReportBody = {
				'csp-report': {
					'document-uri': 'https://example.com',
					referrer: '',
					'violated-directive': 'script-src',
					'effective-directive': 'script-src',
					'original-policy': "default-src 'self'",
					disposition: 'enforce',
					'blocked-uri': 'eval',
					'source-file': '',
					'line-number': 0,
					'column-number': 0,
					'status-code': 0,
					'script-sample': ''
				}
			}

			await expect(
				controller.handleCSPReport(minimalReport)
			).resolves.toBeUndefined()
		})
	})

	describe('getSecurityMetrics', () => {
		it('should return security metrics with correct structure', async () => {
			const result = await controller.getSecurityMetrics()

			expect(result).toHaveProperty('success', true)
			expect(result).toHaveProperty('data')
			expect(result).toHaveProperty('timestamp')
			expect(result.data).toHaveProperty('totalEvents', 0)
			expect(result.data).toHaveProperty('eventsBySeverity')
			expect(result.data).toHaveProperty('recentTrends')
			expect(result.data).toHaveProperty('eventsByType')
			expect(result.data).toHaveProperty('topThreateningIPs', [])
		})

		it('should include all required event types in eventsByType', async () => {
			const result = await controller.getSecurityMetrics()
			const expectedEventTypes = [
				'sql_injection_attempt',
				'xss_attempt',
				'path_traversal_attempt',
				'command_injection_attempt',
				'rate_limit_exceeded',
				'suspicious_input',
				'malformed_request',
				'malicious_request',
				'unauthorized_access',
				'brute_force_attempt',
				'csrf_token_missing',
				'csrf_token_invalid',
				'file_upload_threat',
				'injection_pattern_detected',
				'sanitization_triggered',
				'validation_failed',
				'auth_failure',
				'suspicious_activity',
				'account_takeover'
			]

			expectedEventTypes.forEach(eventType => {
				expect(result.data.eventsByType).toHaveProperty(eventType, 0)
			})
		})
	})

	describe('resolveSecurityEvent', () => {
		it('should resolve security event successfully', async () => {
			const eventId = 'test-event-123'
			const resolution = 'False positive - whitelisted IP'

			const result = await controller.resolveSecurityEvent(eventId, {
				resolution
			})

			expect(result).toHaveProperty('success', true)
			expect(result).toHaveProperty('message', 'Security event resolved')
			expect(result).toHaveProperty('eventId', eventId)
			expect(result).toHaveProperty('timestamp')
		})

		it('should handle empty resolution', async () => {
			const eventId = 'test-event-456'
			const resolution = ''

			const result = await controller.resolveSecurityEvent(eventId, {
				resolution
			})

			expect(result).toHaveProperty('success', true)
			expect(result).toHaveProperty('eventId', eventId)
		})
	})

	describe('getSecurityHealth', () => {
		it('should return healthy status with no critical events', async () => {
			const result = await controller.getSecurityHealth()

			expect(result).toHaveProperty('status', 'healthy')
			expect(result).toHaveProperty('alerts', [])
			expect(result).toHaveProperty('metrics')
			expect(result).toHaveProperty('timestamp')
			expect(result.metrics).toHaveProperty('totalEvents', 0)
			expect(result.metrics).toHaveProperty('recentTrends')
			expect(result.metrics).toHaveProperty('eventsBySeverity')
		})

		it('should return correct alert structure', async () => {
			const result = await controller.getSecurityHealth()

			expect(Array.isArray(result.alerts)).toBe(true)
			expect(result.status).toMatch(/^(healthy|warning|critical)$/)
		})
	})

	describe('getSecurityDashboard', () => {
		it('should return dashboard data with correct structure', async () => {
			const result = await controller.getSecurityDashboard()

			expect(result).toHaveProperty('success', true)
			expect(result).toHaveProperty('data')
			expect(result).toHaveProperty('timestamp')
			expect(result.data).toHaveProperty('overview')
			expect(result.data).toHaveProperty('trends')
			expect(result.data).toHaveProperty('topThreatTypes')
			expect(result.data).toHaveProperty('topThreateningIPs')
			expect(result.data).toHaveProperty('timeline')
		})

		it('should return overview with correct severity counts', async () => {
			const result = await controller.getSecurityDashboard()
			const overview = result.data.overview

			expect(overview).toHaveProperty('totalEvents', 0)
			expect(overview).toHaveProperty('criticalEvents', 0)
			expect(overview).toHaveProperty('highEvents', 0)
			expect(overview).toHaveProperty('mediumEvents', 0)
			expect(overview).toHaveProperty('lowEvents', 0)
		})

		it('should return top threat types as sorted array', async () => {
			const result = await controller.getSecurityDashboard()
			const topThreatTypes = result.data.topThreatTypes

			expect(Array.isArray(topThreatTypes)).toBe(true)
			expect(topThreatTypes.length).toBeLessThanOrEqual(10)

			// Each threat type should have type and count properties
			topThreatTypes.forEach(threat => {
				expect(threat).toHaveProperty('type')
				expect(threat).toHaveProperty('count')
				expect(typeof threat.count).toBe('number')
			})
		})

		it('should return timeline with time periods', async () => {
			const result = await controller.getSecurityDashboard()
			const timeline = result.data.timeline

			expect(timeline).toHaveProperty('lastHour', 0)
			expect(timeline).toHaveProperty('last24Hours', 0)
			expect(timeline).toHaveProperty('last7Days', 0)
		})
	})

	describe('getSecurityStatus', () => {
		it('should return system status with all components', async () => {
			const result = await controller.getSecurityStatus()

			expect(result).toHaveProperty('success', true)
			expect(result).toHaveProperty('components')
			expect(result).toHaveProperty('securityLevel', 'maximum')
			expect(result).toHaveProperty('environment')
			expect(result).toHaveProperty('timestamp')
		})

		it('should include all required security components', async () => {
			const result = await controller.getSecurityStatus()
			const components = result.components

			const expectedComponents = [
				'securityMonitor',
				'rateLimiting',
				'inputSanitization',
				'securityHeaders',
				'authentication',
				'errorHandling'
			]

			expectedComponents.forEach(component => {
				expect(components).toHaveProperty(component)
				const componentData = components[component as keyof typeof components]
				expect(componentData).toHaveProperty('status', 'active')
				expect(componentData).toHaveProperty('description')
			})
		})

		it('should return current environment', async () => {
			const result = await controller.getSecurityStatus()

			expect(result.environment).toBeDefined()
			expect(typeof result.environment).toBe('string')
		})
	})
})
