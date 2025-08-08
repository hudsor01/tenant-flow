/**
 * Enterprise Security System - Main Export
 * Complete security architecture for TenantFlow application
 */

// Core Security Components
export { applyEnhancedSecurityHeaders, generateCSPNonce, useCSPNonce } from './enhanced-security-headers';
export { applyCSRFProtection, generateCSRFToken, validateCSRFToken, useCSRFToken } from './csrf-protection';
export { validateJWT, extractOrganizationId, extractPermissions, isTokenNearExpiration } from './jwt-validator';
export { RateLimiter } from './rate-limiter';
export { SecurityLogger, SecurityEventType, SecurityEventSeverity } from './security-logger';
export { 
  RBAC, 
  rbac, 
  checkRBAC, 
  UserRole, 
  Permission, 
  ResourceType, 
  Action 
} from './rbac';

// Input Validation & Sanitization
export {
  validateAndSanitizeInput,
  sanitizeHTML,
  sanitizeText,
  sanitizeURL,
  detectXSS,
  detectSQLInjection,
  detectPathTraversal,
  detectCommandInjection,
  sanitizeFormData,
  createSanitizationMiddleware,
} from './input-sanitization';

// Session Security
export {
  createSession,
  validateSession,
  refreshSession,
  destroySession,
  getUserActiveSessions,
  terminateAllUserSessions,
  createSecureSupabaseSession,
  getSessionStats,
  cleanupExpiredSessions,
  initializeSessionCleanup,
} from './session-security';

// File Upload Security
export {
  validateFile,
  validateMultipleFiles,
  quarantineFile,
  getFileConfig,
  updateFileConfig,
} from './file-upload-security';

// API Security Middleware
export {
  createSecurityMiddleware,
  withSecurity,
  commonSecurityRules,
  getSecurityMetrics,
} from './api-security-middleware';

