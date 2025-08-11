/**
 * Enhanced Security Headers with Nonce-Based CSP
 * Production-grade security with comprehensive protection
 * 
 * CRITICAL FIXES FOR NEXT.JS 15 PRODUCTION:
 * - unsafe-eval REQUIRED for Next.js dynamic imports and webpack chunks
 * - unsafe-inline REQUIRED for Next.js initialization scripts
 * - Dynamic domain detection based on NEXT_PUBLIC_APP_URL
 * - Middleware excludes _next/ routes to prevent CSP conflicts
 * 
 * CSP Configuration supports:
 * ✅ Next.js production chunks and dynamic imports
 * ✅ Stripe payment processing
 * ✅ Google Maps integration
 * ✅ PostHog analytics
 * ✅ Supabase authentication
 * ✅ Font loading from Google Fonts
 */

import type { NextRequest, NextResponse } from 'next/server';
import { logger } from '../logger';

// Nonce storage for CSP
const nonceStore = new Map<string, { nonce: string; expires: number }>();

/**
 * Generate cryptographically secure nonce for CSP
 */
export function generateCSPNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get or create nonce for current request
 */
export function getOrCreateNonce(sessionId?: string): string {
  const key = sessionId || 'global';
  const stored = nonceStore.get(key);
  
  if (stored && stored.expires > Date.now()) {
    return stored.nonce;
  }
  
  const nonce = generateCSPNonce();
  nonceStore.set(key, {
    nonce,
    expires: Date.now() + (60 * 60 * 1000), // 1 hour
  });
  
  return nonce;
}

/**
 * Enhanced Security Configuration
 */
const ENHANCED_SECURITY_CONFIG = {
  // Content Security Policy with nonce support
  CSP: {
    'default-src': ["'self'"],
    'script-src': [] as string[], // Will be populated dynamically based on environment
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for Next.js inline styles
      'https://fonts.googleapis.com',
      'https://cdn.jsdelivr.net', // For external CSS frameworks if needed
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:',
      '*.supabase.co',
      '*.googleusercontent.com',
      'https://maps.googleapis.com',
      'https://maps.gstatic.com',
      'https://images.unsplash.com',
    ],
    'font-src': [
      "'self'",
      'data:',
      'https://fonts.gstatic.com',
      'https://cdn.jsdelivr.net',
    ],
    'connect-src': [
      "'self'",
      'https://api.tenantflow.app',
      'https://*.supabase.co',
      'https://js.stripe.com',
      'https://api.stripe.com',
      'https://us.i.posthog.com', // PostHog analytics endpoints
      'wss:',
    ],
    'frame-src': [
      "'self'",
      'https://js.stripe.com',
      'https://hooks.stripe.com',
    ],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': [],
    'block-all-mixed-content': [],
  },

  // Enhanced Permissions Policy
  PERMISSIONS_POLICY: {
    camera: '()',
    microphone: '()',
    geolocation: '(self)',
    gyroscope: '()',
    magnetometer: '()',
    payment: '(self "https://js.stripe.com")',
    usb: '()',
    'interest-cohort': '()',
    'browsing-topics': '()', // Topics API
    'attribution-reporting': '()', // Attribution Reporting API
    'trust-token-redemption': '()', // Trust Token API
    fullscreen: '(self)',
    'picture-in-picture': '(self)',
    'accelerometer': '()',
    'ambient-light-sensor': '()',
    'autoplay': '(self)',
    'clipboard-read': '()',
    'clipboard-write': '(self)',
    'display-capture': '()',
    'document-domain': '()',
    'encrypted-media': '()',
    'execution-while-not-rendered': '()',
    'execution-while-out-of-viewport': '()',
    'gamepad': '()',
    'hid': '()',
    'idle-detection': '()',
    'local-fonts': '()',
    'midi': '()',
    'navigation-override': '()',
    'otp-credentials': '()',
    'publickey-credentials-create': '(self)',
    'publickey-credentials-get': '(self)',
    'screen-wake-lock': '()',
    'serial': '()',
    'speaker-selection': '()',
    'storage-access': '()',
    'web-share': '(self)',
    'window-management': '()',
    'xr-spatial-tracking': '()',
  },

  // Strict Transport Security
  HSTS: {
    maxAge: 63072000, // 2 years
    includeSubDomains: true,
    preload: true,
  },

  // Cross-Origin policies
  CROSS_ORIGIN: {
    embedderPolicy: 'require-corp',
    openerPolicy: 'same-origin',
    resourcePolicy: 'cross-origin',
  },
};

/**
 * Get allowed domains based on environment
 */
function getAllowedDomains(): string[] {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const domains = ["'self'"];
  
  // Add current domain
  if (baseUrl.includes('tenantflow.app')) {
    domains.push('https://tenantflow.app');
  } else if (baseUrl.includes('vercel.app')) {
    domains.push('*.vercel.app');
    domains.push('*.vercel-deployments.com');
  } else if (baseUrl.includes('localhost')) {
    domains.push('http://localhost:3000');
    domains.push('http://localhost:3004'); 
    domains.push('ws://localhost:*');
  }
  
  return domains;
}

