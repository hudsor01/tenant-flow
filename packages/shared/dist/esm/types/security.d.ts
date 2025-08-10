/**
 * Security-related types shared between frontend and backend
 */
/**
 * Comprehensive security event types for monitoring
 */
export declare enum SecurityEventType {
    AUTH_ATTEMPT = "AUTH_ATTEMPT",
    AUTH_SUCCESS = "AUTH_SUCCESS",
    AUTH_FAILURE = "AUTH_FAILURE",
    AUTH_TOKEN_INVALID = "AUTH_TOKEN_INVALID",
    AUTH_RATE_LIMIT = "AUTH_RATE_LIMIT",
    PASSWORD_CHANGE = "PASSWORD_CHANGE",
    TOKEN_REFRESH = "TOKEN_REFRESH",
    SESSION_INVALIDATED = "SESSION_INVALIDATED",
    ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
    PERMISSION_DENIED = "PERMISSION_DENIED",
    FORBIDDEN_ACCESS = "FORBIDDEN_ACCESS",
    RLS_BYPASS_ATTEMPT = "RLS_BYPASS_ATTEMPT",
    UNAUTHORIZED_QUERY = "UNAUTHORIZED_QUERY",
    VALIDATION_FAILURE = "VALIDATION_FAILURE",
    INVALID_INPUT_DETECTED = "INVALID_INPUT_DETECTED",
    INJECTION_ATTEMPT = "INJECTION_ATTEMPT",
    SQL_INJECTION_ATTEMPT = "SQL_INJECTION_ATTEMPT",
    XSS_ATTEMPT = "XSS_ATTEMPT",
    CSRF_ATTEMPT = "CSRF_ATTEMPT",
    PATH_TRAVERSAL = "PATH_TRAVERSAL",
    FILE_UPLOAD_BLOCKED = "FILE_UPLOAD_BLOCKED",
    FILE_TYPE_VIOLATION = "FILE_TYPE_VIOLATION",
    FILE_SIZE_VIOLATION = "FILE_SIZE_VIOLATION",
    MALICIOUS_FILE_UPLOAD = "MALICIOUS_FILE_UPLOAD",
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
    SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY",
    SUSPICIOUS_REQUEST = "SUSPICIOUS_REQUEST",
    SUSPICIOUS_PATTERN = "SUSPICIOUS_PATTERN",
    ADMIN_ACTION = "ADMIN_ACTION",
    DATA_EXPORT = "DATA_EXPORT",
    CONFIGURATION_CHANGE = "CONFIGURATION_CHANGE",
    CONFIG_ACCESS = "CONFIG_ACCESS",
    PII_ACCESS = "PII_ACCESS",
    SYSTEM_ERROR = "SYSTEM_ERROR"
}
/**
 * Security event severity levels
 */
export declare enum SecurityEventSeverity {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    CRITICAL = "CRITICAL"
}
/**
 * Security event for logging and monitoring
 */
export interface SecurityEvent {
    type: SecurityEventType;
    severity: SecurityEventSeverity;
    userId?: string;
    details?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    timestamp?: Date;
}
/**
 * Security audit log entry
 */
export interface SecurityAuditLog {
    id?: string;
    eventType: SecurityEventType;
    severity: SecurityEventSeverity;
    userId?: string;
    details: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    timestamp?: Date;
    email?: string;
    resource?: string;
    action?: string;
}
/**
 * Security metrics for monitoring
 */
export interface SecurityMetrics {
    totalEvents: number;
    eventsByType: Record<SecurityEventType, number>;
    eventsBySeverity: Record<SecurityEventSeverity, number>;
    criticalEvents: number;
    recentEvents: SecurityEvent[];
    suspiciousIPs?: string[];
    failedAuthAttempts?: number;
    blockedRequests?: number;
    timeRange?: {
        start: Date;
        end: Date;
    };
}
/**
 * Security validation result
 */
export interface SecurityValidationResult<T = unknown> {
    isValid: boolean;
    data?: T;
    errors?: string[];
    sanitizedInput?: unknown;
}
/**
 * Compliance monitoring status and metrics
 */
export interface ComplianceStatus {
    overallScore: number;
    fairHousingStatus?: {
        riskLevel?: SecurityEventSeverity;
        score?: number;
        violations?: number;
    };
    dataRetentionStatus?: {
        overdueRecords?: number;
        score?: number;
        riskLevel?: SecurityEventSeverity;
    };
    securityStatus?: {
        criticalEvents?: number;
        score?: number;
        riskLevel?: SecurityEventSeverity;
    };
    recentAlerts?: SecurityEvent[];
    recommendations?: string[];
}
//# sourceMappingURL=security.d.ts.map