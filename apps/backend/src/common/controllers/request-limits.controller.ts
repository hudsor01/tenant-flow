import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query
} from '@nestjs/common'
import { RequestLimitsService } from '../security/request-limits.service'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'

interface RequestValidationRequest {
  bodySize: number
  headerSize: number
  url: string
  ip?: string
}

@Controller('admin/request-limits')
@UseGuards(JwtAuthGuard)
export class RequestLimitsController {
  constructor(
    private readonly requestLimitsService: RequestLimitsService
  ) {}

  /**
   * Get current request limits configuration and metrics
   */
  @Get('status')
  getStatus(): {
    config: {
      maxBodySize: number
      maxHeaderSize: number
      maxUrlLength: number
      maxFileUploadSize: number
      maxMultipartFiles: number
    }
    timeouts: {
      requestTimeout: number
      keepAliveTimeout: number
      connectionTimeout: number
      headerTimeout: number
    }
    metrics: {
      activeConnections: number
      connectionsByIp: Record<string, number>
      rateLimitedIps: number
      recentRequests: number
      averageResponseTime: number
      slowRequests: number
      largeRequests: number
    }
  } {
    const config = this.requestLimitsService.getRequestLimits()
    const timeouts = this.requestLimitsService.getTimeoutConfig()
    const metrics = this.requestLimitsService.getMetrics()

    return {
      config,
      timeouts,
      metrics
    }
  }

  /**
   * Test request validation
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  validateRequest(@Body() request: RequestValidationRequest): {
    allowed: boolean
    reason?: string
    alerts?: string[]
    rateLimit?: {
      allowed: boolean
      remaining: number
      resetTime: string
      reason?: string
    }
  } {
    const { bodySize, headerSize, url, ip = 'test-ip' } = request
    
    // Validate request size
    const sizeValidation = this.requestLimitsService.validateRequestSize(bodySize, headerSize, url)
    
    // Check rate limit if IP provided
    let rateLimitResult
    if (ip && ip !== 'test-ip') {
      const rateLimitCheck = this.requestLimitsService.checkRateLimit(ip, url)
      rateLimitResult = {
        ...rateLimitCheck,
        resetTime: rateLimitCheck.resetTime.toISOString()
      }
    }

    return {
      allowed: sizeValidation.allowed,
      reason: sizeValidation.reason,
      alerts: sizeValidation.alerts,
      rateLimit: rateLimitResult
    }
  }

  /**
   * Get detailed metrics and analytics
   */
  @Get('metrics')
  getMetrics(@Query('timeframe') timeframe = '1h'): {
    timeframe: string
    metrics: {
      activeConnections: number
      connectionsByIp: Record<string, number>
      rateLimitedIps: number
      recentRequests: number
      averageResponseTime: number
      slowRequests: number
      largeRequests: number
    }
    alerts: {
      highConnectionCount: boolean
      highRateLimitedIps: boolean
      slowAverageResponseTime: boolean
    }
    recommendations: string[]
  } {
    const metrics = this.requestLimitsService.getMetrics()
    
    // Analyze metrics for alerts
    const alerts = {
      highConnectionCount: metrics.activeConnections > 500,
      highRateLimitedIps: metrics.rateLimitedIps > 50,
      slowAverageResponseTime: metrics.averageResponseTime > 5000
    }
    
    // Generate recommendations
    const recommendations: string[] = []
    
    if (alerts.highConnectionCount) {
      recommendations.push('Consider reducing maxConnectionsPerIp or implementing connection pooling')
    }
    
    if (alerts.highRateLimitedIps) {
      recommendations.push('Review rate limiting configuration - many IPs are being rate limited')
    }
    
    if (alerts.slowAverageResponseTime) {
      recommendations.push('Investigate slow response times - consider optimizing database queries or API calls')
    }
    
    if (metrics.largeRequests > 10) {
      recommendations.push('Monitor large request patterns - consider implementing request size optimization')
    }

    return {
      timeframe,
      metrics,
      alerts,
      recommendations
    }
  }

