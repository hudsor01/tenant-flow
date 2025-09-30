import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { CSPReportBody } from '@repo/shared/types/domain'
import {
	SecurityEventSeverity,
	SecurityEventType
} from '@repo/shared/types/security'
import { REPOSITORY_TOKENS } from '../repositories/repositories.module'
import type { ISecurityRepository } from '../repositories/interfaces/security-repository.interface'
import { securityAuditLogFixture } from './__fixtures__/security-audit-logs.fixture'
import { SecurityController } from './security.controller'
import { SecurityMetricsService } from './security-metrics.service'

describe('SecurityController', () => {
	let controller: SecurityController
  let mockSecurityRepository: jest.Mocked<ISecurityRepository>

	beforeEach(async () => {
		mockSecurityRepository = {
			fetchAuditLogs: jest.fn().mockResolvedValue(securityAuditLogFixture)
		} as unknown as jest.Mocked<ISecurityRepository>

		const module: TestingModule = await Test.createTestingModule({
			controllers: [SecurityController],
			providers: [
				SecurityMetricsService,
				{ provide: REPOSITORY_TOKENS.SECURITY, useValue: mockSecurityRepository }
			]
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
		it('returns metrics calculated from repository data', async () => {
			const result = await controller.getSecurityMetrics()

			expect(result).toHaveProperty('success', true)
			expect(result).toHaveProperty('data')
			expect(result.data.totalEvents).toBe(securityAuditLogFixture.length)
			expect(result.data.eventsBySeverity[SecurityEventSeverity.CRITICAL]).toBe(1)
			expect(result.data.eventsByType[SecurityEventType.AUTH_FAILURE]).toBe(1)
			expect(Array.isArray(result.data.recentEvents)).toBe(true)
			expect(Array.isArray(result.data.recentTrends)).toBe(true)
			expect(result.data.topThreateningIPs?.[0]).toEqual({
				ip: '192.0.2.1',
				count: 2
			})
		})

		it('initializes all event types even when absent', async () => {
			mockSecurityRepository.fetchAuditLogs.mockResolvedValueOnce([])
			const result = await controller.getSecurityMetrics()

			Object.values(SecurityEventType).forEach(eventType => {
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
		it('returns critical status when critical events detected', async () => {
			const result = await controller.getSecurityHealth()

			expect(result.status).toBe('critical')
			expect(result.alerts).toEqual(
				expect.arrayContaining([
					'1 critical security events require immediate attention',
					'2 potentially malicious requests were blocked'
				])
			)
			expect(result.metrics.totalEvents).toBe(securityAuditLogFixture.length)
		})

		it('returns healthy status when no events present', async () => {
			mockSecurityRepository.fetchAuditLogs.mockResolvedValueOnce([])
			const result = await controller.getSecurityHealth()

			expect(result.status).toBe('healthy')
			expect(result.alerts).toEqual([])
		})
	})

	describe('getSecurityDashboard', () => {
		it('should return dashboard data with correct structure', async () => {
		const result = await controller.getSecurityDashboard()

		expect(result).toHaveProperty('success', true)
		expect(result).toHaveProperty('data')
		expect(result).toHaveProperty('timestamp')
		expect(result.data).toHaveProperty('overview')
		expect(result.data.overview.totalEvents).toBe(securityAuditLogFixture.length)
		expect(result.data.overview.criticalEvents).toBe(1)
		expect(Array.isArray(result.data.overview.recentEvents)).toBe(true)
		expect(Array.isArray(result.data.trends)).toBe(true)
		expect(Array.isArray(result.data.topThreateningIPs)).toBe(true)
		})

		it('should return overview with correct structure', async () => {
			const result = await controller.getSecurityDashboard()
			const overview = result.data.overview

			expect(overview).toHaveProperty('recentEvents')
			expect(Array.isArray(overview.recentEvents)).toBe(true)
		})

		it('should return events by severity and type', async () => {
			const result = await controller.getSecurityDashboard()

			expect(result.data).toHaveProperty('eventsBySeverity')
			expect(result.data).toHaveProperty('eventsByType')
			expect(typeof result.data.eventsBySeverity).toBe('object')
			expect(typeof result.data.eventsByType).toBe('object')
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
