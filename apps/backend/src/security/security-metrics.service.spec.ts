import {
	SecurityEventSeverity,
	SecurityEventType
} from '@repo/shared/types/security'
import { createMockSupabaseService } from '../__test__/supabase-mock'
import type { SupabaseService } from '../database/supabase.service'
import { securityAuditLogFixture } from './__fixtures__/security-audit-logs.fixture'
import { SecurityMetricsService } from './security-metrics.service'

describe('SecurityMetricsService', () => {
	let service: SecurityMetricsService
	let mockSupabaseService: ReturnType<typeof createMockSupabaseService>

	beforeEach(() => {
		mockSupabaseService = createMockSupabaseService({
			data: securityAuditLogFixture as any,
			error: null as any
		})
		// Ensure RPC/default returns the audit log fixture when queried
		const mockAdmin = mockSupabaseService.getAdminClient()
		mockAdmin.from.mockReturnThis()
		mockAdmin.select.mockReturnThis()
		mockAdmin.gte.mockReturnThis()
		mockAdmin.order.mockReturnThis()
		// The terminal chain method should resolve to the RPC/database response
		mockAdmin.limit.mockResolvedValue({
			data: securityAuditLogFixture,
			error: null
		})

		service = new SecurityMetricsService(
			mockSupabaseService as unknown as SupabaseService
		)
		// Ensure getAdminClient method exists on the service
		mockSupabaseService.getAdminClient = jest.fn().mockReturnValue(mockAdmin)
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
		// Simulate empty DB response for this test
		mockSupabaseService
			.getAdminClient()
			.limit.mockResolvedValueOnce({ data: [], error: null })

		const metrics = await service.getMetrics()

		expect(metrics.totalEvents).toBe(0)
		Object.values(SecurityEventType).forEach(eventType => {
			expect(metrics.eventsByType[eventType]).toBe(0)
		})
	})
})
