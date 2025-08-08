/**
 * Simplified Security Module for MVP
 * Essential security functions without enterprise over-engineering
 */

import { type NextRequest, NextResponse } from 'next/server';

// Simplified role system - only what we actually need
export type UserRole = 'admin' | 'user' | 'tenant';

interface SecurityValidationResult {
  valid: boolean;
  errors: string[];
}

interface AuthContext {
  userId?: string;
  organizationId?: string;
  userRole?: UserRole;
  isAuthenticated: boolean;
}

/**
 * Essential security utilities for MVP
 */
export class SimpleSecurity {
  /**
   * Validate password strength with reasonable requirements
   */
  static validatePassword(password: string): SecurityValidationResult {
    const errors: string[] = [];

    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common weak patterns
    const commonPasswords = ['password', 'password123', 'admin', 'letmein', 'welcome'];
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      errors.push('Password is too common');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Basic input sanitization to prevent XSS
   */
  static sanitizeInput(input: string): string {
    if (!input) return '';

    return input
      .replace(/\0/g, '') // Remove null bytes
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .trim();
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254 && !email.includes('..');
  }

  /**
   * Simple role-based permission check
   */
  static hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
    const roleHierarchy: Record<UserRole, number> = {
      tenant: 1,
      user: 2,
      admin: 3,
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  /**
   * Extract basic auth context from request
   */
  static async extractAuthContext(request: NextRequest): Promise<AuthContext> {
    const authHeader = request.headers.get('authorization');
    const sessionCookie = request.cookies.get('session')?.value;

    // Basic authentication check - integrate with your actual auth system
    const isAuthenticated = !!(authHeader || sessionCookie);

    // In a real implementation, you'd decode the JWT token here
    // For now, return basic structure
    return {
      isAuthenticated,
      userId: undefined, // Extract from JWT
      organizationId: undefined, // Extract from JWT
      userRole: undefined, // Extract from JWT
    };
  }

  /**
   * Basic security headers for responses
   */
  static addSecurityHeaders(response: NextResponse): NextResponse {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    return response;
  }

  /**
   * Check for suspicious request patterns
   */
  static isSuspiciousRequest(request: NextRequest): boolean {
    const url = request.url.toLowerCase();
    const userAgent = request.headers.get('user-agent') || '';

    // Check for obvious injection attempts
    const suspiciousPatterns = [
      /union.*select/i,
      /insert.*into/i,
      /delete.*from/i,
      /<script/i,
      /javascript:/i,
      /\.\.[\\/]/,
      /%2e%2e/i,
    ];

    return suspiciousPatterns.some(pattern => 
      pattern.test(url) || pattern.test(userAgent)
    );
  }
}

/**
 * Simple middleware wrapper for API routes
 */
export function withBasicSecurity(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async function securedHandler(req: NextRequest): Promise<NextResponse> {
    // Check for suspicious requests
    if (SimpleSecurity.isSuspiciousRequest(req)) {
      return new NextResponse('Request blocked', { status: 403 });
    }

    // Call the original handler
    const response = await handler(req);

    // Add basic security headers
    return SimpleSecurity.addSecurityHeaders(response);
  };
}

/**
 * Simple auth middleware for protected routes
 */
export function withAuth(
  handler: (req: NextRequest, context: AuthContext) => Promise<NextResponse>,
  requiredRole?: UserRole
) {
  return async function authHandler(req: NextRequest): Promise<NextResponse> {
    const context = await SimpleSecurity.extractAuthContext(req);

    if (!context.isAuthenticated) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (requiredRole && context.userRole && 
        !SimpleSecurity.hasPermission(context.userRole, requiredRole)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    return handler(req, context);
  };
}