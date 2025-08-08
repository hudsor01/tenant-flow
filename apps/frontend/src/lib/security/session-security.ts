import type { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions as SupabaseCookieOptions } from '@supabase/ssr';
import { validateJWT, isTokenNearExpiration } from '@/lib/security/jwt-validator';
import { securityLogger, SecurityEventType } from '@/lib/security/security-logger';
import type { SessionData } from '@repo/shared';

// Supabase session type
interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: {
    id: string;
    email?: string;
    role?: string;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  };
}


// Session configuration with security defaults
const SESSION_CONFIG = {
  maxAge: 24 * 60 * 60, // 24 hours in seconds
  refreshThreshold: 30, // 30 minutes before expiry
  cookieName: '__tenant_flow_session',
  refreshCookieName: '__tenant_flow_refresh',
  httpOnly: true,
  secureCookies: process.env.NODE_ENV === 'production',
  sameSitePolicy: 'lax' as const,
  domain: process.env.SESSION_DOMAIN || undefined,
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
  maxSessionsPerUser: 5,
};

// Using shared SessionData type from @repo/shared

// Session validation result
interface SessionValidationResult {
  valid: boolean;
  session?: SessionData;
  needsRefresh: boolean;
  reason?: string;
}

// In-memory session store (in production, use Redis or database)
const activeSessions = new Map<string, SessionData>();

/**
 * Generate device fingerprint for additional security
 */
function generateDeviceFingerprint(request: NextRequest): string {
  const userAgent = request.headers.get('user-agent') || '';
  const acceptLanguage = request.headers.get('accept-language') || '';
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  
  // Create a simple fingerprint (in production, use a proper library)
  return Buffer.from(`${userAgent}-${acceptLanguage}-${acceptEncoding}`).toString('base64');
}

/**
 * Create secure session with enhanced security features
 */
export async function createSession(
  request: NextRequest,
  response: NextResponse,
  sessionData: {
    userId: string;
    organizationId?: string;
    email: string;
  }
): Promise<string> {
  const sessionId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  
  const session: SessionData = {
    sessionId,
    userId: sessionData.userId,
    organizationId: sessionData.organizationId,
    email: sessionData.email,
    issuedAt: now,
    expiresAt: now + SESSION_CONFIG.maxAge,
    deviceFingerprint: generateDeviceFingerprint(request),
    userAgent: request.headers.get('user-agent') || undefined,
    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    lastActivity: now,
  };
  
  // Store session
  activeSessions.set(sessionId, session);
  
  // Set secure HTTP-only cookie
  const cookieOptions = {
    httpOnly: SESSION_CONFIG.httpOnly,
    secure: SESSION_CONFIG.secureCookies,
    sameSite: SESSION_CONFIG.sameSitePolicy,
    maxAge: SESSION_CONFIG.maxAge,
    path: '/',
    ...(SESSION_CONFIG.domain && { domain: SESSION_CONFIG.domain }),
  };
  
  // Store session ID in secure cookie
  response.cookies.set(
    SESSION_CONFIG.cookieName,
    sessionId,
    cookieOptions
  );
  
  await securityLogger.logSecurityEvent({
    type: SecurityEventType.SESSION_CREATED,
    sessionId,
    userId: sessionData.userId,
    organizationId: sessionData.organizationId,
    timestamp: new Date().toISOString()
  });
  
  return sessionId;
}

/**
 * Validate and refresh session if needed
 */
export async function validateSession(
  request: NextRequest
): Promise<SessionValidationResult> {
  const sessionId = request.cookies.get(SESSION_CONFIG.cookieName)?.value;
  
  if (!sessionId) {
    return { valid: false, needsRefresh: false, reason: 'No session cookie' };
  }
  
  const session = activeSessions.get(sessionId);
  if (!session) {
    return { valid: false, needsRefresh: false, reason: 'Session not found' };
  }
  
  const now = Math.floor(Date.now() / 1000);
  
  // Check if session is expired
  if (session.expiresAt <= now) {
    activeSessions.delete(sessionId);
    await securityLogger.logSecurityEvent({
      type: SecurityEventType.SESSION_EXPIRED,
      sessionId,
      userId: session.userId,
      timestamp: new Date().toISOString()
    });
    return { valid: false, needsRefresh: true, reason: 'Session expired' };
  }
  
  // Validate device fingerprint if available
  if (session.deviceFingerprint) {
    const currentFingerprint = generateDeviceFingerprint(request);
    if (session.deviceFingerprint !== currentFingerprint) {
      await securityLogger.logSecurityEvent({
        type: SecurityEventType.SESSION_HIJACK_ATTEMPT,
        sessionId,
        userId: session.userId,
        expectedFingerprint: session.deviceFingerprint,
        actualFingerprint: currentFingerprint,
        timestamp: new Date().toISOString()
      });
      
      // Invalidate session on fingerprint mismatch
      activeSessions.delete(sessionId);
      return { valid: false, needsRefresh: false, reason: 'Device fingerprint mismatch' };
    }
  }
  
  // Check if session needs refresh
  const timeToExpiry = session.expiresAt - now;
  const needsRefresh = timeToExpiry <= (SESSION_CONFIG.refreshThreshold * 60);
  
  return {
    valid: true,
    session,
    needsRefresh,
  };
}

/**
 * Refresh session with new expiration time
 */
