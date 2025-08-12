import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query
} from '@nestjs/common'
import { CorsSecurityService, CorsOriginConfig } from '../security/cors-security.service'
import { SecurityMonitorService } from '../security/security-monitor.service'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'

interface AddOriginRequest {
  pattern: string
  description: string
  allowCredentials?: boolean
  maxAge?: number
  methods?: string[]
  headers?: string[]
  exposedHeaders?: string[]
  isRegex?: boolean
}

interface CorsValidationRequest {
  origin: string
  userAgent?: string
  ip?: string
}

@Controller('admin/cors')
@UseGuards(JwtAuthGuard)
export class CorsManagementController {
  constructor(
    private readonly corsSecurityService: CorsSecurityService,
    private readonly securityMonitor: SecurityMonitorService
  ) {}

  /**
   * Get current CORS configuration and statistics
   */
  @Get('status')
  getCorsStatus(): {
    statistics: {
      enabledOrigins: number
      blockedOrigins: number
      rateLimitedOrigins: number
      totalRequests: number
    }
    recentActivity: string
  } {
    const statistics = this.corsSecurityService.getCorsStatistics()
    
    return {
      statistics,
      recentActivity: `Active CORS monitoring with ${statistics.enabledOrigins} allowed origins`
    }
  }

  /**
   * Test CORS validation for a specific origin
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  validateOrigin(@Body() request: CorsValidationRequest): {
    allowed: boolean
    config?: Partial<CorsOriginConfig>
    headers?: Record<string, string>
    reason?: string
  } {
    const { origin, userAgent, ip } = request
    
    const isAllowed = this.corsSecurityService.validateOrigin(origin, userAgent, ip)
    
    if (!isAllowed) {
      return {
        allowed: false,
        reason: 'Origin validation failed - check security logs for details'
      }
    }

    const config = this.corsSecurityService.getCorsConfigForOrigin(origin)
    const headers = this.corsSecurityService.getCorsHeaders(origin)

    return {
      allowed: true,
      config: config || undefined,
      headers
    }
  }

  /**
   * Add a new allowed origin
   */
  @Post('origins')
  @HttpCode(HttpStatus.CREATED)
  addOrigin(@Body() request: AddOriginRequest): {
    success: boolean
    message: string
    pattern: string | RegExp
  } {
    const pattern = request.isRegex 
      ? new RegExp(request.pattern)
      : request.pattern

    const originConfig: CorsOriginConfig = {
      pattern,
      description: request.description,
      allowCredentials: request.allowCredentials ?? false,
      maxAge: request.maxAge,
      methods: request.methods,
      headers: request.headers,
      exposedHeaders: request.exposedHeaders
    }

    this.corsSecurityService.addAllowedOrigin(originConfig)

    void this.securityMonitor.logSecurityEvent({
      type: 'AUTH_SUCCESS',
      details: {
        operation: 'cors_origin_added_via_api',
        pattern: pattern.toString(),
        description: request.description,
        admin_action: true
      }
    })

    return {
      success: true,
      message: `Origin pattern added successfully: ${pattern}`,
      pattern
    }
  }

  /**
   * Remove an allowed origin
   */
  @Delete('origins/:pattern')
  @HttpCode(HttpStatus.OK)
  removeOrigin(@Param('pattern') pattern: string): {
    success: boolean
    message: string
    removed: boolean
  } {
    // URL decode the pattern
    const decodedPattern = decodeURIComponent(pattern)
    
    const removed = this.corsSecurityService.removeAllowedOrigin(decodedPattern)

    if (removed) {
      void this.securityMonitor.logSecurityEvent({
        type: 'AUTH_SUCCESS',
        details: {
          operation: 'cors_origin_removed_via_api',
          pattern: decodedPattern,
          admin_action: true
        }
      })
    }

    return {
      success: true,
      message: removed 
        ? `Origin pattern removed: ${decodedPattern}`
        : `Origin pattern not found: ${decodedPattern}`,
      removed
    }
  }

  /**
   * Get CORS headers for a specific origin
   */
  @Get('headers')
  getCorsHeaders(@Query('origin') origin: string): {
    origin: string
    headers: Record<string, string>
    valid: boolean
  } {
    if (!origin) {
      return {
        origin: '',
        headers: {},
        valid: false
      }
    }

    const isValid = this.corsSecurityService.validateOrigin(origin)
    const headers = isValid 
      ? this.corsSecurityService.getCorsHeaders(origin)
      : {}

    return {
      origin,
      headers,
      valid: isValid
    }
  }

  /**
   * Get comprehensive CORS analytics
   */
  @Get('analytics')
  getCorsAnalytics(): {
    statistics: {
      enabledOrigins: number
      blockedOrigins: number
      rateLimitedOrigins: number
      totalRequests: number
    }
    recommendations: string[]
    securityAlerts: string[]
  } {
    const statistics = this.corsSecurityService.getCorsStatistics()
    
    const recommendations: string[] = []
    const securityAlerts: string[] = []

    // Generate recommendations based on current state
    if (statistics.enabledOrigins === 0) {
      recommendations.push('No origins are currently allowed. Consider adding your frontend domains.')
    }

    if (statistics.rateLimitedOrigins > 10) {
      recommendations.push('High number of rate-limited origins detected. Consider reviewing rate limits.')
    }

    if (statistics.totalRequests > 1000) {
      recommendations.push('High CORS request volume. Monitor for potential abuse.')
    }

    // Generate security alerts
    if (statistics.blockedOrigins > 0) {
      securityAlerts.push(`${statistics.blockedOrigins} origins are currently blocked`)
    }

    if (statistics.rateLimitedOrigins > 5) {
      securityAlerts.push(`${statistics.rateLimitedOrigins} origins are currently rate limited`)
    }

    return {
      statistics,
      recommendations,
      securityAlerts
    }
  }

  /**
   * Health check endpoint for CORS service
   */
  @Get('health')
  getHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy'
    details: {
      corsEnabled: boolean
      originsConfigured: number
      rateLimitingActive: boolean
    }
    timestamp: string
  } {
    const statistics = this.corsSecurityService.getCorsStatistics()
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    
    if (statistics.enabledOrigins === 0) {
      status = 'degraded'
    }
    
    if (statistics.rateLimitedOrigins > 20) {
      status = 'unhealthy'
    }

    return {
      status,
      details: {
        corsEnabled: true,
        originsConfigured: statistics.enabledOrigins,
        rateLimitingActive: statistics.rateLimitedOrigins > 0
      },
      timestamp: new Date().toISOString()
    }
  }
}