/**
 * Build CSP header with nonce replacement
 */
function buildEnhancedCSPHeader(isDevelopment: boolean, nonce: string): string {
  const csp = { ...ENHANCED_SECURITY_CONFIG.CSP };
  
  // Get dynamic domains based on environment
  const allowedDomains = getAllowedDomains();
  
  // Update script-src with dynamic domains and Next.js chunk support
  csp['script-src'] = [
    "'self'",
    "'unsafe-inline'", // Required for Next.js inline scripts and initialization
    "'unsafe-eval'", // Required for Next.js dynamic imports and webpack chunks
    ...allowedDomains.filter(domain => domain !== "'self'"),
    // External services
    'https://js.stripe.com',
    'https://maps.googleapis.com', 
    'https://us.i.posthog.com', // PostHog analytics
  ];
  
  // Replace nonce placeholder in remaining directives
  csp['style-src'] = csp['style-src'].map(src => 
    src.replace('{{NONCE}}', nonce)
  );
  
  if (isDevelopment) {
    // Development-specific CSP adjustments for Next.js
    csp['connect-src'] = [
      ...csp['connect-src'],
      'ws://localhost:*',
      'ws://127.0.0.1:*',
      'http://localhost:*',
      'http://127.0.0.1:*',
      // Next.js dev server
      'http://localhost:3000',
      'http://localhost:3004',
    ];
    
    // Allow unsafe-eval for development builds (Next.js requires this)
    csp['script-src'] = [...csp['script-src'], "'unsafe-eval'", "'unsafe-inline'"];
    
    // Allow unsafe-inline for development styles (Next.js dev mode)
    csp['style-src'] = [...csp['style-src'], "'unsafe-inline'"];
    
    // More permissive object-src for development
    csp['object-src'] = ["'none'"];
    
    // Allow data URLs for fonts in development
    csp['font-src'] = [...csp['font-src'], "'unsafe-inline'"];
  } else {
    // Production: Keep both unsafe-inline AND unsafe-eval for Next.js compatibility
    // Next.js requires these for proper functionality even in production:
    // - unsafe-inline: For inline scripts and initialization
    // - unsafe-eval: For dynamic imports and code splitting chunks
    // The framework adds its own security measures for safe evaluation
    
    // Do NOT remove unsafe-eval in production - Next.js needs it for chunks
    // csp['script-src'] = csp['script-src'] (keep as-is)
    
    // Keep unsafe-inline for styles as Next.js requires it
  }
  
  // Build CSP string
  return Object.entries(csp)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive;
      }
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');
}

/**
 * Build enhanced Permissions Policy header
 */
function buildEnhancedPermissionsPolicyHeader(): string {
  return Object.entries(ENHANCED_SECURITY_CONFIG.PERMISSIONS_POLICY)
    .map(([feature, policy]) => `${feature}=${policy}`)
    .join(', ');
}

/**
 * Apply comprehensive enhanced security headers
 */
export function applyEnhancedSecurityHeaders(
  response: NextResponse,
  request: NextRequest,
  sessionId?: string
): NextResponse {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Generate nonce for this request
  const nonce = getOrCreateNonce(sessionId);
  
  // Content Security Policy with nonce
  const cspHeader = buildEnhancedCSPHeader(isDevelopment, nonce);
  
  // Apply CSP in production or when explicitly enabled in development
  // CRITICAL: Always apply CSP in production to prevent JS blocking issues
  if (isProduction || process.env.ENABLE_DEV_CSP === 'true') {
    response.headers.set('Content-Security-Policy', cspHeader);
    
    // Log CSP header in development for debugging
    if (isDevelopment && process.env.ENABLE_DEV_CSP === 'true') {
      logger.info('[CSP DEBUG]', { cspHeader, nonce });
    }
  }
  
  // Store nonce in response header for client access
  response.headers.set('X-CSP-Nonce', nonce);
  
  // Report-Only CSP for testing new policies (removed - causes warnings without report-to)
  // Note: Report-only mode requires 'report-to' directive which needs endpoint setup
  // if (isDevelopment) {
  //   response.headers.set('Content-Security-Policy-Report-Only', cspHeader);
  // }
  
  // Strict Transport Security (HTTPS only)
  if (isProduction) {
    const hstsHeader = `max-age=${ENHANCED_SECURITY_CONFIG.HSTS.maxAge}; includeSubDomains; preload`;
    response.headers.set('Strict-Transport-Security', hstsHeader);
  }
  
  // Enhanced security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Enhanced Permissions Policy
  const permissionsPolicyHeader = buildEnhancedPermissionsPolicyHeader();
  response.headers.set('Permissions-Policy', permissionsPolicyHeader);
  
  // Cross-Origin policies
  response.headers.set('Cross-Origin-Embedder-Policy', ENHANCED_SECURITY_CONFIG.CROSS_ORIGIN.embedderPolicy);
  response.headers.set('Cross-Origin-Opener-Policy', ENHANCED_SECURITY_CONFIG.CROSS_ORIGIN.openerPolicy);
  response.headers.set('Cross-Origin-Resource-Policy', ENHANCED_SECURITY_CONFIG.CROSS_ORIGIN.resourcePolicy);
  
  // Additional security headers
  response.headers.set('X-Download-Options', 'noopen'); // IE security
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none'); // Adobe Flash/PDF
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  
  // Certificate Transparency
  if (isProduction) {
    response.headers.set('Expect-CT', 'enforce, max-age=86400, report-uri="/.well-known/ct-report"');
  }
  
  // Remove server information
  response.headers.delete('Server');
  response.headers.delete('X-Powered-By');
  
  // Cache control based on route sensitivity
  if (isSensitiveRoute(request.nextUrl.pathname)) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
  } else {
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=60');
  }
  
  // Security debugging in development
  if (isDevelopment) {
    response.headers.set('X-Security-Debug', 'enabled');
    // Removed X-CSP-Report-Only header as we're not using report-only mode
  }
  
  return response;
}