  /**
   * Get configuration limits for different request types
   */
  @Get('limits')
  getLimits(): {
    requests: {
      maxBodySize: string
      maxHeaderSize: string
      maxUrlLength: number
      maxFileUploadSize: string
      maxMultipartFiles: number
    }
    timeouts: {
      requestTimeout: string
      keepAliveTimeout: string
      connectionTimeout: string
      headerTimeout: string
    }
    connections: {
      maxConnections: number
      maxConnectionsPerIp: number
    }
    formatted: {
      sizes: Record<string, string>
      timeouts: Record<string, string>
    }
  } {
    const limits = this.requestLimitsService.getRequestLimits()
    const timeouts = this.requestLimitsService.getTimeoutConfig()
    
    const formatBytes = (bytes: number): string => {
      if (bytes >= 1024 * 1024) {
        return `${Math.round(bytes / 1024 / 1024)}MB`
      } else if (bytes >= 1024) {
        return `${Math.round(bytes / 1024)}KB`
      }
      return `${bytes}B`
    }
    
    const formatTimeout = (ms: number): string => {
      if (ms >= 60000) {
        return `${Math.round(ms / 60000)}m`
      } else if (ms >= 1000) {
        return `${Math.round(ms / 1000)}s`
      }
      return `${ms}ms`
    }

    return {
      requests: {
        maxBodySize: formatBytes(limits.maxBodySize),
        maxHeaderSize: formatBytes(limits.maxHeaderSize),
        maxUrlLength: limits.maxUrlLength,
        maxFileUploadSize: formatBytes(limits.maxFileUploadSize),
        maxMultipartFiles: limits.maxMultipartFiles
      },
      timeouts: {
        requestTimeout: formatTimeout(timeouts.requestTimeout),
        keepAliveTimeout: formatTimeout(timeouts.keepAliveTimeout),
        connectionTimeout: formatTimeout(timeouts.connectionTimeout),
        headerTimeout: formatTimeout(timeouts.headerTimeout)
      },
      connections: {
        maxConnections: 1000, // From config
        maxConnectionsPerIp: 50 // From config
      },
      formatted: {
        sizes: {
          'Max Body Size': formatBytes(limits.maxBodySize),
          'Max Header Size': formatBytes(limits.maxHeaderSize),
          'Max File Upload': formatBytes(limits.maxFileUploadSize),
          'Max URL Length': `${limits.maxUrlLength} chars`
        },
        timeouts: {
          'Request Timeout': formatTimeout(timeouts.requestTimeout),
          'Keep-Alive Timeout': formatTimeout(timeouts.keepAliveTimeout),
          'Connection Timeout': formatTimeout(timeouts.connectionTimeout),
          'Header Timeout': formatTimeout(timeouts.headerTimeout)
        }
      }
    }
  }

  /**
   * Health check for request limits service
   */
  @Get('health')
  getHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy'
    details: {
      activeConnections: number
      rateLimitedIps: number
      averageResponseTime: number
      issuesDetected: string[]
    }
    timestamp: string
  } {
    const metrics = this.requestLimitsService.getMetrics()
    const issuesDetected: string[] = []
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    
    // Check for issues
    if (metrics.activeConnections > 800) {
      issuesDetected.push('High connection count')
      status = 'degraded'
    }
    
    if (metrics.rateLimitedIps > 100) {
      issuesDetected.push('Many IPs being rate limited')
      status = 'degraded'
    }
    
    if (metrics.averageResponseTime > 10000) {
      issuesDetected.push('Very slow response times')
      status = 'unhealthy'
    }
    
    if (metrics.activeConnections > 950) {
      issuesDetected.push('Near connection limit')
      status = 'unhealthy'
    }

    return {
      status,
      details: {
        activeConnections: metrics.activeConnections,
        rateLimitedIps: metrics.rateLimitedIps,
        averageResponseTime: metrics.averageResponseTime,
        issuesDetected
      },
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Get rate limiting statistics
   */
  @Get('rate-limits')
  getRateLimitStats(): {
    enabled: boolean
    windowMs: number
    maxRequestsPerWindow: number
    currentlyRateLimited: number
    topRateLimitedEndpoints: {
      endpoint: string
      requestCount: number
    }[]
  } {
    const metrics = this.requestLimitsService.getMetrics()
    
    // Note: This is a simplified version. In a real implementation,
    // you might want to track more detailed rate limiting statistics
    return {
      enabled: true, // From config
      windowMs: 15 * 60 * 1000, // 15 minutes (from config)
      maxRequestsPerWindow: 1000, // From config
      currentlyRateLimited: metrics.rateLimitedIps,
      topRateLimitedEndpoints: [
        // This would be populated from actual rate limiting data
        { endpoint: '/api/auth/login', requestCount: 150 },
        { endpoint: '/api/properties', requestCount: 120 },
        { endpoint: '/api/users/profile', requestCount: 100 }
      ]
    }
  }

  /**
   * Performance monitoring endpoint
   */
  @Get('performance')
  getPerformanceMetrics(): {
    responseTime: {
      average: number
      p95: number
      p99: number
      slowRequests: number
    }
    throughput: {
      requestsPerMinute: number
      recentRequests: number
    }
    resources: {
      memoryUsage: string
      activeConnections: number
      connectionUtilization: string
    }
  } {
    const metrics = this.requestLimitsService.getMetrics()
    
    // Note: This provides sample performance metrics
    // In a real implementation, you'd calculate these from actual request data
    return {
      responseTime: {
        average: metrics.averageResponseTime,
        p95: metrics.averageResponseTime * 2, // Estimated
        p99: metrics.averageResponseTime * 3, // Estimated
        slowRequests: metrics.slowRequests
      },
      throughput: {
        requestsPerMinute: metrics.recentRequests,
        recentRequests: metrics.recentRequests
      },
      resources: {
        memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        activeConnections: metrics.activeConnections,
        connectionUtilization: `${Math.round((metrics.activeConnections / 1000) * 100)}%`
      }
    }
  }
}