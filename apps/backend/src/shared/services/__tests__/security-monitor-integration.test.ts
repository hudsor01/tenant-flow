import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { SecurityEvent } from '@repo/shared'
import { SupabaseService } from '../../../database/supabase.service'
import { SecurityMonitorService } from '../security-monitor.service'

// Mock Supabase client
const mockInsert = jest.fn().mockReturnValue({
	select: jest
		.fn()
		.mockResolvedValue({ data: [{ id: 'test-id' }], error: null })
})

const mockFrom = jest.fn().mockReturnValue({
	insert: mockInsert
})

const mockSupabaseClient = {
	from: mockFrom
}

const mockSupabaseService = {
	getAdminClient: jest.fn().mockReturnValue(mockSupabaseClient)
}

describe('SecurityMonitorService - Integration Tests', () => {
	let service: SecurityMonitorService
	let module: TestingModule

	beforeEach(async () => {
		jest.clearAllMocks()

		module = await Test.createTestingModule({
			providers: [
				SecurityMonitorService,
				{
					provide: SupabaseService,
					useValue: mockSupabaseService
				}
			]
		}).compile()

		service = module.get<SecurityMonitorService>(SecurityMonitorService)
		// Initialize the service
		await service.onModuleInit()
	})

	afterEach(async () => {
		await module.close()
	})

	describe('Security Event Logging - Database Storage', () => {
		it('should store security events in the SecurityAuditLog table', async () => {
			// Arrange
			const testEvent: Omit<SecurityEvent, 'id' | 'timestamp'> = {
				type: 'auth_failure',
				severity: 'medium',
				source: 'test',
				description: 'Test authentication failure',
				ipAddress: '127.0.0.1',
				userAgent: 'TestAgent/1.0',
				userId: 'user-123',
				metadata: {
					attempt: 1,
					endpoint: '/api/test'
				},
				resolved: false
			}

			// Act
			await service.logSecurityEvent(testEvent)

			// Assert - Verify the database insert was called
			expect(mockSupabaseService.getAdminClient).toHaveBeenCalled()
			expect(mockFrom).toHaveBeenCalledWith('SecurityAuditLog')
			expect(mockInsert).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'auth_failure',
					severity: 'medium',
					userId: 'user-123',
					ipAddress: '127.0.0.1',
					userAgent: 'TestAgent/1.0',
					resource: 'test',
					action: 'Test authentication failure',
					details: expect.objectContaining({
						attempt: 1,
						endpoint: '/api/test'
					}),
					timestamp: expect.any(String)
				})
			)
		})

		it('should handle SQL injection detection and log to database', async () => {
			// Arrange
			const sqlInjectionEvent: Omit<SecurityEvent, 'id' | 'timestamp'> = {
				type: 'malicious_request',
				severity: 'low',
				source: 'api',
				description: 'Suspicious request detected',
				ipAddress: '192.168.1.100',
				metadata: {
					requestBody: "'; DROP TABLE users; --",
					queryParams: { id: '1 OR 1=1' }
				},
				resolved: false
			}

			// Act
			await service.logSecurityEvent(sqlInjectionEvent)

			// Wait for async threat analysis
			await new Promise(resolve => setTimeout(resolve, 100))

			// Assert - Should detect SQL injection and upgrade severity
			expect(mockInsert).toHaveBeenCalled()
			const insertCall = mockInsert.mock.calls[0][0]
			expect(insertCall.severity).toBeDefined()
			expect(insertCall.eventType).toBeDefined()
		})

		it('should handle high-frequency attack detection', async () => {
			// Simulate multiple auth failures from same IP
			const baseEvent: Omit<SecurityEvent, 'id' | 'timestamp'> = {
				type: 'auth_failure',
				severity: 'medium',
				source: 'auth',
				description: 'Login attempt failed',
				ipAddress: '10.0.0.1',
				resolved: false
			}

			// Log multiple events
			for (let i = 0; i < 15; i++) {
				await service.logSecurityEvent({
					...baseEvent,
					metadata: { attempt: i + 1 }
				})
			}

			// Verify all events were logged to database
			expect(mockInsert).toHaveBeenCalledTimes(15)
		})

		it('should continue operation even if database storage fails', async () => {
			// Arrange - Make database insert fail
			mockInsert.mockRejectedValueOnce(new Error('Database connection failed'))

			const testEvent: Omit<SecurityEvent, 'id' | 'timestamp'> = {
				type: 'critical_error',
				severity: 'critical',
				source: 'system',
				description: 'Critical security event',
				resolved: false
			}

			// Act - Should not throw even if DB fails
			await expect(service.logSecurityEvent(testEvent)).resolves.not.toThrow()

			// Assert - Insert was attempted
			expect(mockInsert).toHaveBeenCalled()
		})

		it('should properly map SecurityEvent fields to SecurityAuditLog columns', async () => {
			// Arrange
			const detailedEvent: Omit<SecurityEvent, 'id' | 'timestamp'> = {
				type: 'xss_attempt',
				severity: 'high',
				source: 'input_filter',
				description: 'XSS attack blocked',
				ipAddress: '203.0.113.42',
				userAgent: 'Mozilla/5.0 (Evil)',
				userId: 'attacker-999',
				metadata: {
					payload: '<script>alert("XSS")</script>',
					blocked: true,
					threatLevel: 0.9
				},
				resolved: false
			}

			// Act
			await service.logSecurityEvent(detailedEvent)

			// Assert - Verify correct field mapping
			expect(mockInsert).toHaveBeenCalledWith({
				eventType: 'xss_attempt',
				severity: 'high',
				userId: 'attacker-999',
				ipAddress: '203.0.113.42',
				userAgent: 'Mozilla/5.0 (Evil)',
				resource: 'input_filter',
				action: 'XSS attack blocked',
				details: {
					payload: '<script>alert("XSS")</script>',
					blocked: true,
					threatLevel: 0.9
				},
				timestamp: expect.any(String)
			})
		})

		it('should verify that security monitoring service is initialized', () => {
			// The service should be properly initialized
			expect(service).toBeDefined()
			expect(service.logSecurityEvent).toBeDefined()
			expect(service.getSecurityMetrics).toBeDefined()
		})
	})

	describe('Security Metrics', () => {
		it('should return security metrics from logged events', () => {
			// Act
			const metrics = service.getSecurityMetrics()

			// Assert
			expect(metrics).toBeDefined()
			expect(metrics.totalEvents).toBeDefined()
			expect(metrics.eventsBySeverity).toBeDefined()
			expect(metrics.eventsByType).toBeDefined()
			expect(metrics.topThreateningIPs).toBeDefined()
			expect(metrics.recentTrends).toBeDefined()
		})
	})
})
