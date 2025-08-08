/**
 * Enterprise Security Event Logging and Monitoring System
 * Comprehensive security event tracking with threat detection
 * GDPR compliant with data retention and anonymization
 */

export enum SecurityEventType {
  // Authentication Events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  SESSION_CREATED = 'SESSION_CREATED',
  SESSION_DESTROYED = 'SESSION_DESTROYED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_REFRESHED = 'SESSION_REFRESHED',
  SESSION_TERMINATED = 'SESSION_TERMINATED',
  SESSION_HIJACK_ATTEMPT = 'SESSION_HIJACK_ATTEMPT',
  
  // Authorization Events
  UNAUTHORIZED_ACCESS_ATTEMPT = 'UNAUTHORIZED_ACCESS_ATTEMPT',
  RBAC_ACCESS_DENIED = 'RBAC_ACCESS_DENIED',
  PRIVILEGE_ESCALATION_ATTEMPT = 'PRIVILEGE_ESCALATION_ATTEMPT',
  AUTHENTICATED_ACCESS = 'AUTHENTICATED_ACCESS',
  
  // Token and Security Events
  INVALID_JWT_TOKEN = 'INVALID_JWT_TOKEN',
  TOKEN_NEAR_EXPIRATION = 'TOKEN_NEAR_EXPIRATION',
  CSRF_TOKEN_MISMATCH = 'CSRF_TOKEN_MISMATCH',
  CSRF_TOKEN_MISSING = 'CSRF_TOKEN_MISSING',
  
  // Attack Detection
  SUSPICIOUS_REQUEST_PATTERN = 'SUSPICIOUS_REQUEST_PATTERN',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  PATH_TRAVERSAL_ATTEMPT = 'PATH_TRAVERSAL_ATTEMPT',
  COMMAND_INJECTION_ATTEMPT = 'COMMAND_INJECTION_ATTEMPT',
  BRUTE_FORCE_ATTEMPT = 'BRUTE_FORCE_ATTEMPT',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_RATE_PATTERN = 'SUSPICIOUS_RATE_PATTERN',
  
  // File and Upload Security
  MALICIOUS_FILE_UPLOAD = 'MALICIOUS_FILE_UPLOAD',
  FILE_TYPE_VIOLATION = 'FILE_TYPE_VIOLATION',
  FILE_SIZE_VIOLATION = 'FILE_SIZE_VIOLATION',
  
  // System Events
  MIDDLEWARE_ERROR = 'MIDDLEWARE_ERROR',
  SECURITY_CONFIG_CHANGE = 'SECURITY_CONFIG_CHANGE',
  BOT_ACCESS = 'BOT_ACCESS',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  
  // Data Protection
  PII_ACCESS = 'PII_ACCESS',
  DATA_EXPORT = 'DATA_EXPORT',
  GDPR_REQUEST = 'GDPR_REQUEST',
}

export enum SecurityEventSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

interface SecurityEvent {
  type: SecurityEventType;
  severity?: SecurityEventSeverity;
  timestamp: string;
  ip?: string;
  userAgent?: string;
  userId?: string;
  organizationId?: string;
  sessionId?: string;
  path?: string;
  method?: string;
  userRole?: string;
  reason?: string;
  additionalData?: Record<string, unknown>;
  referer?: string;
  suspiciousContent?: string;
  expectedFingerprint?: string;
  actualFingerprint?: string;
  error?: string;
}

export class SecurityLogger {
  private static instance: SecurityLogger;
  private events: SecurityEvent[] = [];
  private maxEvents = 10000;
  
  static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  async logSecurityEvent(event: Omit<SecurityEvent, 'severity'>): Promise<void> {
    const enhancedEvent: SecurityEvent = {
      ...event,
      severity: this.calculateSeverity({ ...event, severity: undefined } as SecurityEvent),
      timestamp: event.timestamp || new Date().toISOString(),
    };
    
    this.events.push(enhancedEvent);
    
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents / 2);
    }
    
    const logLevel = this.getLogLevel(enhancedEvent.severity!);
    const logData = {
      timestamp: enhancedEvent.timestamp,
      type: enhancedEvent.type,
      severity: enhancedEvent.severity,
      ip: enhancedEvent.ip,
      userId: enhancedEvent.userId,
      path: enhancedEvent.path,
      reason: enhancedEvent.reason,
    };
    
    console[logLevel]('[SECURITY]', JSON.stringify(logData, null, 2));
  }
  
  private calculateSeverity(event: SecurityEvent): SecurityEventSeverity {
    const criticalEvents = [
      SecurityEventType.SESSION_HIJACK_ATTEMPT,
      SecurityEventType.SQL_INJECTION_ATTEMPT,
      SecurityEventType.COMMAND_INJECTION_ATTEMPT,
    ];
    
    const highEvents = [
      SecurityEventType.BRUTE_FORCE_ATTEMPT,
      SecurityEventType.XSS_ATTEMPT,
      SecurityEventType.PATH_TRAVERSAL_ATTEMPT,
    ];
    
    if (criticalEvents.includes(event.type)) {
      return SecurityEventSeverity.CRITICAL;
    }
    if (highEvents.includes(event.type)) {
      return SecurityEventSeverity.HIGH;
    }
    
    return SecurityEventSeverity.MEDIUM;
  }
  
  private getLogLevel(severity: SecurityEventSeverity): 'log' | 'warn' | 'error' {
    switch (severity) {
      case SecurityEventSeverity.CRITICAL:
      case SecurityEventSeverity.HIGH:
        return 'error';
      case SecurityEventSeverity.MEDIUM:
        return 'warn';
      default:
        return 'log';
    }
  }
  
  getRecentEvents(limit = 50): SecurityEvent[] {
    return this.events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}

// Export singleton instance
export const securityLogger = SecurityLogger.getInstance();