import { SecurityEventSeverity, SecurityEventType } from '@repo/shared/types/security'
import type { ISecurityRepository } from '../repositories/interfaces/security-repository.interface'
import { securityAuditLogFixture } from './__fixtures__/security-audit-logs.fixture'
import { SecurityMetricsService } from './security-metrics.service'

describe('SecurityMetricsService', () => {
	let service: SecurityMetricsService
	let mockSecurityRepository: jest.Mocked<ISecurityRepository>

	beforeEach(() => {
		mockSecurityRepository = {
			fetchAuditLogs: jest.fn().mockResolvedValue(securityAuditLogFixture)
		} as unknown as jest.Mocked<ISecurityRepository>

		service = new SecurityMetricsService(mockSecurityRepository)
	})

	it('computes aggregate metrics from audit logs', async () => {
		const metrics = await service.getMetrics()

		expect(metrics.totalEvents).toBe(securityAuditLogFixture.length)
		expect(metrics.eventsBySeverity[SecurityEventSeverity.CRITICAL]).toBe(1)
		expect(metrics.eventsByType[SecurityEventType.AUTH_FAILURE]).toBe(1)
		expect(metrics.topThreateningIPs?.[0]).toEqual({
			ip: '192.0.2.1',
			count: 2
		})
		expect(metrics.failedAuthAttempts).toBe(1)
		expect(metrics.blockedRequests).toBe(2)
		expect(metrics.recentEvents.length).toBeGreaterThan(0)
		expect(metrics.recentTrends?.length).toBeGreaterThan(0)
	})

	it('initializes metrics when repository returns empty array', async () => {
		mockSecurityRepository.fetchAuditLogs.mockResolvedValueOnce([])

		const metrics = await service.getMetrics()

		expect(metrics.totalEvents).toBe(0)
		Object.values(SecurityEventType).forEach(eventType => {
			expect(metrics.eventsByType[eventType]).toBe(0)
		})
	})
})
