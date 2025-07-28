import { Injectable, NestMiddleware, Logger } from '@nestjs/common'
import { FastifyRequest, FastifyReply } from 'fastify'
import { SecurityUtils } from '../security/security.utils'

/**
 * Middleware to enforce strict content-type validation
 * Prevents MIME type confusion attacks
 */
@Injectable()
export class ContentTypeMiddleware implements NestMiddleware {
    private readonly logger = new Logger(ContentTypeMiddleware.name)
    
    constructor(private securityUtils: SecurityUtils) {}
    
    use(req: FastifyRequest, res: FastifyReply, next: () => void) {
        // Skip validation for GET, HEAD, OPTIONS requests
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
            return next()
        }
        
        const contentType = req.headers['content-type']
        const path = req.url || ''
        
        // Define allowed content types for different endpoints
        const contentTypeRules: Record<string, string[]> = {
            '/api/v1/upload': ['multipart/form-data'],
            '/api/v1/stripe/webhook': ['application/json'],
            '/api/hono': ['application/json'],
            // Default for all other POST/PUT/PATCH endpoints
            default: ['application/json', 'application/x-www-form-urlencoded']
        }
        
        // Find matching rule
        let allowedTypes = contentTypeRules.default
        for (const [pathPattern, types] of Object.entries(contentTypeRules)) {
            if (pathPattern !== 'default' && path.startsWith(pathPattern)) {
                allowedTypes = types
                break
            }
        }
        
        // Validate content type
        if (!contentType) {
            this.logger.warn('Request missing Content-Type header', {
                method: req.method,
                path: path,
                ip: req.ip
            })
            
            // Log security event
            this.securityUtils.createSecurityAuditLog({
                type: 'SUSPICIOUS_ACTIVITY',
                ip: req.ip,
                userAgent: req.headers['user-agent'] || 'unknown',
                details: {
                    reason: 'Missing Content-Type header',
                    method: req.method,
                    path: path
                }
            })
            
            res.status(400).send({
                error: 'Bad Request',
                message: 'Content-Type header is required for this request'
            })
            return
        }
        
        // Extract base content type (without charset, boundary, etc.)
        const baseContentType = contentType.split(';')[0]?.trim().toLowerCase() ?? ''
        
        // Check if content type is allowed
        const isAllowed = (allowedTypes ?? []).some(allowed => 
            baseContentType === allowed.toLowerCase()
        )
        
        if (!isAllowed) {
            this.logger.warn('Invalid Content-Type detected', {
                contentType: contentType,
                allowedTypes: allowedTypes,
                method: req.method,
                path: path,
                ip: req.ip
            })
            
            // Log security event
            this.securityUtils.createSecurityAuditLog({
                type: 'SUSPICIOUS_ACTIVITY',
                ip: req.ip,
                userAgent: req.headers['user-agent'] || 'unknown',
                details: {
                    reason: 'Invalid Content-Type',
                    contentType: contentType,
                    allowedTypes: allowedTypes || [],
                    method: req.method,
                    path: path
                }
            })
            
            res.status(415).send({
                error: 'Unsupported Media Type',
                message: `Content-Type '${contentType}' is not supported for this endpoint`,
                allowedTypes: allowedTypes
            })
            return
        }
        
        // Additional validation for JSON content
        if (baseContentType === 'application/json') {
            // Ensure charset is UTF-8 if specified
            if (contentType.includes('charset=') && !contentType.includes('charset=utf-8')) {
                this.logger.warn('Non-UTF8 charset in JSON Content-Type', {
                    contentType: contentType,
                    method: req.method,
                    path: path
                })
                
                res.status(400).send({
                    error: 'Bad Request',
                    message: 'JSON requests must use UTF-8 charset'
                })
                return
            }
        }
        
        next()
    }
}