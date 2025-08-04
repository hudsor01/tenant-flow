import { Injectable, NestMiddleware, BadRequestException, Logger } from '@nestjs/common'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { SecurityMonitorService, SecurityEventType, SecuritySeverity } from '../security/security-monitor.service'

/**
 * Supported API versions configuration
 */
export interface ApiVersionConfig {
    version: string
    status: 'current' | 'deprecated' | 'sunset' | 'unsupported'
    sunsetDate?: Date
    deprecationWarning?: string
}

/**
 * API Version validation and security middleware
 * Enforces version requirements and logs security events for deprecated usage
 */
@Injectable()
export class ApiVersionMiddleware implements NestMiddleware {
    private readonly logger = new Logger(ApiVersionMiddleware.name)
    
    // Supported API versions - update this as new versions are released
    private readonly supportedVersions: ApiVersionConfig[] = [
        {
            version: 'v1',
            status: 'current'
        }
        // Example for future versions:
        // {
        //     version: 'v2',
        //     status: 'current'
        // },
        // {
        //     version: 'v1',
        //     status: 'deprecated',
        //     sunsetDate: new Date('2025-12-31'),
        //     deprecationWarning: 'API v1 will be sunset on December 31, 2025. Please migrate to v2.'
        // }
    ]

    constructor(private readonly securityMonitor: SecurityMonitorService) {}

    async use(req: FastifyRequest, res: FastifyReply, next: () => void): Promise<void> {
        try {
            const version = this.extractVersionFromRequest(req)
            
            if (!version) {
                // No version specified - require explicit versioning
                this.logSecurityEvent(req, 'missing_version', 'No API version specified')
                throw new BadRequestException({
                    error: 'API_VERSION_REQUIRED',
                    message: 'API version must be specified in the URL path (e.g., /api/v1/...)',
                    supportedVersions: this.getCurrentVersions(),
                    documentation: '/api/docs'
                })
            }

            const versionConfig = this.getVersionConfig(version)
            
            if (!versionConfig) {
                // Unsupported version
                this.logSecurityEvent(req, 'unsupported_version', `Unsupported API version: ${version}`)
                throw new BadRequestException({
                    error: 'API_VERSION_UNSUPPORTED',
                    message: `API version '${version}' is not supported`,
                    supportedVersions: this.getCurrentVersions(),
                    documentation: '/api/docs'
                })
            }

            // Handle different version statuses
            switch (versionConfig.status) {
                case 'unsupported':
                    this.logSecurityEvent(req, 'unsupported_version', `Blocked unsupported version: ${version}`)
                    throw new BadRequestException({
                        error: 'API_VERSION_UNSUPPORTED',
                        message: `API version '${version}' is no longer supported`,
                        supportedVersions: this.getCurrentVersions(),
                        documentation: '/api/docs'
                    })

                case 'sunset':
                    this.logSecurityEvent(req, 'sunset_version', `Blocked sunset version: ${version}`)
                    throw new BadRequestException({
                        error: 'API_VERSION_SUNSET',
                        message: `API version '${version}' has been sunset and is no longer available`,
                        supportedVersions: this.getCurrentVersions(),
                        documentation: '/api/docs'
                    })

                case 'deprecated': {
                    // Log deprecated usage for monitoring
                    this.logSecurityEvent(req, 'deprecated_version', `Deprecated API version used: ${version}`)
                    
                    // Add deprecation headers
                    res.header('X-API-Deprecation-Warning', versionConfig.deprecationWarning || `API version ${version} is deprecated`)
                    if (versionConfig.sunsetDate) {
                        res.header('X-API-Sunset-Date', versionConfig.sunsetDate.toISOString());
                    }
                    const currentVersion = this.getCurrentVersions()[0];
                    if (currentVersion) {
                        res.header('X-API-Current-Version', currentVersion);
                    }
                    break
                }

                case 'current':
                    // Current version - log successful usage
                    this.logSecurityEvent(req, 'valid_version', `Valid API version: ${version}`, SecuritySeverity.LOW)
                    break
            }

            // Add version info to request for downstream use
            interface VersionedRequest extends FastifyRequest {
                apiVersion?: string
                apiVersionConfig?: ApiVersionConfig
            }
            (req as VersionedRequest).apiVersion = version;
            (req as VersionedRequest).apiVersionConfig = versionConfig

            next()
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error
            }
            
            this.logger.error('API version middleware error:', error)
            this.logSecurityEvent(req, 'middleware_error', `API version middleware error: ${error instanceof Error ? error.message : 'Unknown error'}`)
            
            throw new BadRequestException({
                error: 'API_VERSION_ERROR',
                message: 'Unable to process API version',
                supportedVersions: this.getCurrentVersions()
            })
        }
    }

    /**
     * Extract API version from request URL
     */
    private extractVersionFromRequest(req: FastifyRequest): string | null {
        // Extract version from URL path like /api/v1/...
        const pathMatch = req.url.match(/^\/api\/(v\d+)/);
        if (pathMatch) {
            return pathMatch[1] ?? null
        }

        // Fallback: check for X-API-Version header
        const headerVersion = req.headers['x-api-version'] as string
        if (headerVersion) {
            return headerVersion.startsWith('v') ? headerVersion : `v${headerVersion}`
        }

        return null
    }

    /**
     * Get configuration for a specific version
     */
    private getVersionConfig(version: string): ApiVersionConfig | null {
        return this.supportedVersions.find(config => config.version === version) || null
    }

    /**
     * Get list of currently supported versions
     */
    private getCurrentVersions(): string[] {
        return this.supportedVersions
            .filter(config => config.status === 'current')
            .map(config => config.version)
    }

    /**
     * Log security events for version usage tracking
     */
    private logSecurityEvent(
        req: FastifyRequest, 
        eventType: string, 
        details: string,
        severity: SecuritySeverity = SecuritySeverity.MEDIUM
    ): void {
        // Add safety check for security monitor
        if (!this.securityMonitor) {
            this.logger.warn('SecurityMonitorService not available for logging event:', eventType)
            return
        }

        try {
            interface AuthenticatedRequest extends FastifyRequest {
                user?: { id: string }
            }
            const userId = (req as AuthenticatedRequest).user?.id
            const ipAddress = req.ip
            const userAgent = req.headers['user-agent']

            this.securityMonitor.logSecurityEvent({
                type: SecurityEventType.SUSPICIOUS_REQUEST, // Using existing type for API violations
                severity,
                userId,
                ipAddress,
                userAgent,
                details: details,
                metadata: {
                    eventType,
                    requestedVersion: this.extractVersionFromRequest(req) || 'unknown',
                    supportedVersions: this.getCurrentVersions().join(', '),
                    timestamp: new Date().toISOString()
                }
            })
        } catch (error) {
            this.logger.error('Failed to log security event:', error instanceof Error ? error.message : 'Unknown error')
        }
    }
}