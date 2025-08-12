import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { FastifyRequest } from 'fastify'

export interface ApiVersionConfig {
  supportedVersions: string[]
  defaultVersion: string
  deprecatedVersions: string[]
  unsupportedVersions: string[]
}

/**
 * API Version Interceptor
 * 
 * Handles API versioning for security updates and backward compatibility.
 * Supports version extraction from headers, query parameters, and URL path.
 */
@Injectable()
export class ApiVersionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ApiVersionInterceptor.name)
  
  private readonly config: ApiVersionConfig = {
    supportedVersions: ['v1', 'v2'],
    defaultVersion: 'v1',
    deprecatedVersions: [], // Add versions scheduled for removal
    unsupportedVersions: [] // Add versions that are no longer supported
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>()
    const response = context.switchToHttp().getResponse()

    // Extract API version from various sources
    const apiVersion = this.extractApiVersion(request)
    
    // Validate version
    this.validateApiVersion(apiVersion, request)
    
    // Add version to request for downstream use
    ;(request as unknown as { apiVersion: string }).apiVersion = apiVersion
    
    // Add version headers to response
    response.header('X-API-Version', apiVersion)
    response.header('X-Supported-Versions', this.config.supportedVersions.join(', '))
    
    // Add deprecation warnings if needed
    if (this.config.deprecatedVersions.includes(apiVersion)) {
      response.header('Warning', `299 - "API version ${apiVersion} is deprecated"`)
      response.header('Sunset', this.getDeprecationDate(apiVersion))
      
      this.logger.warn(`Deprecated API version used: ${apiVersion}`, {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        endpoint: request.url
      })
    }

    return next.handle().pipe(
      map(data => {
        // Add version metadata to response
        if (data && typeof data === 'object') {
          return {
            ...data,
            _meta: {
              ...(typeof data === 'object' && data !== null && '_meta' in data ? (data as { _meta?: Record<string, unknown> })._meta : {}),
              apiVersion,
              timestamp: new Date().toISOString()
            }
          }
        }
        return data
      })
    )
  }

  private extractApiVersion(request: FastifyRequest): string {
    // 1. Check Accept header (e.g., application/vnd.tenantflow.v2+json)
    const acceptHeader = request.headers.accept
    if (acceptHeader) {
      const versionMatch = acceptHeader.match(/vnd\.tenantflow\.v(\d+)\+json/i)
      if (versionMatch) {
        return `v${versionMatch[1]}`
      }
    }

    // 2. Check custom header
    const versionHeader = request.headers['x-api-version'] as string
    if (versionHeader) {
      return this.normalizeVersion(versionHeader)
    }

    // 3. Check query parameter
    const query = request.query as Record<string, unknown>
    if (query.version) {
      return this.normalizeVersion(String(query.version))
    }

    // 4. Extract from URL path (already handled by global prefix, but validate)
    const pathVersion = this.extractVersionFromPath(request.url)
    if (pathVersion) {
      return pathVersion
    }

    // 5. Use default version
    return this.config.defaultVersion
  }

  private extractVersionFromPath(url: string): string | null {
    const pathMatch = url.match(/^\/api\/(v\d+)\//)
    return pathMatch ? (pathMatch[1] || null) : null
  }

  private normalizeVersion(version: string): string {
    // Ensure version starts with 'v'
    const normalized = version.toLowerCase().startsWith('v') ? version.toLowerCase() : `v${version}`
    return normalized
  }

  private validateApiVersion(version: string, request: FastifyRequest): void {
    // Check if version is unsupported (security requirement)
    if (this.config.unsupportedVersions.includes(version)) {
      this.logger.error(`Unsupported API version attempted: ${version}`, {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        endpoint: request.url
      })

      throw new HttpException({
        error: 'API_VERSION_UNSUPPORTED',
        message: `API version ${version} is no longer supported`,
        supportedVersions: this.config.supportedVersions,
        upgradeRequired: true
      }, HttpStatus.GONE) // 410 Gone for permanently removed versions
    }

    // Check if version is supported
    if (!this.config.supportedVersions.includes(version)) {
      this.logger.warn(`Invalid API version requested: ${version}`, {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        endpoint: request.url
      })

      throw new HttpException({
        error: 'API_VERSION_NOT_SUPPORTED',
        message: `API version ${version} is not supported`,
        supportedVersions: this.config.supportedVersions,
        defaultVersion: this.config.defaultVersion
      }, HttpStatus.BAD_REQUEST)
    }
  }

  private getDeprecationDate(version: string): string {
    // In a real implementation, this would come from configuration
    const deprecationDates: Record<string, string> = {
      // Example: 'v1': '2024-12-31'
    }

    return deprecationDates[version] || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString() // 6 months from now
  }

  /**
   * Update version configuration (for hot updates without restart)
   */
  updateConfig(newConfig: Partial<ApiVersionConfig>): void {
    Object.assign(this.config, newConfig)
    this.logger.log('API version configuration updated', { config: this.config })
  }

  /**
   * Get current version configuration
   */
  getConfig(): ApiVersionConfig {
    return { ...this.config }
  }
}

/**
 * Decorator to specify minimum API version for security-sensitive endpoints
 */
export function MinApiVersion(version: string) {
  return function (_target: unknown, _propertyKey: string | symbol | undefined, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = function (...args: unknown[]) {
      const request = args.find(arg => arg && typeof arg === 'object' && 'apiVersion' in arg) as { apiVersion?: string }
      
      if (request?.apiVersion) {
        const requestedVersion = parseInt(request.apiVersion.replace('v', ''))
        const minVersion = parseInt(version.replace('v', ''))
        
        if (requestedVersion < minVersion) {
          throw new HttpException({
            error: 'API_VERSION_TOO_OLD',
            message: `This endpoint requires API version ${version} or higher`,
            currentVersion: request.apiVersion,
            minimumVersion: version
          }, 426) // 426 Upgrade Required
        }
      }

      return originalMethod.apply(this, args)
    }

    return descriptor
  }
}