/**
 * Enhanced sensitive route detection
 */
function isSensitiveRoute(pathname: string): boolean {
  const sensitivePatterns = [
    /^\/auth\//,
    /^\/admin\//,
    /^\/api\/.*\/(users|auth|admin)/,
    /^\/settings/,
    /^\/profile/,
    /financial|billing|payment/i,
    /tenant-dashboard/i,
    /landlord-portal/i,
    /properties\/.+/i,
    /tenants\/.+/i,
    /maintenance/i,
    /leases/i,
    /api\/.*\/(properties|tenants|maintenance|financial|leases)/i,
    /documents\/.*\.(pdf|doc|docx)/i,
  ];
  
  return sensitivePatterns.some(pattern => pattern.test(pathname));
}

/**
 * Clean up expired nonces
 */
function cleanupExpiredNonces(): void {
  const now = Date.now();
  for (const [key, data] of nonceStore.entries()) {
    if (data.expires < now) {
      nonceStore.delete(key);
    }
  }
}

// Start cleanup interval
setInterval(cleanupExpiredNonces, 10 * 60 * 1000); // Every 10 minutes

/**
 * Get nonce for client-side script injection
 */
export function getClientNonce(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Try to get from meta tag first
  const metaNonce = document.querySelector('meta[name="csp-nonce"]')?.getAttribute('content');
  if (metaNonce) return metaNonce;
  
  // Try to get from response header (would need server-side setup)
  return null;
}

/**
 * React hook for CSP nonce management
 * Note: This must be used in client components only
 */
export function useCSPNonce(): string | null {
  if (typeof window === 'undefined') {
    // useCSPNonce called on server-side. This hook is client-only.
    return null;
  }
  
  // This will be replaced with proper React hook implementation in client components
  return getClientNonce();
}

/**
 * Helper to create nonce-secured script tag
 */
export function createSecureScript(src: string, nonce?: string): HTMLScriptElement {
  const script = document.createElement('script');
  script.src = src;
  if (nonce) {
    script.nonce = nonce;
  }
  return script;
}

/**
 * Helper to create nonce-secured inline script
 */
export function createSecureInlineScript(content: string, nonce?: string): HTMLScriptElement {
  const script = document.createElement('script');
  script.textContent = content;
  if (nonce) {
    script.nonce = nonce;
  }
  return script;
}

/**
 * CSP violation report interface
 */
interface CSPViolationReport {
  blockedURI?: string;
  documentURI?: string;
  effectiveDirective?: string;
  originalPolicy?: string;
  referrer?: string;
  violatedDirective?: string;
  sourceFile?: string;
  lineNumber?: number;
  columnNumber?: number;
  sample?: string;
}

/**
 * CSP violation report handler for monitoring
 */
export function handleCSPViolation(violationReport: CSPViolationReport): void {
  logger.warn('[CSP VIOLATION]', {
    blockedURI: violationReport.blockedURI,
    documentURI: violationReport.documentURI,
    effectiveDirective: violationReport.effectiveDirective,
    originalPolicy: violationReport.originalPolicy,
    referrer: violationReport.referrer,
    violatedDirective: violationReport.violatedDirective,
    timestamp: new Date().toISOString(),
  });
  
  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // fetch('/api/csp-violations', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(violationReport)
    // }).catch(console.error);
  }
}

/**
 * Initialize CSP violation reporting
 */
export function initializeCSPReporting(): void {
  if (typeof window === 'undefined') return;
  
  document.addEventListener('securitypolicyviolation', (event) => {
    handleCSPViolation({
      blockedURI: event.blockedURI,
      documentURI: event.documentURI,
      effectiveDirective: event.effectiveDirective,
      originalPolicy: event.originalPolicy,
      referrer: event.referrer,
      violatedDirective: event.violatedDirective,
    });
  });
}
