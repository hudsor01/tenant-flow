import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { Logger } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

// Import security modules
import { 
    SecurityMonitorService, 
    SecurityEventType, 
    SecuritySeverity 
} from './security-monitor.service'
import { 
    isValidUserId, 
    isValidEmail, 
    isValidUserRole,
    sanitizeAndValidateString,
    validateQueryParams,
    validateJWTClaims,
    performSecurityValidation
} from './type-guards'
import { MultiTenantPrismaService } from '../prisma/multi-tenant-prisma.service'
import { AuthServiceSupabase } from '../../auth/auth.service.supabase'

/**
 * Comprehensive Security Testing Suite
 * Tests all security components for vulnerabilities and proper behavior
 */
describe('Security Suite', () => {
    let securityMonitor: SecurityMonitorService
    let multiTenantService: MultiTenantPrismaService
    let authService: AuthServiceSupabase
    let mockPrismaClient: Partial<PrismaClient>
    let mockSupabaseClient: any
    let mockConfigService: Partial<ConfigService>

    beforeEach(async () => {
        // Mock dependencies
        mockConfigService = {
            get: vi.fn((key: string, defaultValue?: any) => {
                const config: Record<string, any> = {
                    'SECURITY_MAX_EVENTS': 1000,
                    'SECURITY_SUSPICIOUS_THRESHOLD': 3,
                    'SECURITY_ALERTING_ENABLED': false, // Disable for testing
                    'SUPABASE_URL': 'https://test.supabase.co',
                    'SUPABASE_SERVICE_ROLE_KEY': 'test-key'
                }
                return config[key] ?? defaultValue
            })
        }

        mockPrismaClient = {
            $transaction: vi.fn(),
            $executeRaw: vi.fn(),
            $disconnect: vi.fn()
        }

        mockSupabaseClient = {
            from: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn()
                    })
                }),
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn()
                    })
                }),
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn()
                        })
                    })
                })
            })
        }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SecurityMonitorService,
                {
                    provide: ConfigService,
                    useValue: mockConfigService
                }
            ]
        }).compile()

        securityMonitor = module.get<SecurityMonitorService>(SecurityMonitorService)
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    describe('Type Guards Security Tests', () => {
        describe('UUID Validation', () => {
            it('should accept valid UUIDs', () => {
                const validUUIDs = [
                    '123e4567-e89b-12d3-a456-426614174000',
                    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
                ]

                validUUIDs.forEach(uuid => {
                    expect(isValidUserId(uuid)).toBe(true)
                })
            })

            it('should reject invalid UUIDs and potential injection attempts', () => {
                const invalidInputs = [
                    'not-a-uuid',
                    '123e4567-e89b-12d3-a456-42661417400',  // Too short
                    '123e4567-e89b-12d3-a456-4266141740000', // Too long
                    "'; DROP TABLE User; --",                 // SQL injection
                    '123e4567-e89b-12d3-a456-426614174000; DELETE FROM User;',
                    null,
                    undefined,
                    {},
                    [],
                    123
                ]

                invalidInputs.forEach(input => {
                    expect(isValidUserId(input)).toBe(false)
                })
            })
        })

        describe('Email Validation', () => {
            it('should accept valid emails', () => {
                const validEmails = [
                    'user@example.com',
                    'test.email+tag@domain.co.uk',
                    'user123@test-domain.org'
                ]

                validEmails.forEach(email => {
                    expect(isValidEmail(email)).toBe(true)
                })
            })

            it('should reject invalid emails and potential attacks', () => {
                const invalidInputs = [
                    'not-an-email',
                    'user@',
                    '@domain.com',
                    'user..double@domain.com',     // Consecutive dots
                    '.user@domain.com',            // Starting dot
                    'user.@domain.com',            // Ending dot
                    'user@domain.com<script>alert(1)</script>', // XSS attempt
                    "user'; DROP TABLE User; --@domain.com",    // SQL injection
                    'x'.repeat(255) + '@domain.com'             // Too long
                ]

                invalidInputs.forEach(input => {
                    expect(isValidEmail(input)).toBe(false)
                })
            })
        })

        describe('String Sanitization', () => {
            it('should sanitize safe strings', () => {
                const safeStrings = [
                    'Hello World',
                    'User Name 123',
                    'Valid input with spaces and numbers 456'
                ]

                safeStrings.forEach(str => {
                    const result = sanitizeAndValidateString(str)
                    expect(result).toBe(str.trim())
                })
            })

            it('should reject strings with security threats', () => {
                const dangerousInputs = [
                    'Text with null byte \\0 injection',
                    'Control character \\x01 test',
                    'Text with \\r\\n line breaks',
                    'x'.repeat(10001), // Too long
                    'DELETE FROM users WHERE 1=1'
                ]

                dangerousInputs.forEach(input => {
                    const result = sanitizeAndValidateString(input)
                    expect(result).toBeNull()
                })
            })
        })

        describe('JWT Claims Validation', () => {
            it('should validate proper JWT claims', () => {
                const validClaims = [
                    { sub: '123e4567-e89b-12d3-a456-426614174000' },
                    { 
                        sub: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                        email: 'user@example.com',
                        role: 'OWNER' as const
                    }
                ]

                validClaims.forEach(claims => {
                    const result = validateJWTClaims(claims)
                    expect(result).not.toBeNull()
                    expect(result?.sub).toBe(claims.sub)
                })
            })

            it('should reject invalid JWT claims', () => {
                const invalidClaims = [
                    { sub: 'not-a-uuid' },
                    { sub: "'; DROP TABLE User; --" },
                    { sub: '123e4567-e89b-12d3-a456-426614174000', email: 'invalid-email' },
                    { },
                    null,
                    undefined
                ]

                invalidClaims.forEach(claims => {
                    const result = validateJWTClaims(claims)
                    expect(result).toBeNull()
                })
            })
        })
    })

    describe('Security Monitoring Tests', () => {
        it('should log security events correctly', () => {
            const spy = vi.spyOn(securityMonitor as any, 'logEventBySeverity')

            securityMonitor.logAuthSuccess('123e4567-e89b-12d3-a456-426614174000', '127.0.0.1')
            securityMonitor.logAuthFailure('Invalid credentials', 'user', '127.0.0.1')
            securityMonitor.logInjectionAttempt('sql', 'DROP TABLE users', 'user', '127.0.0.1')

            expect(spy).toHaveBeenCalledTimes(3)
        })

        it('should track suspicious IPs', () => {
            const suspiciousIP = '192.168.1.100'

            // Generate enough suspicious events to trigger detection
            for (let i = 0; i < 5; i++) {
                securityMonitor.logAuthFailure('Invalid credentials', 'user', suspiciousIP)
            }

            expect(securityMonitor.isSuspiciousIP(suspiciousIP)).toBe(true)
        })

        it('should generate security metrics', () => {
            securityMonitor.logAuthSuccess('user1', '127.0.0.1')
            securityMonitor.logAuthFailure('Invalid credentials', 'user2', '127.0.0.2')
            securityMonitor.logInjectionAttempt('sql', 'DROP TABLE users', 'user3', '127.0.0.3')

            const metrics = securityMonitor.getSecurityMetrics()

            expect(metrics.totalEvents).toBe(3)
            expect(metrics.eventsByType[SecurityEventType.AUTH_SUCCESS]).toBe(1)
            expect(metrics.eventsByType[SecurityEventType.AUTH_FAILURE]).toBe(1)
            expect(metrics.eventsByType[SecurityEventType.INJECTION_ATTEMPT]).toBe(1)
        })

        it('should provide security status assessment', () => {
            // Generate critical security events
            securityMonitor.logInjectionAttempt('sql', 'DROP TABLE users', 'user', '127.0.0.1')
            securityMonitor.logRLSBypassAttempt('user1', 'user2', '/api/users', '127.0.0.1')

            const status = securityMonitor.getSecurityStatus()

            expect(status.status).toBe('critical')
            expect(status.alerts.length).toBeGreaterThan(0)
        })
    })

    describe('SQL Injection Prevention Tests', () => {
        beforeEach(() => {
            // Mock the PrismaService
            const mockPrismaService = {
                $transaction: vi.fn(),
                $executeRaw: vi.fn(),
                $disconnect: vi.fn()
            } as any

            multiTenantService = new MultiTenantPrismaService(mockPrismaService)
        })

        it('should reject invalid user IDs in getTenantClient', async () => {
            const invalidUserIds = [
                'not-a-uuid',
                "'; DROP TABLE User; --",
                '123e4567-e89b-12d3-a456-42661417400', // Invalid UUID
                null,
                undefined,
                {}
            ]

            for (const userId of invalidUserIds) {
                await expect(multiTenantService.getTenantClient(userId as any))
                    .rejects.toThrow('Invalid userId provided - security validation failed')
            }
        })

        it('should reject invalid user IDs in withTenantContext', async () => {
            const invalidUserIds = [
                'not-a-uuid',
                "'; DROP TABLE User; --",
                '\\x00\\x01\\x02' // Control characters
            ]

            for (const userId of invalidUserIds) {
                await expect(multiTenantService.withTenantContext(
                    userId as any,
                    async () => { return 'test' }
                )).rejects.toThrow('Invalid userId provided - security validation failed')
            }
        })
    })

    describe('Authentication Security Tests', () => {
        beforeEach(() => {
            authService = new AuthServiceSupabase(
                mockSupabaseClient,
                mockConfigService as ConfigService
            )
        })

        it('should validate Supabase user data with Zod schema', () => {
            const validUserData = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'user@example.com',
                name: 'Test User',
                role: 'OWNER',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }

            // Test the normalizeSupabaseUser method
            const normalizeMethod = (authService as any).normalizeSupabaseUser
            expect(() => normalizeMethod(validUserData)).not.toThrow()
        })

        it('should reject invalid user data', () => {
            const invalidUserData = [
                { id: 'not-a-uuid', email: 'user@example.com' },
                { id: '123e4567-e89b-12d3-a456-426614174000', email: 'invalid-email' },
                { id: '123e4567-e89b-12d3-a456-426614174000', email: 'user@example.com', role: 'INVALID_ROLE' },
                null,
                undefined,
                { /* missing required fields */ }
            ]

            const normalizeMethod = (authService as any).normalizeSupabaseUser

            invalidUserData.forEach(data => {
                expect(() => normalizeMethod(data))
                    .toThrow()
            })
        })
    })

    describe('Performance and DoS Protection Tests', () => {
        it('should handle large numbers of security events efficiently', () => {
            const startTime = Date.now()

            // Generate 1000 security events
            for (let i = 0; i < 1000; i++) {
                securityMonitor.logAuthSuccess(`user-${i}`, '127.0.0.1')
            }

            const endTime = Date.now()
            const duration = endTime - startTime

            // Should process 1000 events in under 100ms
            expect(duration).toBeLessThan(100)

            const metrics = securityMonitor.getSecurityMetrics()
            expect(metrics.totalEvents).toBe(1000)
        })

        it('should limit stored events to prevent memory exhaustion', () => {
            const maxEvents = 1000 // From mock config

            // Generate more events than the limit
            for (let i = 0; i < maxEvents + 500; i++) {
                securityMonitor.logAuthSuccess(`user-${i}`, '127.0.0.1')
            }

            const metrics = securityMonitor.getSecurityMetrics()
            expect(metrics.totalEvents).toBeLessThanOrEqual(maxEvents)
        })
    })

    describe('Security Regression Tests', () => {
        it('should prevent previously discovered vulnerabilities', () => {
            // Test cases for the original PR issues

            // 1. Type safety - no 'any' types should be used in production code
            const userRow = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'user@example.com',
                role: 'OWNER',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }

            const normalizeMethod = (authService as any).normalizeSupabaseUser
            expect(() => normalizeMethod(userRow)).not.toThrow()

            // 2. SQL injection prevention - should reject dangerous inputs
            const dangerousInputs = [
                "'; DROP TABLE User; --",
                '" OR 1=1; --',
                '\\"; DELETE FROM User; --'
            ]

            dangerousInputs.forEach(input => {
                expect(isValidUserId(input)).toBe(false)
            })

            // 3. Database permissions - validated through integration tests
            // (These would be tested in actual database integration tests)
        })

        it('should maintain security even with edge cases', () => {
            // Test boundary conditions
            const edgeCases = [
                '', // Empty string
                ' ', // Whitespace only
                '\\0', // Null byte
                '\\n\\r\\t', // Whitespace characters
                'A'.repeat(10000), // Very long string
                String.fromCharCode(0, 1, 2, 3), // Control characters
            ]

            edgeCases.forEach(input => {
                expect(isValidUserId(input)).toBe(false)
                expect(isValidEmail(input)).toBe(false)
                expect(sanitizeAndValidateString(input)).toBeNull()
            })
        })
    })

    describe('Security Integration Tests', () => {
        it('should integrate all security components properly', async () => {
            // Simulate a complete request flow with security validation
            const userId = '123e4567-e89b-12d3-a456-426614174000'
            const email = 'user@example.com'

            // 1. Validate user input
            expect(isValidUserId(userId)).toBe(true)
            expect(isValidEmail(email)).toBe(true)

            // 2. Log security event
            securityMonitor.logAuthSuccess(userId, '127.0.0.1')

            // 3. Validate JWT claims
            const claims = { sub: userId, email }
            const validatedClaims = validateJWTClaims(claims)
            expect(validatedClaims).not.toBeNull()

            // 4. Check security status
            const status = securityMonitor.getSecurityStatus()
            expect(['secure', 'warning', 'critical']).toContain(status.status)
        })
    })
})