export async function refreshSession(
  request: NextRequest,
  response: NextResponse
): Promise<{ success: boolean; session?: SessionData }> {
  const sessionValidation = await validateSession(request);
  
  if (!sessionValidation.valid || !sessionValidation.session) {
    return { success: false };
  }
  
  const session = sessionValidation.session;
  const now = Math.floor(Date.now() / 1000);
  
  // Update session expiration
  session.expiresAt = now + SESSION_CONFIG.maxAge;
  session.issuedAt = now;
  
  // Update in store
  activeSessions.set(session.sessionId, session);
  
  // Update cookie
  response.cookies.set(
    SESSION_CONFIG.cookieName,
    session.sessionId,
    {
      httpOnly: SESSION_CONFIG.httpOnly,
      secure: SESSION_CONFIG.secureCookies,
      sameSite: SESSION_CONFIG.sameSitePolicy,
      maxAge: SESSION_CONFIG.maxAge,
      path: '/',
      ...(SESSION_CONFIG.domain && { domain: SESSION_CONFIG.domain }),
    }
  );
  
  await securityLogger.logSecurityEvent({
    type: SecurityEventType.SESSION_REFRESHED,
    sessionId: session.sessionId,
    userId: session.userId,
    timestamp: new Date().toISOString()
  });
  
  return { success: true, session };
}

/**
 * Securely destroy session
 */
export async function destroySession(
  request: NextRequest,
  response: NextResponse,
  reason = 'User logout'
): Promise<void> {
  const sessionId = request.cookies.get(SESSION_CONFIG.cookieName)?.value;
  
  if (sessionId) {
    const session = activeSessions.get(sessionId);
    activeSessions.delete(sessionId);
    
    await securityLogger.logSecurityEvent({
      type: SecurityEventType.SESSION_DESTROYED,
      sessionId,
      userId: session?.userId,
      reason,
      timestamp: new Date().toISOString()
    });
  }
  
  // Clear session cookies
  response.cookies.delete(SESSION_CONFIG.cookieName);
  response.cookies.delete(SESSION_CONFIG.refreshCookieName);
  
  // Set expired cookies to ensure cleanup
  response.cookies.set(SESSION_CONFIG.cookieName, '', {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    secure: SESSION_CONFIG.secureCookies,
    sameSite: SESSION_CONFIG.sameSitePolicy,
  });
}

/**
 * Get all active sessions for a user (for security dashboard)
 */
export function getUserActiveSessions(userId: string): SessionData[] {
  return Array.from(activeSessions.values())
    .filter(session => session.userId === userId)
    .sort((a, b) => b.issuedAt - a.issuedAt);
}

/**
 * Terminate all sessions for a user (e.g., on password change)
 */
export async function terminateAllUserSessions(
  userId: string,
  reason = 'Security measure'
): Promise<void> {
  const userSessions = getUserActiveSessions(userId);
  
  for (const session of userSessions) {
    activeSessions.delete(session.sessionId);
    
    await securityLogger.logSecurityEvent({
      type: SecurityEventType.SESSION_TERMINATED,
      sessionId: session.sessionId,
      userId,
      reason,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Clean up expired sessions (run periodically)
 */
export function cleanupExpiredSessions(): void {
  const now = Math.floor(Date.now() / 1000);
  let cleanedCount = 0;
  
  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.expiresAt <= now) {
      activeSessions.delete(sessionId);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`Cleaned up ${cleanedCount} expired sessions`);
  }
}

/**
 * Enhanced Supabase session management with security features
 */
export async function createSecureSupabaseSession(
  request: NextRequest,
  response: NextResponse
): Promise<{ session: SupabaseSession | null; error?: string }> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: SupabaseCookieOptions) {
            const secureOptions = {
              ...options,
              httpOnly: name.includes('session') || name.includes('refresh'),
              secure: SESSION_CONFIG.secureCookies,
              sameSite: SESSION_CONFIG.sameSitePolicy,
              path: '/',
            };
            response.cookies.set(name, value, secureOptions);
          },
          remove(name: string, options: SupabaseCookieOptions) {
            response.cookies.set(name, '', { ...options, maxAge: 0 });
          },
        },
      }
    );

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      return { session: null, error: error.message };
    }

    if (session?.access_token) {
      // Validate JWT token
      const jwtValidation = await validateJWT(session.access_token);
      if (!jwtValidation.valid) {
        await supabase.auth.signOut();
        return { session: null, error: `Invalid JWT: ${jwtValidation.reason}` };
      }

      // Check if token needs refresh
      if (isTokenNearExpiration(session.access_token)) {
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            await supabase.auth.signOut();
            return { session: null, error: 'Session refresh failed' };
          }
          return { session: refreshData.session };
        } catch {
          await supabase.auth.signOut();
          return { session: null, error: 'Session refresh error' };
        }
      }
    }

    return { session };
  } catch (error) {
    return {
      session: null,
      error: `Session creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Session statistics for monitoring
 */
export function getSessionStats(): {
  totalSessions: number;
  activeSessions: number;
  expiringSoon: number;
  averageSessionDuration: number;
} {
  const now = Math.floor(Date.now() / 1000);
  const sessions = Array.from(activeSessions.values());
  
  const activeSessionsCount = sessions.filter(s => s.expiresAt > now).length;
  const expiringSoon = sessions.filter(s => 
    s.expiresAt > now && 
    (s.expiresAt - now) <= (SESSION_CONFIG.refreshThreshold * 60)
  );
  
  const totalDuration = sessions.reduce(
    (sum, session) => sum + (now - session.issuedAt), 
    0
  );
  const averageSessionDuration = sessions.length > 0 ? 
    totalDuration / sessions.length : 0;
  
  return {
    totalSessions: sessions.length,
    activeSessions: activeSessionsCount,
    expiringSoon: expiringSoon.length,
    averageSessionDuration,
  };
}

/**
 * Initialize session cleanup job
 */
export function initializeSessionCleanup(): void {
  // Clean up expired sessions every 5 minutes
  setInterval(cleanupExpiredSessions, 5 * 60 * 1000);
  
  console.log('Session cleanup job initialized');
}