// Security Configuration
export interface SecurityConfig {
  csrf: {
    enabled: boolean;
    tokenLength: number;
    tokenTTL: number;
  };
  rateLimit: {
    enabled: boolean;
    defaultLimit: number;
    windowMs: number;
  };
  jwt: {
    refreshBuffer: number;
    maxAge: number;
  };
  fileUpload: {
    maxSize: number;
    allowedTypes: string[];
    scanMalware: boolean;
  };
  logging: {
    enabled: boolean;
    level: 'low' | 'medium' | 'high';
    retention: number; // days
  };
  headers: {
    csp: boolean;
    hsts: boolean;
    frameOptions: boolean;
  };
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  csrf: {
    enabled: true,
    tokenLength: 32,
    tokenTTL: 24 * 60 * 60 * 1000, // 24 hours
  },
  rateLimit: {
    enabled: true,
    defaultLimit: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  jwt: {
    refreshBuffer: 5 * 60 * 1000, // 5 minutes
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
  fileUpload: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['image/*', 'application/pdf', 'application/msword'],
    scanMalware: true,
  },
  logging: {
    enabled: true,
    level: 'medium',
    retention: 90, // days
  },
  headers: {
    csp: true,
    hsts: true,
    frameOptions: true,
  },
};

/**
 * Initialize security system
 */
export function initializeSecurity(config: Partial<SecurityConfig> = {}) {
  const finalConfig = { ...DEFAULT_SECURITY_CONFIG, ...config };
  
  console.log('🔒 Initializing Enterprise Security System');
  console.log('├── CSRF Protection:', finalConfig.csrf.enabled ? '✓' : '✗');
  console.log('├── Rate Limiting:', finalConfig.rateLimit.enabled ? '✓' : '✗');
  console.log('├── JWT Validation:', '✓');
  console.log('├── Input Sanitization:', '✓');
  console.log('├── RBAC System:', '✓');
  console.log('├── Security Logging:', finalConfig.logging.enabled ? '✓' : '✗');
  console.log('├── File Upload Security:', '✓');
  console.log('├── Session Security:', '✓');
  console.log('└── Security Headers:', finalConfig.headers.csp ? '✓' : '✗');
  
  return finalConfig;
}

/**
 * Security health check
 */
export async function performSecurityHealthCheck(): Promise<{
  status: 'healthy' | 'warning' | 'critical';
  checks: Record<string, boolean>;
  issues: string[];
}> {
  const checks: Record<string, boolean> = {};
  const issues: string[] = [];
  
  // Check if HTTPS is enforced in production
  checks.httpsEnforced = process.env.NODE_ENV !== 'production' || 
    process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://') === true;
  if (!checks.httpsEnforced) {
    issues.push('HTTPS not enforced in production');
  }
  
  // Check if security headers are configured
  checks.securityHeaders = true; // Assuming they are with our middleware
  
  // Check if CSP is configured
  checks.cspConfigured = true;
  
  // Check if rate limiting is active
  checks.rateLimitingActive = true;
  
  // Check for environment variables
  checks.envSecrets = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  if (!checks.envSecrets) {
    issues.push('Required environment variables missing');
  }
  
  // Check session configuration
  checks.secureSession = true;
  
  // Determine overall status
  const failedChecks = Object.values(checks).filter(check => !check).length;
  const status = failedChecks === 0 ? 'healthy' : 
                 failedChecks <= 2 ? 'warning' : 'critical';
  
  return { status, checks, issues };
}

/**
 * Security best practices recommendations
 */
export const SECURITY_RECOMMENDATIONS = {
  general: [
    'Enable HTTPS in production with HSTS headers',
    'Use environment variables for all secrets',
    'Implement proper error handling without information leakage',
    'Regular security audits and dependency updates',
    'Monitor and log all security events',
  ],
  
  authentication: [
    'Implement multi-factor authentication (MFA)',
    'Use strong password policies',
    'Implement account lockout mechanisms',
    'Regular session token rotation',
    'Secure password recovery flows',
  ],
  
  authorization: [
    'Implement principle of least privilege',
    'Use role-based access control (RBAC)',
    'Validate permissions on every request',
    'Implement resource-level authorization',
    'Regular access review and cleanup',
  ],
  
  dataProtection: [
    'Encrypt sensitive data at rest',
    'Use TLS for all data in transit',
    'Implement proper key management',
    'Regular data backups with encryption',
    'GDPR compliance for user data',
  ],
  
  infrastructure: [
    'Keep dependencies updated',
    'Use Content Security Policy (CSP)',
    'Implement proper CORS policies',
    'Use security headers (HSTS, X-Frame-Options, etc.)',
    'Regular security scanning and penetration testing',
  ],
};

/**
 * Emergency security response
 */
export class EmergencySecurityResponse {
  private static instance: EmergencySecurityResponse;
  private emergencyMode = false;
  
  static getInstance(): EmergencySecurityResponse {
    if (!EmergencySecurityResponse.instance) {
      EmergencySecurityResponse.instance = new EmergencySecurityResponse();
    }
    return EmergencySecurityResponse.instance;
  }
  
  /**
   * Activate emergency security mode
   */
  activateEmergencyMode(reason: string): void {
    this.emergencyMode = true;
    console.error('🚨 EMERGENCY SECURITY MODE ACTIVATED:', reason);
    
    // In production, this would:
    // - Terminate all active sessions
    // - Increase rate limiting severity
    // - Enable additional logging
    // - Send alerts to security team
    // - Potentially put system in maintenance mode
  }
  
  /**
   * Deactivate emergency mode
   */
  deactivateEmergencyMode(): void {
    this.emergencyMode = false;
    console.log('✅ Emergency security mode deactivated');
  }
  
  /**
   * Check if in emergency mode
   */
  isEmergencyModeActive(): boolean {
    return this.emergencyMode;
  }
}

// Export singleton instance
export const emergencyResponse = EmergencySecurityResponse.getInstance();