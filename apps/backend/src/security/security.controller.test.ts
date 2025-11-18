import type { Logger } from '@nestjs/common'
import type { CSPReportBody } from '@repo/shared/types/domain'
import {
	SecurityEventSeverity,
	SecurityEventType
} from '@repo/shared/types/security'
import type { SupabaseService } from '../database/supabase.service'
import type { AppConfigService } from '../config/app-config.service'
import { createMockSupabaseService } from '../test-utils/mocks'
import { securityAuditLogFixture } from './__fixtures__/security-audit-logs.fixture'
import { SecurityMetricsService } from './security-metrics.service'
import { SecurityController } from './security.controller'

type LoggerMethods = Pick<Logger, 'warn' | 'log' | 'error' | 'debug'>

describe('SecurityController', () => {
	let controller: SecurityController
	let securityMetricsService: SecurityMetricsService
	let mockSupabaseService: jest.Mocked<
		Pick<SupabaseService, 'getAdminClient' | 'getUser'>
	>
	let mockLogger: jest.Mocked<LoggerMethods>
	let mockConfigService: jest.Mocked<AppConfigService>

	beforeEach(() => {
		mockLogger = {
			warn: jest.fn(),
			log: jest.fn(),
			error: jest.fn(),
			debug: jest.fn()
		}

		const mockLimit = jest.fn(async () => ({
			data: securityAuditLogFixture,
			error: null
		}))
		const mockOrder = jest.fn(() => ({ limit: mockLimit }))
		const mockGte = jest.fn(() => ({ order: mockOrder }))
		const mockSelect = jest.fn(() => ({ gte: mockGte }))
		const mockFrom = jest.fn(() => ({ select: mockSelect }))

		mockSupabaseService = createMockSupabaseService({
			getAdminClient: jest.fn(() => ({ from: mockFrom }))
		})

		securityMetricsService = new SecurityMetricsService(
		mockSupabaseService as unknown as SupabaseService
		)
		mockConfigService = {
			getConfig: jest.fn(() => ({})),
			getEnv: jest.fn((key: string) => process.env[key])
		} as unknown as jest.Mocked<AppConfigService>

		controller = new SecurityController(securityMetricsService, mockConfigService)

		Object.defineProperty(controller, 'logger', {
			configurable: true,
			get: () => mockLogger as unknown as Logger,
			set: () => undefined
		})
	})

	afterEach(() => {
		jest.resetAllMocks()
	})

	it('handles CSP report and logs warnings', async () => {
		const report: CSPReportBody = {
			'csp-report': {
				'document-uri': 'https://example.com/page',
				referrer: '',
				'violated-directive': "script-src 'self'",
				'effective-directive': 'script-src',
				'original-policy': "default-src 'none'; script-src 'self'",
				disposition: 'report',
				'blocked-uri': 'https://malicious.example.com/script.js',
				'line-number': 10,
				'column-number': 5,
				'source-file': 'https://example.com/app.js',
				'status-code': 200,
				'script-sample': ''
			}
		}

		await expect(controller.handleCSPReport(report)).resolves.toBeUndefined()
		expect(mockLogger.warn).toHaveBeenCalled()
		const warnCall = mockLogger.warn.mock.calls[0]
		expect(warnCall?.[0]).toBe('CSP violation reported')
		expect(warnCall?.[1]).toMatchObject({
			violatedDirective: "script-src 'self'"
		})
	})

	it('returns security metrics structure', async () => {
		const res = await controller.getSecurityMetrics()
		expect(res).toHaveProperty('success', true)
		expect(res.data.totalEvents).toBe(securityAuditLogFixture.length)
		expect(res.data.eventsByType[SecurityEventType.AUTH_FAILURE]).toBe(1)
		expect(res.data.eventsBySeverity[SecurityEventSeverity.CRITICAL]).toBe(1)
		expect(mockLogger.log).toHaveBeenCalledWith('Security metrics requested')
	})

	it('resolves a security event and logs resolution', async () => {
		const eventId = 'evt-123'
		const body = { resolution: 'marked as false positive' }
		const res = await controller.resolveSecurityEvent(eventId, body)
		expect(res).toHaveProperty('success', true)
		expect(res).toHaveProperty('eventId', eventId)
		expect(res).toHaveProperty('message', 'Security event resolved')
		// verify logging occurred for resolution
		expect(mockLogger.log).toHaveBeenCalled()
		const resolutionCall = mockLogger.log.mock.calls.find(
			call => call[0] === 'Security event resolved'
		)
		expect(resolutionCall?.[1]).toMatchObject({ resolution: body.resolution })
	})

	it('returns security health with status and alerts', async () => {
		const res = await controller.getSecurityHealth()
		expect(res.status).toBe('critical')
		expect(res.alerts).toEqual(
			expect.arrayContaining([
				'1 critical security events require immediate attention',
				'2 potentially malicious requests were blocked'
			])
		)
		expect(res.metrics.totalEvents).toBe(securityAuditLogFixture.length)
	})

	it('returns dashboard data with overview and trends', async () => {
		const res = await controller.getSecurityDashboard()
		expect(res).toHaveProperty('success', true)
		expect(res).toHaveProperty('data')
		expect(res.data.overview.totalEvents).toBe(securityAuditLogFixture.length)
		expect(res.data.overview.criticalEvents).toBe(1)
		expect(Array.isArray(res.data.trends)).toBe(true)
		expect(Array.isArray(res.data.topThreateningIPs)).toBe(true)
		expect(res).toHaveProperty('timestamp')
	})

	it('returns security status with components and environment', async () => {
		const res = await controller.getSecurityStatus()
		expect(res).toHaveProperty('success', true)
		expect(res).toHaveProperty('components')
		expect(res).toHaveProperty('securityLevel')
		expect(res).toHaveProperty('environment')
		expect(res).toHaveProperty('timestamp')
	})
})
