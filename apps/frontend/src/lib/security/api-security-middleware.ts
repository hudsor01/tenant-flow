/**
 * Enterprise API Security Middleware
 * Integrates all security components for Next.js API routes
 */

import { type NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger'
import { applyCSRFProtection } from './csrf-protection';
import { applyEnhancedSecurityHeaders } from './enhanced-security-headers';
import { validateAndSanitizeInput } from './input-sanitization';
import { SecurityLogger, SecurityEventType } from './security-logger';
import { RateLimiter } from './rate-limiter';
import { rbac, UserRole } from './rbac';

interface SecurityMiddlewareOptions {
  enableCSRF?: boolean;
  enableRateLimit?: boolean;
  enableInputValidation?: boolean;
  enableRBAC?: boolean;
  enableSecurityHeaders?: boolean;
  enableLogging?: boolean;
  customRules?: SecurityRule[];
}

interface SecurityRule {
  name: string;
  condition: (req: NextRequest) => boolean;
  action: (req?: NextRequest, res?: NextResponse) => Promise<NextResponse | null>;
}

interface SecurityContext {
  userId?: string;
  organizationId?: string;
  userRole?: string;
  sessionId?: string;
  ip: string;
  userAgent: string;
  isAuthenticated: boolean;
}

const securityLogger = new SecurityLogger();
const rateLimiter = new RateLimiter();

/**
 * Main security middleware factory
 */
export function createSecurityMiddleware(options: SecurityMiddlewareOptions = {}) {
  const {
    enableCSRF = true,
    enableRateLimit = true,
    enableInputValidation = true,
    enableRBAC = true,
    enableSecurityHeaders = true,
    enableLogging = true,
    customRules = [],
  } = options;

  return async function securityMiddleware(
    request: NextRequest,
    context?: SecurityContext
  ): Promise<NextResponse | null> {
    const response = NextResponse.next();
    const startTime = performance.now();
    
    try {
      // Extract security context
      const securityContext = context || await extractSecurityContext(request);
      
      // Apply security headers first
      if (enableSecurityHeaders) {
        applyEnhancedSecurityHeaders(response, request, securityContext.sessionId);
      }

      // Rate limiting check
      if (enableRateLimit) {
        const rateLimitResult = await rateLimiter.checkLimit(
          securityContext.ip,
          request.nextUrl.pathname
        );
        
        if (!rateLimitResult.allowed) {
          if (enableLogging) {
            await securityLogger.logSecurityEvent({
              type: SecurityEventType.RATE_LIMIT_EXCEEDED,
              timestamp: new Date().toISOString(),
              ip: securityContext.ip,
              path: request.nextUrl.pathname,
              userId: securityContext.userId,
              userAgent: securityContext.userAgent,
            });
          }
          
          return new NextResponse('Rate limit exceeded', {
            status: 429,
            headers: {
              'Retry-After': '60',
              'X-RateLimit-Limit': rateLimitResult.limit.toString(),
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            },
          });
        }
        
        // Set rate limit headers
        response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
        response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      }

      // CSRF protection
      if (enableCSRF) {
        const csrfResult = await applyCSRFProtection(
          request,
          response,
          securityContext.sessionId
        );
        
        if (!csrfResult.allowed) {
          if (enableLogging) {
            await securityLogger.logSecurityEvent({
              type: SecurityEventType.CSRF_TOKEN_MISMATCH,
              timestamp: new Date().toISOString(),
              ip: securityContext.ip,
              path: request.nextUrl.pathname,
              userId: securityContext.userId,
              reason: csrfResult.error,
            });
          }
          
          return new NextResponse('CSRF token validation failed', { status: 403 });
        }
      }

      // Input validation and sanitization
      if (enableInputValidation) {
        const inputValidationResult = await validateRequestInput(request);
        if (!inputValidationResult.valid) {
          if (enableLogging) {
            await securityLogger.logSecurityEvent({
              type: SecurityEventType.SUSPICIOUS_REQUEST_PATTERN,
              timestamp: new Date().toISOString(),
              ip: securityContext.ip,
              path: request.nextUrl.pathname,
              userId: securityContext.userId,
              reason: inputValidationResult.errors.join(', '),
            });
          }
          
          return new NextResponse('Invalid input detected', { status: 400 });
        }
      }

      // Role-Based Access Control
      if (enableRBAC && securityContext.isAuthenticated) {
        const hasAccess = await rbac.hasResourceAccess(
          (securityContext.userRole as UserRole) || UserRole.READONLY_USER,
          securityContext.organizationId || '',
          securityContext.organizationId,
          securityContext.userId,
          securityContext.userId
        );
        
        if (!hasAccess) {
          if (enableLogging) {
            await securityLogger.logSecurityEvent({
              type: SecurityEventType.RBAC_ACCESS_DENIED,
              timestamp: new Date().toISOString(),
              ip: securityContext.ip,
              path: request.nextUrl.pathname,
              userId: securityContext.userId,
              userRole: securityContext.userRole,
              organizationId: securityContext.organizationId,
            });
          }
          
          return new NextResponse('Access denied', { status: 403 });
        }
      }

      // Apply custom security rules
      for (const rule of customRules) {
        if (rule.condition(request)) {
          const ruleResult = await rule.action(request, response);
          if (ruleResult) {
            return ruleResult;
          }
        }
      }

      // Log successful request (if enabled)
      if (enableLogging) {
        const processingTime = performance.now() - startTime;
        await securityLogger.logSecurityEvent({
          type: SecurityEventType.AUTHENTICATED_ACCESS,
          timestamp: new Date().toISOString(),
          ip: securityContext.ip,
          path: request.nextUrl.pathname,
          method: request.method,
          userId: securityContext.userId,
          userRole: securityContext.userRole,
          organizationId: securityContext.organizationId,
          additionalData: {
            processingTimeMs: Math.round(processingTime),
            userAgent: securityContext.userAgent,
          },
        });
      }

      // Add security response headers
      response.headers.set('X-Security-Middleware', 'active');
      response.headers.set('X-Processing-Time', `${Math.round(performance.now() - startTime)}ms`);
      
      return null; // Allow request to proceed
      
    } catch (error) {
      if (enableLogging) {
        await securityLogger.logSecurityEvent({
          type: SecurityEventType.MIDDLEWARE_ERROR,
          timestamp: new Date().toISOString(),
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          path: request.nextUrl.pathname,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      
      logger.error('Security middleware error:', error instanceof Error ? error : new Error(String(error)), { component: 'lib_security_api_security_middleware.ts' });
      return new NextResponse('Internal security error', { status: 500 });
    }
  };
}

/**
 * Extract security context from request
 */
async function extractSecurityContext(request: NextRequest): Promise<SecurityContext> {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // Extract from cookies or headers (this would integrate with your auth system)
  const sessionCookie = request.cookies.get('session')?.value;
  const authHeader = request.headers.get('authorization');
  
  // Placeholder - implement actual token/session parsing
  const isAuthenticated = !!(sessionCookie || authHeader);
  
  return {
    ip,
    userAgent,
    isAuthenticated,
    userId: undefined, // Extract from session/token
    organizationId: undefined, // Extract from session/token
    userRole: undefined, // Extract from session/token
    sessionId: sessionCookie,
  };
}

/**
 * Validate request input for malicious patterns
 */
async function validateRequestInput(request: NextRequest): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
  try {
    // Validate URL parameters
    const url = new URL(request.url);
    for (const [key, value] of url.searchParams.entries()) {
      const result = validateAndSanitizeInput(value, { type: 'text', strict: true });
      if (!result.valid) {
        errors.push(`Invalid URL parameter "${key}": ${result.errors.join(', ')}`);
      }
    }
    
    // Validate headers for injection attempts
    const dangerousHeaders = ['user-agent', 'referer', 'x-forwarded-for'];
    for (const header of dangerousHeaders) {
      const value = request.headers.get(header);
      if (value) {
        const result = validateAndSanitizeInput(value, { type: 'text', strict: false });
        if (result.warnings.length > 0) {
          errors.push(`Suspicious header "${header}": ${result.warnings.join(', ')}`);
        }
      }
    }
    
    // Validate request body if present
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        const contentType = request.headers.get('content-type');
        
        if (contentType?.includes('application/json')) {
          const body = await request.json();
          const result = validateAndSanitizeInput(JSON.stringify(body), {
            type: 'text',
            strict: true,
            maxLength: 100000, // 100KB limit for JSON
          });
          
          if (!result.valid) {
            errors.push(`Invalid request body: ${result.errors.join(', ')}`);
          }
        } else if (contentType?.includes('application/x-www-form-urlencoded')) {
          const formData = await request.formData();
          for (const [key, value] of formData.entries()) {
            if (typeof value === 'string') {
              const result = validateAndSanitizeInput(value, { type: 'text', strict: true });
              if (!result.valid) {
                errors.push(`Invalid form field "${key}": ${result.errors.join(', ')}`);
              }
            }
          }
        }
      } catch {
        // Error parsing body - might be malicious
        errors.push('Could not parse request body - potentially malicious');
      }
    }
    
  } catch (error) {
    errors.push(`Input validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Pre-built security rules
 */
export const commonSecurityRules: SecurityRule[] = [
  // Block requests with suspicious user agents
  {
    name: 'block-malicious-user-agents',
    condition: (req) => {
      const userAgent = req.headers.get('user-agent') || '';
      const maliciousPatterns = [
        /sqlmap/i,
        /nmap/i,
        /nikto/i,
        /burp/i,
        /w3af/i,
        /acunetix/i,
        /netsparker/i,
        /<script/i,
      ];
      return maliciousPatterns.some(pattern => pattern.test(userAgent));
    },
    action: async (_req, _res) => {
      return new NextResponse('Blocked', { status: 403 });
    },
  },
  
  // Block requests with SQL injection in URL
  {
    name: 'block-sql-injection-urls',
    condition: (req) => {
      const url = req.url.toLowerCase();
      const sqlPatterns = [
        /union.*select/i,
        /insert.*into/i,
        /delete.*from/i,
        /update.*set/i,
        /drop.*table/i,
      ];
      return sqlPatterns.some(pattern => pattern.test(url));
    },
    action: async (_req, _res) => {
      return new NextResponse('SQL injection attempt blocked', { status: 403 });
    },
  },
  
  // Block directory traversal attempts
  {
    name: 'block-directory-traversal',
    condition: (req) => {
      const path = req.nextUrl.pathname;
      return /\.\.[\\/]/.test(path) || /%2e%2e/.test(path);
    },
    action: async (_req, _res) => {
      return new NextResponse('Path traversal blocked', { status: 403 });
    },
  },
  
  // Rate limit password reset attempts more strictly
  {
    name: 'strict-password-reset-rate-limit',
    condition: (req) => {
      return req.nextUrl.pathname.includes('forgot-password') ||
             req.nextUrl.pathname.includes('reset-password');
    },
    action: async (req?: NextRequest) => {
      if (!req) return null;
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      const result = await rateLimiter.checkLimit(ip, 'password-reset');
      
      if (!result.allowed) {
        return new NextResponse('Password reset rate limit exceeded', {
          status: 429,
          headers: { 'Retry-After': '300' }, // 5 minutes
        });
      }
      
      return null; // Allow request
    },
  },
];

/**
 * Helper to create API route with security middleware
 */
export function withSecurity(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: SecurityMiddlewareOptions = {}
) {
  const securityMiddleware = createSecurityMiddleware(options);
  
  return async function securedHandler(req: NextRequest): Promise<NextResponse> {
    // Apply security middleware
    const securityResult = await securityMiddleware(req);
    if (securityResult) {
      return securityResult; // Security middleware blocked the request
    }
    
    // Call the original handler
    return handler(req);
  };
}

/**
 * Security metrics for monitoring
 */
export function getSecurityMetrics() {
  return {
    rateLimiter: rateLimiter.getAllConfigs(),
    recentSecurityEvents: securityLogger.getRecentEvents(100),
    timestamp: new Date().toISOString(),
  };
}