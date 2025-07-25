import { Injectable, NestMiddleware, Logger } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { performSecurityValidation, UUIDSchema, EmailSchema } from './type-guards'

/**
 * Middleware for validating database query parameters and preventing injection attacks
 * Provides comprehensive input validation and sanitization for all database operations
 */
@Injectable()
export class QueryValidationMiddleware implements NestMiddleware {
    private readonly logger = new Logger(QueryValidationMiddleware.name)

    /**
     * Common query parameter schemas for validation
     */
    private readonly commonSchemas = {
        userId: UUIDSchema,
        email: EmailSchema,
        limit: z.number().int().min(1).max(1000),
        offset: z.number().int().min(0),
        search: z.string().max(500).optional(),
        sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'email']).optional(),
        sortOrder: z.enum(['asc', 'desc']).optional()
    }

    /**
     * Route-specific validation schemas
     */
    private readonly routeSchemas: Record<string, z.ZodSchema> = {
        // User-related endpoints
        '/api/users/:userId': z.object({
            userId: this.commonSchemas.userId
        }),
        '/api/users': z.object({
            limit: this.commonSchemas.limit.optional(),
            offset: this.commonSchemas.offset.optional(),
            search: this.commonSchemas.search.optional()
        }),
        
        // Property-related endpoints
        '/api/properties/:propertyId': z.object({
            propertyId: UUIDSchema
        }),
        '/api/properties': z.object({
            userId: this.commonSchemas.userId.optional(),
            limit: this.commonSchemas.limit.optional(),
            offset: this.commonSchemas.offset.optional()
        }),
        
        // Tenant-related endpoints
        '/api/tenants/:tenantId': z.object({
            tenantId: UUIDSchema
        }),
        '/api/tenants': z.object({
            propertyId: UUIDSchema.optional(),
            limit: this.commonSchemas.limit.optional(),
            offset: this.commonSchemas.offset.optional()
        })
    }

    use(req: Request, res: Response, next: NextFunction) {
        try {
            // Skip validation for non-API routes
            if (!req.path.startsWith('/api/')) {
                return next()
            }

            // Log incoming request for security audit
            this.logger.debug('Validating query parameters', {
                method: req.method,
                path: req.path,
                hasParams: Object.keys(req.params).length > 0,
                hasQuery: Object.keys(req.query).length > 0,
                userAgent: req.get('User-Agent')?.substring(0, 50)
            })

            // Validate route parameters
            if (Object.keys(req.params).length > 0) {
                const paramValidation = this.validateParameters(req.path, req.params, 'params')
                if (!paramValidation.isValid) {
                    return this.handleValidationError(res, 'Invalid route parameters', paramValidation)
                }
            }

            // Validate query parameters
            if (Object.keys(req.query).length > 0) {
                const queryValidation = this.validateParameters(req.path, req.query, 'query')
                if (!queryValidation.isValid) {
                    return this.handleValidationError(res, 'Invalid query parameters', queryValidation)
                }
            }

            // Validate request body for POST/PUT/PATCH requests
            if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
                const bodyValidation = this.validateRequestBody(req.body)
                if (!bodyValidation.isValid) {
                    return this.handleValidationError(res, 'Invalid request body', bodyValidation)
                }
            }

            // Log successful validation
            this.logger.debug('Query validation passed', {
                method: req.method,
                path: req.path
            })

            next()
        } catch (error) {
            this.logger.error('Query validation middleware error', {
                error: error instanceof Error ? error.message : 'Unknown error',
                method: req.method,
                path: req.path
            })
            
            return res.status(500).json({
                error: 'Internal server error during query validation',
                code: 'VALIDATION_ERROR'
            })
        }
    }

    /**
     * Validate parameters against route-specific schemas
     */
    private validateParameters(path: string, params: Record<string, unknown>, type: 'params' | 'query') {
        // Find matching route schema
        const routePattern = this.findMatchingRoute(path)
        const schema = routePattern ? this.routeSchemas[routePattern] : null

        if (!schema) {
            // If no specific schema found, use generic validation
            return this.performGenericValidation(params, type)
        }

        return performSecurityValidation(params, schema, `${type}:${path}`)
    }

    /**
     * Find matching route pattern for the given path
     */
    private findMatchingRoute(path: string): string | null {
        for (const routePattern of Object.keys(this.routeSchemas)) {
            // Convert route pattern to regex
            const regex = new RegExp(
                '^' + routePattern.replace(/:[^/]+/g, '[^/]+') + '$'
            )
            if (regex.test(path)) {
                return routePattern
            }
        }
        return null
    }

    /**
     * Generic validation for routes without specific schemas
     */
    private performGenericValidation(params: Record<string, unknown>, _type: string) {
        const issues: string[] = []
        
        for (const [key, value] of Object.entries(params)) {
            // Check for potential injection patterns
            if (typeof value === 'string') {
                const securityCheck = this.checkForSecurityThreats(value)
                if (securityCheck.hasThreats) {
                    issues.push(`${key}: ${securityCheck.threats.join(', ')}`)
                }
            }
            
            // Validate common parameter patterns
            if (key.includes('Id') && !UUIDSchema.safeParse(value).success) {
                issues.push(`${key}: Invalid ID format`)
            }
            
            if (key === 'email' && !EmailSchema.safeParse(value).success) {
                issues.push(`${key}: Invalid email format`)
            }
        }

        return {
            isValid: issues.length === 0,
            errors: issues.length > 0 ? issues : undefined,
            securityFlags: issues.length > 0 ? { invalidFormat: true } : undefined
        }
    }

    /**
     * Validate request body for potential security threats
     */
    private validateRequestBody(body: Record<string, unknown>) {
        const issues: string[] = []
        
        // Recursive validation of nested objects
        const validateObject = (obj: unknown, path = ''): void => {
            if (typeof obj === 'string') {
                const securityCheck = this.checkForSecurityThreats(obj)
                if (securityCheck.hasThreats) {
                    issues.push(`${path}: ${securityCheck.threats.join(', ')}`)
                }
            } else if (typeof obj === 'object' && obj !== null) {
                for (const [key, value] of Object.entries(obj)) {
                    validateObject(value, path ? `${path}.${key}` : key)
                }
            }
        }

        validateObject(body)

        return {
            isValid: issues.length === 0,
            errors: issues.length > 0 ? issues : undefined,
            securityFlags: issues.length > 0 ? { potentialInjection: true } : undefined
        }
    }

    /**
     * Check string values for potential security threats
     */
    private checkForSecurityThreats(value: string): { hasThreats: boolean; threats: string[] } {
        const threats: string[] = []

        // SQL injection patterns
        const sqlPatterns = [
            /DROP\s+TABLE/i,
            /DELETE\s+FROM/i,
            /INSERT\s+INTO/i,
            /UPDATE\s+SET/i,
            /UNION\s+SELECT/i,
            /OR\s+1=1/i,
            /AND\s+1=1/i,
            /--/,
            /\/\*/,
            /\*\//,
            /;/
        ]

        for (const pattern of sqlPatterns) {
            if (pattern.test(value)) {
                threats.push('SQL injection pattern detected')
                break
            }
        }

        // XSS patterns
        const xssPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /<iframe/i,
            /<object/i,
            /<embed/i
        ]

        for (const pattern of xssPatterns) {
            if (pattern.test(value)) {
                threats.push('XSS pattern detected')
                break
            }
        }

        // Path traversal patterns
        if (value.includes('../') || value.includes('..\\')) {
            threats.push('Path traversal pattern detected')
        }

        // Null byte injection
        if (value.includes('\0')) {
            threats.push('Null byte injection detected')
        }

        return {
            hasThreats: threats.length > 0,
            threats
        }
    }

    /**
     * Handle validation errors with appropriate logging and response
     */
    private handleValidationError(res: Response, message: string, validation: { errors?: string[]; securityFlags?: { potentialInjection?: boolean; suspiciousPattern?: boolean; invalidFormat?: boolean } }) {
        this.logger.warn('Query validation failed', {
            message,
            errors: validation.errors,
            securityFlags: validation.securityFlags
        })

        // Enhanced logging for security threats
        if (validation.securityFlags?.potentialInjection || validation.securityFlags?.suspiciousPattern) {
            this.logger.error('SECURITY THREAT DETECTED', {
                message,
                errors: validation.errors,
                securityFlags: validation.securityFlags,
                timestamp: new Date().toISOString()
            })
        }

        return res.status(400).json({
            error: message,
            details: validation.errors,
            code: 'VALIDATION_FAILED'
        })
    }
}

/**
 * Factory function to create and configure the middleware
 */
export function createQueryValidationMiddleware() {
    return new QueryValidationMiddleware()
}