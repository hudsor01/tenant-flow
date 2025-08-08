/**
 * Enterprise CSRF Protection System
 * Double-submit cookie pattern with token rotation
 */

import { NextRequest, NextResponse } from 'next/server';

interface CSRFToken {
  value: string;
  expires: number;
  sessionId: string;
}

interface CSRFConfig {
  tokenLength: number;
  tokenTTL: number; // milliseconds
  cookieName: string;
  headerName: string;
  formFieldName: string;
  secureCookie: boolean;
  sameSitePolicy: 'strict' | 'lax' | 'none';
}

const CSRF_CONFIG: CSRFConfig = {
  tokenLength: 32,
  tokenTTL: 24 * 60 * 60 * 1000, // 24 hours
  cookieName: '__Host-csrf-token',
  headerName: 'x-csrf-token',
  formFieldName: '_csrf_token',
  secureCookie: process.env.NODE_ENV === 'production',
  sameSitePolicy: 'strict',
};

// In-memory store (use Redis in production)
const csrfTokens = new Map<string, CSRFToken>();

/**
 * Generate cryptographically secure CSRF token
 */
export function generateCSRFToken(sessionId?: string): string {
  const array = new Uint8Array(CSRF_CONFIG.tokenLength);
  crypto.getRandomValues(array);
  
  // Convert to base64url (URL-safe)
  const token = Array.from(array, byte => 
    byte.toString(16).padStart(2, '0')
  ).join('');
  
  // Store token with metadata
  if (sessionId) {
    csrfTokens.set(token, {
      value: token,
      expires: Date.now() + CSRF_CONFIG.tokenTTL,
      sessionId,
    });
  }
  
  return token;
}

/**
 * Validate CSRF token using double-submit cookie pattern
 */
export function validateCSRFToken(
  cookieToken: string | undefined,
  headerToken: string | undefined,
  formToken: string | undefined,
  sessionId?: string
): { valid: boolean; reason?: string } {
  // Check if tokens are provided
  if (!cookieToken) {
    return { valid: false, reason: 'Missing CSRF cookie' };
  }
  
  const submittedToken = headerToken || formToken;
  if (!submittedToken) {
    return { valid: false, reason: 'Missing CSRF token in header/form' };
  }
  
  // Tokens must match (double-submit pattern)
  if (cookieToken !== submittedToken) {
    return { valid: false, reason: 'CSRF tokens do not match' };
  }
  
  // Validate token exists in store
  const storedToken = csrfTokens.get(cookieToken);
  if (!storedToken) {
    return { valid: false, reason: 'CSRF token not found in store' };
  }
  
  // Check expiration
  if (storedToken.expires < Date.now()) {
    csrfTokens.delete(cookieToken);
    return { valid: false, reason: 'CSRF token expired' };
  }
  
  // Validate session binding (if provided)
  if (sessionId && storedToken.sessionId !== sessionId) {
    return { valid: false, reason: 'CSRF token not bound to current session' };
  }
  
  return { valid: true };
}

/**
 * Set CSRF token in response cookie
 */
export function setCSRFCookie(
  response: NextResponse, 
  token: string,
  domain?: string
): void {
  response.cookies.set(CSRF_CONFIG.cookieName, token, {
    httpOnly: false, // Must be readable by client for header submission
    secure: CSRF_CONFIG.secureCookie,
    sameSite: CSRF_CONFIG.sameSitePolicy,
    maxAge: Math.floor(CSRF_CONFIG.tokenTTL / 1000),
    path: '/',
    domain: domain,
    // Use __Host- prefix for additional security in production
    ...(CSRF_CONFIG.secureCookie && { 
      name: '__Host-csrf-token',
    }),
  });
}

/**
 * Middleware function to handle CSRF protection
 */
export async function applyCSRFProtection(
  request: NextRequest,
  response: NextResponse,
  sessionId?: string
): Promise<{ allowed: boolean; error?: string }> {
  const method = request.method?.toUpperCase();
  const pathname = request.nextUrl.pathname;
  
  // Skip CSRF for safe methods and public routes
  const safeMethods = ['GET', 'HEAD', 'OPTIONS', 'TRACE'];
  const publicRoutes = ['/login', '/signup', '/auth/callback', '/api/health'];
  
  if (
    safeMethods.includes(method || '') ||
    publicRoutes.some(route => pathname.startsWith(route))
  ) {
    // Still generate token for safe methods if none exists
    const existingToken = request.cookies.get(CSRF_CONFIG.cookieName)?.value;
    if (!existingToken) {
      const newToken = generateCSRFToken(sessionId);
      setCSRFCookie(response, newToken);
    }
    return { allowed: true };
  }
  
  // For unsafe methods, validate CSRF token
  const cookieToken = request.cookies.get(CSRF_CONFIG.cookieName)?.value;
  const headerToken = request.headers.get(CSRF_CONFIG.headerName);
  
  // Handle form submissions
  let formToken: string | undefined;
  if (request.headers.get('content-type')?.includes('application/x-www-form-urlencoded')) {
    try {
      const formData = await request.formData();
      formToken = formData.get(CSRF_CONFIG.formFieldName)?.toString();
    } catch {
      // If we can't parse form data, continue without form token
    }
  }
  
  const validation = validateCSRFToken(
    cookieToken,
    headerToken || undefined,
    formToken,
    sessionId
  );
  
  if (!validation.valid) {
    return {
      allowed: false,
      error: `CSRF validation failed: ${validation.reason}`
    };
  }
  
  // Rotate token for enhanced security (optional)
  if (Math.random() < 0.1) { // 10% chance to rotate
    const newToken = generateCSRFToken(sessionId);
    setCSRFCookie(response, newToken);
  }
  
  return { allowed: true };
}

/**
 * Client-side helper to get CSRF token for API calls
 */
export function getCSRFToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Try to get from cookie
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === CSRF_CONFIG.cookieName || name === 'csrf-token') {
      return decodeURIComponent(value);
    }
  }
  
  return null;
}

/**
 * React hook for CSRF token management
 */
export function useCSRFToken() {
  const [token, setToken] = useState<string | null>(null);
  
  useEffect(() => {
    const currentToken = getCSRFToken();
    setToken(currentToken);
    
    // Listen for token changes
    const handleStorageChange = () => {
      const newToken = getCSRFToken();
      setToken(newToken);
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  return token;
}

/**
 * Clean up expired tokens (run periodically)
 */
export function cleanupExpiredCSRFTokens(): void {
  const now = Date.now();
  for (const [token, data] of csrfTokens.entries()) {
    if (data.expires < now) {
      csrfTokens.delete(token);
    }
  }
}

/**
 * Get CSRF token statistics for monitoring
 */
export function getCSRFStats(): {
  totalTokens: number;
  expiredTokens: number;
  validTokens: number;
} {
  const now = Date.now();
  let expiredTokens = 0;
  let validTokens = 0;
  
  for (const data of csrfTokens.values()) {
    if (data.expires < now) {
      expiredTokens++;
    } else {
      validTokens++;
    }
  }
  
  return {
    totalTokens: csrfTokens.size,
    expiredTokens,
    validTokens,
  };
}

// React import for the hook
import { useState, useEffect } from 'react';