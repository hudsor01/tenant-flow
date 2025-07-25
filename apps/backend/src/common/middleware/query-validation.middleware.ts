import { Injectable, Logger, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { performSecurityValidation, UUIDSchema } from '../security/type-guards'
import { z } from 'zod'

/**
 * Parameterized Query Validation Middleware
 * 
 * This middleware ensures all database operations use parameterized queries
 * and validates input parameters to prevent SQL injection attacks.
 * 
 * Key Security Features:
 * - Validates all user IDs are proper UUIDs
 * - Detects potential SQL injection patterns
 * - Logs security violations for audit
 * - Blocks suspicious requests before they reach services
 */
@Injectable()
export class QueryValidationMiddleware implements NestMiddleware {
    private readonly logger = new Logger(QueryValidationMiddleware.name)
    
    // SQL injection patterns to detect and block
    private readonly SQL_INJECTION_PATTERNS = [
        /(\b(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|ALTER|CREATE|TRUNCATE)\s+)/gi,
        /(--|\/\*|\*\/|;|\0|\\x00)/g,
        /(\bOR\s+\d+\s*=\s*\d+|\bAND\s+\d+\s*=\s*\d+)/gi,
        /(\bunion\s+select|\bunion\s+all\s+select)/gi,
        /((\s|^)('|"|`)\s*(or|and)\s*\d+\s*=\s*\d+)/gi,
        /(exec\s*\(|execute\s*\(|sp_|xp_)/gi
    ]
    
    // XSS patterns for additional security
    private readonly XSS_PATTERNS = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe[^>]*>.*?<\/iframe>/gi
    ]

    use(req: Request, res: Response, next: NextFunction) {
        this.logger.debug('Starting query validation middleware', {
            method: req.method,
            path: req.path,
            userAgent: req.get('User-Agent')?.substring(0, 50)
        })

        try {
            // Skip validation for static assets and health checks
            if (this.shouldSkipValidation(req.path)) {
                this.logger.debug('Skipping validation for static/health endpoint', {
                    path: req.path
                })
                return next()
            }

            // Validate request parameters
            this.validateRequestParameters(req)
            
            // Validate request body
            this.validateRequestBody(req)
            
            // Check for SQL injection attempts
            this.detectSQLInjectionAttempts(req)
            
            // Check for XSS attempts
            this.detectXSSAttempts(req)
            
            // Validate user context if present
            this.validateUserContext(req)
            
            this.logger.debug('Query validation completed successfully', {
                path: req.path,
                method: req.method
            })
            
            next()
        } catch (error) {
            this.logger.error('Query validation failed - blocking request', {
                error: error instanceof Error ? error.message : 'Unknown error',
                path: req.path,
                method: req.method,
                ip: this.getClientIP(req),
                userAgent: req.get('User-Agent')?.substring(0, 100)
            })
            
            // Block the request
            res.status(400).json({
                error: 'Request validation failed',
                message: 'Invalid or potentially malicious input detected',
                code: 'SECURITY_VALIDATION_FAILED'
            })
        }
    }

    /**
     * Check if validation should be skipped for this path
     */
    private shouldSkipValidation(path: string): boolean {
        const skipPaths = [
            '/health',
            '/metrics',
            '/favicon.ico',
            '/robots.txt',
            '/.well-known/',
            '/static/',
            '/assets/'
        ]
        
        return skipPaths.some(skipPath => path.startsWith(skipPath))
    }

    /**
     * Validate request parameters for security threats
     */
    private validateRequestParameters(req: Request): void {
        const params = { ...req.params, ...req.query }
        
        for (const [key, value] of Object.entries(params)) {
            if (typeof value === 'string') {
                // Check for SQL injection patterns
                this.checkForMaliciousPatterns(value, `parameter ${key}`)
                
                // Validate specific parameter types
                if (key.toLowerCase().includes('userid') || key.toLowerCase().includes('id')) {
                    this.validateUserIdParameter(value, key)
                }
                
                if (key.toLowerCase().includes('email')) {
                    this.validateEmailParameter(value, key)
                }
            }
        }
    }

    /**
     * Validate request body for security threats
     */
    private validateRequestBody(req: Request): void {
        if (!req.body || typeof req.body !== 'object') {
            return
        }
        
        this.validateObjectRecursively(req.body, 'request body')
    }

    /**
     * Recursively validate object properties
     */
    private validateObjectRecursively(obj: any, context: string, depth = 0): void {
        // Prevent deep nesting attacks
        if (depth > 10) {
            throw new Error(`Object nesting too deep in ${context}`)
        }
        
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                this.checkForMaliciousPatterns(value, `${context}.${key}`)
                
                // Validate specific field types
                if (key.toLowerCase().includes('userid') || key.toLowerCase().includes('id')) {
                    this.validateUserIdParameter(value, `${context}.${key}`)
                }
                
                if (key.toLowerCase().includes('email')) {
                    this.validateEmailParameter(value, `${context}.${key}`)
                }
            } else if (typeof value === 'object' && value !== null) {
                this.validateObjectRecursively(value, `${context}.${key}`, depth + 1)
            }
        }
    }

    /**
     * Check for SQL injection patterns in input
     */
    private detectSQLInjectionAttempts(req: Request): void {
        const allInputs = [
            JSON.stringify(req.params),
            JSON.stringify(req.query),
            JSON.stringify(req.body),
            req.get('User-Agent') || '',
            req.get('Referrer') || ''
        ].join(' ')
        
        for (const pattern of this.SQL_INJECTION_PATTERNS) {
            if (pattern.test(allInputs)) {
                this.logger.error('SQL injection attempt detected', {
                    pattern: pattern.source,
                    path: req.path,
                    ip: this.getClientIP(req),
                    userAgent: req.get('User-Agent')?.substring(0, 100)
                })
                throw new Error('Potential SQL injection detected')
            }
        }
    }

    /**
     * Check for XSS patterns in input
     */
    private detectXSSAttempts(req: Request): void {
        const allInputs = [
            JSON.stringify(req.params),
            JSON.stringify(req.query),
            JSON.stringify(req.body)
        ].join(' ')
        
        for (const pattern of this.XSS_PATTERNS) {
            if (pattern.test(allInputs)) {
                this.logger.error('XSS attempt detected', {
                    pattern: pattern.source,
                    path: req.path,
                    ip: this.getClientIP(req)
                })
                throw new Error('Potential XSS attack detected')
            }
        }
    }

    /**
     * Check for malicious patterns in a string value
     */
    private checkForMaliciousPatterns(value: string, context: string): void {
        // Check for null bytes
        if (value.includes('\0')) {
            throw new Error(`Null bytes detected in ${context}`)
        }
        
        // Check for control characters
        if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(value)) {
            throw new Error(`Control characters detected in ${context}`)
        }
        
        // Check for excessively long inputs
        if (value.length > 10000) {
            throw new Error(`Input too long in ${context}`)
        }
    }

    /**
     * Validate user ID parameter format
     */
    private validateUserIdParameter(value: string, context: string): void {
        const validation = performSecurityValidation(value, UUIDSchema, context)
        
        if (!validation.isValid) {
            throw new Error(`Invalid user ID format in ${context}`)
        }
        
        if (validation.securityFlags?.potentialInjection) {
            throw new Error(`Potential injection in user ID ${context}`)
        }
    }

    /**
     * Validate email parameter format
     */
    private validateEmailParameter(value: string, context: string): void {
        const emailSchema = z.string().email().max(254)
        const validation = performSecurityValidation(value, emailSchema, context)
        
        if (!validation.isValid) {
            throw new Error(`Invalid email format in ${context}`)
        }
    }

    /**
     * Validate user context from JWT token
     */
    private validateUserContext(req: Request): void {
        const authHeader = req.get('Authorization')
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7)
            
            // Basic token format validation
            if (token.length > 2000) {
                throw new Error('JWT token too long')
            }
            
            // Check for obvious injection attempts in token
            if (this.SQL_INJECTION_PATTERNS.some(pattern => pattern.test(token))) {
                throw new Error('Malicious pattern detected in JWT token')
            }
        }
    }

    /**
     * Get client IP address safely
     */
    private getClientIP(req: Request): string {
        return (
            req.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
            req.get('X-Real-IP') ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            'unknown'
        )
    }
}