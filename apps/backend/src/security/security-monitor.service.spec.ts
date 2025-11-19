import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing'
import { SilentLogger } from '../__test__/silent-logger'
import { SecurityMonitorService } from './security-monitor.service'
import { randomUUID } from 'crypto'

describe('SecurityMonitorService', () => {
	let service: SecurityMonitorService
	let loggerSpy: jest.SpyInstance

	const generateUUID = () => randomUUID()

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [SecurityMonitorService],
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<SecurityMonitorService>(SecurityMonitorService)

		// Spy on the logger methods
		loggerSpy = jest.spyOn(service['logger'], 'warn')
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('logSecurityEvent', () => {
		it('should log a basic security event with default details', () => {
			const event = 'Unauthorized Access Attempt'

			service.logSecurityEvent(event)

			expect(loggerSpy).toHaveBeenCalledWith(
				{
					security: {
						event,
						timestamp: expect.any(String)
					}
				},
				`Security Event: ${event}`
			)
		})

		it('should log a security event with custom details', () => {
			const event = 'SQL Injection Attempt'
			const details = {
				user_id: generateUUID(),
				ip: '192.168.1.100',
				userAgent: 'Mozilla/5.0...',
				endpoint: '/api/users'
			}

			service.logSecurityEvent(event, details)

			expect(loggerSpy).toHaveBeenCalledWith(
				{
					security: {
						event,
						...details,
						timestamp: expect.any(String)
					}
				},
				`Security Event: ${event}`
			)
		})

		it('should include properly formatted timestamp', () => {
			const event = 'Test Event'

			service.logSecurityEvent(event)

			const logCall = loggerSpy.mock.calls[0]
			const logData = logCall[0] as any
			const timestamp = logData.security.timestamp

			// Should be a valid ISO string
			expect(() => new Date(timestamp).toISOString()).not.toThrow()
			expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
		})

		it('should handle empty event string', () => {
			const event = ''
			const details = { severity: 'low' }

			service.logSecurityEvent(event, details)

			expect(loggerSpy).toHaveBeenCalledWith(
				{
					security: {
						event: '',
						severity: 'low',
						timestamp: expect.any(String)
					}
				},
				'Security Event: '
			)
		})

		it('should handle complex nested details', () => {
			const event = 'Complex Security Event'
			const details = {
				user: {
					id: generateUUID(),
					email: 'test@example.com',
					user_type: 'USER'
				},
				request: {
					method: 'POST',
					url: '/api/sensitive-data',
					headers: {
						'user-agent': 'suspicious-bot',
						'x-forwarded-for': '192.168.1.100'
					}
				},
				threat: {
					type: 'injection',
					confidence: 0.95,
					blocked: true
				}
			}

			service.logSecurityEvent(event, details)

			expect(loggerSpy).toHaveBeenCalledWith(
				{
					security: {
						event,
						...details,
						timestamp: expect.any(String)
					}
				},
				`Security Event: ${event}`
			)
		})
	})

	describe('logFailedLogin', () => {
		it('should log failed login attempt with email and IP', () => {
			const email = 'test@example.com'
			const ip = '192.168.1.100'

			service.logFailedLogin(email, ip)

			expect(loggerSpy).toHaveBeenCalledWith(
				{
					security: {
						event: 'Failed Login',
						email,
						ip,
						timestamp: expect.any(String)
					}
				},
				'Security Event: Failed Login'
			)
		})

		it('should handle empty email and IP', () => {
			service.logFailedLogin('', '')

			expect(loggerSpy).toHaveBeenCalledWith(
				{
					security: {
						event: 'Failed Login',
						email: '',
						ip: '',
						timestamp: expect.any(String)
					}
				},
				'Security Event: Failed Login'
			)
		})

		it('should handle special characters in email', () => {
			const email = 'user+test@domain-name.co.uk'
			const ip = '::1'

			service.logFailedLogin(email, ip)

			expect(loggerSpy).toHaveBeenCalledWith(
				{
					security: {
						event: 'Failed Login',
						email,
						ip,
						timestamp: expect.any(String)
					}
				},
				'Security Event: Failed Login'
			)
		})

		it('should handle IPv6 addresses', () => {
			const email = 'test@example.com'
			const ip = '2001:0db8:85a3:0000:0000:8a2e:0370:7334'

			service.logFailedLogin(email, ip)

			expect(loggerSpy).toHaveBeenCalledWith(
				{
					security: {
						event: 'Failed Login',
						email,
						ip,
						timestamp: expect.any(String)
					}
				},
				'Security Event: Failed Login'
			)
		})
	})

	describe('logSuspiciousActivity', () => {
		it('should log suspicious activity with user_id and activity description', () => {
			const user_id = generateUUID()
			const activity = 'Multiple rapid API calls detected'

			service.logSuspiciousActivity(user_id, activity)

			expect(loggerSpy).toHaveBeenCalledWith(
				{
					security: {
						event: 'Suspicious Activity',
						user_id,
						activity,
						timestamp: expect.any(String)
					}
				},
				'Security Event: Suspicious Activity'
			)
		})

		it('should handle empty user_id and activity', () => {
			service.logSuspiciousActivity('', '')

			expect(loggerSpy).toHaveBeenCalledWith(
				{
					security: {
						event: 'Suspicious Activity',
						user_id: '',
						activity: '',
						timestamp: expect.any(String)
					}
				},
				'Security Event: Suspicious Activity'
			)
		})

		it('should handle detailed activity descriptions', () => {
			const user_id = generateUUID()
			const activity = 'User attempted to access admin endpoints without proper authorization. Blocked 15 requests in 30 seconds.'

			service.logSuspiciousActivity(user_id, activity)

			expect(loggerSpy).toHaveBeenCalledWith(
				{
					security: {
						event: 'Suspicious Activity',
						user_id,
						activity,
						timestamp: expect.any(String)
					}
				},
				'Security Event: Suspicious Activity'
			)
		})

		it('should validate UUID format in tests', () => {
			const user_id = generateUUID()
			const activity = 'Test activity'

			// Validate that we're using proper UUID format in tests
			expect(user_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

			service.logSuspiciousActivity(user_id, activity)

			expect(loggerSpy).toHaveBeenCalledWith(
				{
					security: {
						event: 'Suspicious Activity',
						user_id,
						activity,
						timestamp: expect.any(String)
					}
				},
				'Security Event: Suspicious Activity'
			)
		})

		it('should handle special characters in activity description', () => {
			const user_id = generateUUID()
			const activity = 'SQL injection attempt: SELECT * FROM users WHERE id=1; DROP TABLE users; --'

			service.logSuspiciousActivity(user_id, activity)

			expect(loggerSpy).toHaveBeenCalledWith(
				{
					security: {
						event: 'Suspicious Activity',
						user_id,
						activity,
						timestamp: expect.any(String)
					}
				},
				'Security Event: Suspicious Activity'
			)
		})
	})

	describe('integration between methods', () => {
		it('should use consistent event naming between logSecurityEvent and specific methods', () => {
			const email = 'test@example.com'
			const ip = '192.168.1.100'

			// Test that logFailedLogin uses the same event name as direct logSecurityEvent call
			service.logFailedLogin(email, ip)
			const failedLoginCall = loggerSpy.mock.calls[0][0] as any

			jest.clearAllMocks()

			service.logSecurityEvent('Failed Login', { email, ip })
			const directCall = loggerSpy.mock.calls[0][0] as any

			expect(failedLoginCall.security.event).toBe(directCall.security.event)
		})

		it('should maintain consistent timestamp format across all methods', () => {
			const user_id = generateUUID()

			service.logSecurityEvent('Test Event 1')
			service.logFailedLogin('test@example.com', '192.168.1.1')
			service.logSuspiciousActivity(user_id, 'Test Activity')

			const calls = loggerSpy.mock.calls
			const timestamps = calls.map(call => (call[0] as any).security.timestamp)

			// All timestamps should be valid ISO strings
			timestamps.forEach(timestamp => {
				expect(() => new Date(timestamp).toISOString()).not.toThrow()
				expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
			})
		})
	})
})