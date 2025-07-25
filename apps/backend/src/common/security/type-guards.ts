import { z } from 'zod'
import { Logger } from '@nestjs/common'

/**
 * Security-focused type guards and validation utilities
 * Provides comprehensive input validation and type safety for all user-facing data
 */

const logger = new Logger('SecurityTypeGuards')

/**
 * UUID validation schema with strict format checking
 */
export const UUIDSchema = z.string().uuid('Invalid UUID format')

/**
 * Safe email validation with additional security checks
 */
export const EmailSchema = z.string()
    .email('Invalid email format')
    .max(254, 'Email too long') // RFC 5321 limit
    .refine(email => !email.includes('..'), 'Email contains consecutive dots')
    .refine(email => !email.startsWith('.'), 'Email cannot start with dot')
    .refine(email => !email.endsWith('.'), 'Email cannot end with dot')

/**
 * User role validation with strict enum checking
 */
export const UserRoleSchema = z.enum(['OWNER', 'MANAGER', 'TENANT', 'ADMIN'], {
    errorMap: () => ({ message: 'Invalid user role' })
})

/**
 * Secure user ID validation type guard
 */
export function isValidUserId(userId: unknown): userId is string {
    try {
        UUIDSchema.parse(userId)
        return true
    } catch (error) {
        logger.warn('Invalid user ID format detected', {
            userId: typeof userId === 'string' ? userId.substring(0, 8) + '...' : typeof userId,
            error: error instanceof z.ZodError ? error.issues[0]?.message : 'Unknown error'
        })
        return false
    }
}

/**
 * Secure email validation type guard
 */
export function isValidEmail(email: unknown): email is string {
    try {
        EmailSchema.parse(email)
        return true
    } catch (error) {
        logger.warn('Invalid email format detected', {
            email: typeof email === 'string' ? email.substring(0, 5) + '...' : typeof email,
            error: error instanceof z.ZodError ? error.issues[0]?.message : 'Unknown error'
        })
        return false
    }
}

/**
 * User role validation type guard
 */
export function isValidUserRole(role: unknown): role is 'OWNER' | 'MANAGER' | 'TENANT' | 'ADMIN' {
    try {
        UserRoleSchema.parse(role)
        return true
    } catch (error) {
        logger.warn('Invalid user role detected', {
            role: typeof role === 'string' ? role : typeof role,
            error: error instanceof z.ZodError ? error.issues[0]?.message : 'Unknown error'
        })
        return false
    }
}

/**
 * Comprehensive input sanitization schema
 */
export const SanitizedStringSchema = z.string()
    .trim()
    .max(10000, 'Input too long')
    .refine(str => !str.includes('\0'), 'Null bytes not allowed')
    .refine(str => !/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(str), 'Control characters not allowed')

/**
 * Safe string validation with sanitization
 */
export function sanitizeAndValidateString(input: unknown): string | null {
    try {
        if (typeof input !== 'string') return null
        return SanitizedStringSchema.parse(input)
    } catch (error) {
        logger.warn('String sanitization failed', {
            inputType: typeof input,
            error: error instanceof z.ZodError ? error.issues[0]?.message : 'Unknown error'
        })
        return null
    }
}

/**
 * Database query parameter validation schema
 */
export const QueryParamSchema = z.object({
    userId: UUIDSchema,
    email: EmailSchema.optional(),
    role: UserRoleSchema.optional(),
    limit: z.number().int().min(1).max(1000).optional(),
    offset: z.number().int().min(0).optional()
})

/**
 * Validate query parameters for database operations
 */
export function validateQueryParams(params: unknown): z.infer<typeof QueryParamSchema> | null {
    try {
        return QueryParamSchema.parse(params)
    } catch (error) {
        logger.error('Query parameter validation failed', {
            error: error instanceof z.ZodError ? error.issues : error,
            paramsType: typeof params
        })
        return null
    }
}

/**
 * JWT claims validation schema for RLS context
 */
export const JWTClaimsSchema = z.object({
    sub: UUIDSchema,
    email: EmailSchema.optional(),
    role: UserRoleSchema.optional(),
    iat: z.number().optional(),
    exp: z.number().optional()
})

/**
 * Validate JWT claims for database RLS context setting
 */
export function validateJWTClaims(claims: unknown): z.infer<typeof JWTClaimsSchema> | null {
    try {
        return JWTClaimsSchema.parse(claims)
    } catch (error) {
        logger.error('JWT claims validation failed', {
            error: error instanceof z.ZodError ? error.issues : error,
            claimsType: typeof claims
        })
        return null
    }
}

/**
 * Security validation result type
 */
export interface SecurityValidationResult<T> {
    isValid: boolean
    data?: T
    errors?: string[]
    securityFlags?: {
        potentialInjection?: boolean
        suspiciousPattern?: boolean
        invalidFormat?: boolean
    }
}

/**
 * Comprehensive security validation for user input
 */
export function performSecurityValidation<T>(
    input: unknown,
    schema: z.ZodSchema<T>,
    context: string
): SecurityValidationResult<T> {
    try {
        const data = schema.parse(input)
        
        logger.debug('Security validation passed', {
            context,
            inputType: typeof input
        })
        
        return {
            isValid: true,
            data
        }
    } catch (error) {
        const errors = error instanceof z.ZodError 
            ? error.issues.map(issue => issue.message)
            : ['Unknown validation error']
        
        // Detect potential security threats
        const securityFlags = {
            potentialInjection: typeof input === 'string' && (
                input.includes('DROP ') || 
                input.includes('DELETE ') || 
                input.includes('INSERT ') ||
                input.includes('UPDATE ') ||
                input.includes('SELECT ') ||
                input.includes('UNION ') ||
                input.includes('<script') ||
                input.includes('javascript:')
            ),
            suspiciousPattern: typeof input === 'string' && (
                input.includes('..') ||
                input.includes('/*') ||
                input.includes('*/') ||
                input.includes('--') ||
                input.includes('\0')
            ),
            invalidFormat: true
        }
        
        if (securityFlags.potentialInjection || securityFlags.suspiciousPattern) {
            logger.error('Security threat detected in input validation', {
                context,
                inputSample: typeof input === 'string' ? input.substring(0, 50) + '...' : typeof input,
                securityFlags,
                errors
            })
        } else {
            logger.warn('Input validation failed', {
                context,
                errors
            })
        }
        
        return {
            isValid: false,
            errors,
            securityFlags
        }
    }
}