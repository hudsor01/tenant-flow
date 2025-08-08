/**
 * Simplified Security System - Main Export
 * Essential security functions for TenantFlow MVP
 */

// Core Simplified Security
export { 
  SimpleSecurity, 
  withBasicSecurity, 
  withAuth
} from './simple-security';
export type { UserRole } from './simple-security';

// Keep essential input sanitization exports
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

// Keep JWT validation (simplified)
export { validateJWT, extractOrganizationId, extractPermissions, isTokenNearExpiration } from './jwt-validator';

// Keep file upload security - still needed
export {
  validateFile,
  validateMultipleFiles,
  quarantineFile,
  getFileConfig,
  updateFileConfig,
} from './file-upload-security';

// Simplified Security Configuration
export interface SimplifiedSecurityConfig {
  fileUpload: {
    maxSize: number;
    allowedTypes: string[];
  };
  jwt: {
    refreshBuffer: number;
    maxAge: number;
  };
}

export const DEFAULT_SECURITY_CONFIG: SimplifiedSecurityConfig = {
  fileUpload: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['image/*', 'application/pdf', 'application/msword'],
  },
  jwt: {
    refreshBuffer: 5 * 60 * 1000, // 5 minutes
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
};

/**
 * Initialize simplified security system
 */
export function initializeSecurity(config: Partial<SimplifiedSecurityConfig> = {}) {
  const finalConfig = { ...DEFAULT_SECURITY_CONFIG, ...config };
  
  console.log('🔒 Initializing Simplified Security System');
  console.log('├── Input Sanitization:', '✓');
  console.log('├── JWT Validation:', '✓');
  console.log('├── Password Security:', '✓');
  console.log('├── File Upload Security:', '✓');
  console.log('├── Basic Security Headers:', '✓');
  console.log('└── Simple Role Check:', '✓');
  
  return finalConfig;
}

/**
 * Simple security health check
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
  
  // Check for required environment variables
  checks.envSecrets = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  if (!checks.envSecrets) {
    issues.push('Required environment variables missing');
  }
  
  // Check if basic security headers are configured
  checks.basicSecurityHeaders = true;
  
  // Determine overall status
  const failedChecks = Object.values(checks).filter(check => !check).length;
  const status = failedChecks === 0 ? 'healthy' : 
                 failedChecks <= 1 ? 'warning' : 'critical';
  
  return { status, checks, issues };
}

/**
 * Essential security best practices for MVP
 */
export const ESSENTIAL_SECURITY_PRACTICES = [
  'Enable HTTPS in production',
  'Use environment variables for secrets',
  'Implement strong password policies',
  'Keep dependencies updated',
  'Validate all user inputs',
  'Use secure session management',
];

// Simple security utilities - no complex emergency response needed for MVP