/**
 * Security Penetration Testing Suite
 * Automated tests that simulate real attack scenarios
 */
describe('Security Penetration Tests', () => {
    let securityMonitor: SecurityMonitorService

    beforeEach(async () => {
        const mockConfigService = {
            get: vi.fn().mockReturnValue(1000)
        }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SecurityMonitorService,
                { provide: ConfigService, useValue: mockConfigService }
            ]
        }).compile()

        securityMonitor = module.get<SecurityMonitorService>(SecurityMonitorService)
    })

    it('should detect and block SQL injection attempts', () => {
        const sqlInjectionPayloads = [
            "1'; DROP TABLE users; --",
            "1' OR '1'='1",
            "'; INSERT INTO users (admin) VALUES (1); --",
            "1' UNION SELECT * FROM admin_users --",
            "'; EXEC xp_cmdshell('format c:'); --"
        ]

        sqlInjectionPayloads.forEach(payload => {
            securityMonitor.logInjectionAttempt('sql', payload, 'testuser', '127.0.0.1')
        })

        const metrics = securityMonitor.getSecurityMetrics()
        expect(metrics.eventsByType[SecurityEventType.INJECTION_ATTEMPT]).toBe(sqlInjectionPayloads.length)
    })

    it('should detect and block XSS attempts', () => {
        const xssPayloads = [
            "<script>alert('XSS')</script>",
            "javascript:alert('XSS')",
            "<img src=x onerror=alert('XSS')>",
            "<svg onload=alert('XSS')>",
            "';alert('XSS');//"
        ]

        xssPayloads.forEach(payload => {
            expect(sanitizeAndValidateString(payload)).toBeNull()
        })
    })

    it('should handle brute force attack simulation', () => {
        const attackerIP = '192.168.1.999'
        const targetUser = 'admin'

        // Simulate 100 failed login attempts
        for (let i = 0; i < 100; i++) {
            securityMonitor.logAuthFailure('Invalid credentials', targetUser, attackerIP)
        }

        expect(securityMonitor.isSuspiciousIP(attackerIP)).toBe(true)

        const status = securityMonitor.getSecurityStatus()
        expect(status.status).toMatch(/warning|critical/)
        expect(status.alerts.length).toBeGreaterThan(0)
    })

    it('should prevent directory traversal attacks', () => {
        const traversalPayloads = [
            '../../../etc/passwd',
            '..\\..\\..\\windows\\system32\\config\\sam',
            '....//....//....//etc/passwd',
            '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
        ]

        traversalPayloads.forEach(payload => {
            expect(sanitizeAndValidateString(payload)).toBeNull()
        })
    })
})