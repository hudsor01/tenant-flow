/**
 * Enterprise JWT Token Validation and Management
 * Handles token validation, refresh, and security checks
 */

import { jwtDecode } from 'jwt-decode';
import { logger } from '@/lib/logger'
import type { SupabaseJwtPayload } from '@repo/shared';

// Use shared JWT payload type instead of local interface
type JWTPayload = SupabaseJwtPayload & {
  iss: string;
  aud: string | string[];
  role?: string;
  app_metadata?: {
    role?: string;
    organization_id?: string;
    permissions?: string[];
  };
};

interface JWTValidationResult {
  valid: boolean;
  reason?: string;
  payload?: JWTPayload;
  expiresIn?: number;
}


// JWT Security Configuration
const JWT_CONFIG = {
  // Token expiration buffer (refresh if expires within 5 minutes)
  REFRESH_BUFFER_MS: 5 * 60 * 1000,
  
  // Maximum token age (24 hours)
  MAX_TOKEN_AGE_MS: 24 * 60 * 60 * 1000,
  
  // Required claims
  REQUIRED_CLAIMS: ['sub', 'iss', 'aud', 'exp', 'iat'],
  
  // Allowed issuers
  ALLOWED_ISSUERS: [
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    'https://supabase.co',
    'https://app.supabase.com',
  ],
  
  // Expected audience
  EXPECTED_AUDIENCE: 'authenticated',
};

/**
 * Comprehensive JWT token validation
 */
export async function validateJWT(token: string): Promise<JWTValidationResult> {
  try {
    if (!token || typeof token !== 'string') {
      return { valid: false, reason: 'Invalid token format' };
    }

    // Decode without verification first to check structure
    let payload: JWTPayload;
    try {
      payload = jwtDecode<JWTPayload>(token);
    } catch {
      return { valid: false, reason: 'Token decode failed' };
    }

    // Validate required claims
    const missingClaims = JWT_CONFIG.REQUIRED_CLAIMS.filter(
      claim => !payload[claim as keyof JWTPayload]
    );
    if (missingClaims.length > 0) {
      return {
        valid: false,
        reason: `Missing required claims: ${missingClaims.join(', ')}`,
      };
    }

    // Check token expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      return {
        valid: false,
        reason: 'Token expired',
        payload,
        expiresIn: (payload.exp - now) * 1000,
      };
    }

    // Check if token is too old (issued more than 24 hours ago)
    const tokenAge = now - payload.iat;
    if (tokenAge * 1000 > JWT_CONFIG.MAX_TOKEN_AGE_MS) {
      return {
        valid: false,
        reason: 'Token too old',
        payload,
      };
    }

    // Validate issuer
    const validIssuer = JWT_CONFIG.ALLOWED_ISSUERS.some(issuer => 
      issuer && payload.iss.includes(issuer.replace('https://', '').replace('http://', ''))
    );
    if (!validIssuer) {
      return {
        valid: false,
        reason: `Invalid issuer: ${payload.iss}`,
        payload,
      };
    }

    // Validate audience
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(JWT_CONFIG.EXPECTED_AUDIENCE)) {
      return {
        valid: false,
        reason: `Invalid audience: ${audiences.join(', ')}`,
        payload,
      };
    }

    // Check for suspicious patterns
    const suspiciousCheck = checkForSuspiciousTokenPatterns(payload);
    if (!suspiciousCheck.valid) {
      return suspiciousCheck;
    }

    // Calculate time until expiration
    const expiresIn = (payload.exp - now) * 1000;

    return {
      valid: true,
      payload,
      expiresIn,
    };

  } catch (error) {
    return {
      valid: false,
      reason: `Token validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Check for suspicious token patterns that might indicate compromise
 */
function checkForSuspiciousTokenPatterns(payload: JWTPayload): JWTValidationResult {
  // Check for impossible future issued time
  const now = Math.floor(Date.now() / 1000);
  if (payload.iat > now + 60) { // Allow 1 minute clock skew
    return {
      valid: false,
      reason: 'Token issued in the future',
      payload,
    };
  }

  // Check for suspicious user metadata
  if (payload.user_metadata) {
    // Look for potential XSS in user metadata
    const metadataString = JSON.stringify(payload.user_metadata);
    const suspiciousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /data:text\/html/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi, // Event handlers like onclick=
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(metadataString)) {
        return {
          valid: false,
          reason: 'Suspicious content in user metadata',
          payload,
        };
      }
    }
  }

  // Check for role escalation attempts
  const role = payload.app_metadata?.role || payload.role;
  if (role && typeof role === 'string') {
    // Check for suspicious role values
    const suspiciousRoles = ['admin', 'superuser', 'root', 'system'];
    const lowerRole = role.toLowerCase();
    
    // This is more of a warning than a hard validation failure
    if (suspiciousRoles.includes(lowerRole)) {
      logger.warn(`[SECURITY] High-privilege role detected in token: ${role}`, { component: "lib_security_jwt_validator.ts" });
    }
  }

  return { valid: true };
}

/**
 * Extract organization ID from JWT token
 */
export function extractOrganizationId(token: string): string | null {
  try {
    const payload = jwtDecode<JWTPayload>(token);
    return payload.app_metadata?.organization_id || null;
  } catch {
    return null;
  }
}

/**
 * Extract user permissions from JWT token
 */
export function extractPermissions(token: string): string[] {
  try {
    const payload = jwtDecode<JWTPayload>(token);
    return payload.app_metadata?.permissions || [];
  } catch {
    return [];
  }
}

/**
 * Get token expiration time
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const payload = jwtDecode<JWTPayload>(token);
    return new Date(payload.exp * 1000);
  } catch {
    return null;
  }
}

/**
 * Check if token is close to expiration
 */
export function isTokenNearExpiration(token: string, bufferMs: number = JWT_CONFIG.REFRESH_BUFFER_MS): boolean {
  try {
    const payload = jwtDecode<JWTPayload>(token);
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = (payload.exp - now) * 1000;
    return expiresIn <= bufferMs;
  } catch {
    return true; // Assume expired if we can't decode
  }
}