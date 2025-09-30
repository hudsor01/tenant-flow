/**
 * Security-related types shared between frontend and backend
 */

// User roles are consolidated in auth.ts - import from there
// This ensures single source of truth and prevents duplication
export { USER_ROLE } from '../constants/auth.js'
export type { Permission, UserRole } from '../types/auth.js'

/**
 * Comprehensive security event types for monitoring
 */
export enum SecurityEventType {
	// Authentication events
	AUTH_ATTEMPT = 'AUTH_ATTEMPT',
	AUTH_SUCCESS = 'AUTH_SUCCESS',
	AUTH_FAILURE = 'AUTH_FAILURE',
	AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
	AUTH_RATE_LIMIT = 'AUTH_RATE_LIMIT',
	PASSWORD_CHANGE = 'PASSWORD_CHANGE',
	TOKEN_REFRESH = 'TOKEN_REFRESH',
	SESSION_INVALIDATED = 'SESSION_INVALIDATED',
	ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',

	// Authorization events
	PERMISSION_DENIED = 'PERMISSION_DENIED',
	FORBIDDEN_ACCESS = 'FORBIDDEN_ACCESS',
	RLS_BYPASS_ATTEMPT = 'RLS_BYPASS_ATTEMPT',
	UNAUTHORIZED_QUERY = 'UNAUTHORIZED_QUERY',

	// Input validation & security threats
	VALIDATION_FAILURE = 'VALIDATION_FAILURE',
	INVALID_INPUT_DETECTED = 'INVALID_INPUT_DETECTED',
	INJECTION_ATTEMPT = 'INJECTION_ATTEMPT',
	SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
	XSS_ATTEMPT = 'XSS_ATTEMPT',
	CSRF_ATTEMPT = 'CSRF_ATTEMPT',
	PATH_TRAVERSAL = 'PATH_TRAVERSAL',
	FILE_UPLOAD_BLOCKED = 'FILE_UPLOAD_BLOCKED',
	FILE_TYPE_VIOLATION = 'FILE_TYPE_VIOLATION',
	FILE_SIZE_VIOLATION = 'FILE_SIZE_VIOLATION',
	MALICIOUS_FILE_UPLOAD = 'MALICIOUS_FILE_UPLOAD',

	// Rate limiting & suspicious activity
	RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
	SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
	SUSPICIOUS_REQUEST = 'SUSPICIOUS_REQUEST',
	SUSPICIOUS_PATTERN = 'SUSPICIOUS_PATTERN',

	// Administrative & system events
	ADMIN_ACTION = 'ADMIN_ACTION',
	DATA_EXPORT = 'DATA_EXPORT',
	CONFIGURATION_CHANGE = 'CONFIGURATION_CHANGE',
	CONFIG_ACCESS = 'CONFIG_ACCESS',
	PII_ACCESS = 'PII_ACCESS',
	SYSTEM_ERROR = 'SYSTEM_ERROR',

	// Additional security event types for comprehensive monitoring
	SESSION_HIJACK_ATTEMPT = 'SESSION_HIJACK_ATTEMPT',
	COMMAND_INJECTION_ATTEMPT = 'COMMAND_INJECTION_ATTEMPT',
	BRUTE_FORCE_ATTEMPT = 'BRUTE_FORCE_ATTEMPT',
	PATH_TRAVERSAL_ATTEMPT = 'PATH_TRAVERSAL_ATTEMPT',
	SECURITY_CONFIG_CHANGE = 'SECURITY_CONFIG_CHANGE'
}

/**
 * Security event severity levels
 */
export enum SecurityEventSeverity {
	LOW = 'LOW',
	MEDIUM = 'MEDIUM',
	HIGH = 'HIGH',
	CRITICAL = 'CRITICAL'
}

/**
 * Security event for logging and monitoring
 */
export interface SecurityEvent {
	type: SecurityEventType
	severity: SecurityEventSeverity
	userId?: string
	details?: string
	metadata?: SecurityEventMetadata
	ipAddress?: string
	userAgent?: string
	timestamp?: Date
}

/**
 * Security audit log entry
 */
export interface SecurityAuditLog {
	id?: string
	eventType: SecurityEventType
	severity: SecurityEventSeverity
	userId?: string
	details: string
	metadata?: SecurityEventMetadata
	ipAddress?: string
	userAgent?: string
	timestamp?: Date
	email?: string
	resource?: string
	action?: string
}

/**
 * Security metrics for monitoring
 */
export interface SecurityTrendPoint {
	date: string
	totalEvents: number
	criticalEvents: number
}

export interface SecurityThreatSummary {
	ip: string
	count: number
}

export interface SecurityMetrics {
	totalEvents: number
	eventsByType: Record<SecurityEventType, number>
	eventsBySeverity: Record<SecurityEventSeverity, number>
	criticalEvents: number
	recentEvents: SecurityEvent[]
	recentTrends?: SecurityTrendPoint[]
	topThreateningIPs?: SecurityThreatSummary[]
	suspiciousIPs?: string[]
	failedAuthAttempts?: number
	blockedRequests?: number
	timeRange?: {
		start: Date
		end: Date
	}
}

/**
 * Security validation result with constrained data types
 */
export type SecureDataType =
	| string
	| number
	| boolean
	| null
	| Array<string | number | boolean | null>
	| Record<string, string | number | boolean | null>

export interface SecurityValidationResult<
	T extends SecureDataType = SecureDataType
> {
	isValid: boolean
	data?: T
	errors?: string[]
	sanitizedInput?: T
	violationDetails?: {
		riskLevel: SecurityEventSeverity
		detectedPatterns: string[]
		sanitizationApplied: boolean
	}
}

/**
 * Compliance monitoring status and metrics
 */
export interface ComplianceStatus {
	overallScore: number
	fairHousingStatus?: {
		riskLevel?: SecurityEventSeverity
		score?: number
		violations?: number
	}
	dataRetentionStatus?: {
		overdueRecords?: number
		score?: number
		riskLevel?: SecurityEventSeverity
	}
	securityStatus?: {
		criticalEvents?: number
		score?: number
		riskLevel?: SecurityEventSeverity
	}
	recentAlerts?: SecurityEvent[]
	recommendations?: string[]
}

/**
 * Security header configuration for CSP and other security policies
 */
export interface SecurityHeaderConfig {
	contentSecurityPolicy: CSPDirectives
	permissionsPolicy: PermissionsPolicyDirectives
	strictTransportSecurity: HSTSConfig
	crossOriginPolicies: CrossOriginConfig
}

/**
 * Content Security Policy directives with type safety
 */
export interface CSPDirectives {
	'default-src': string[]
	'script-src': string[]
	'style-src': string[]
	'img-src': string[]
	'font-src': string[]
	'connect-src': string[]
	'frame-src': string[]
	'worker-src'?: string[]
	'object-src': string[]
	'base-uri': string[]
	'form-action': string[]
	'frame-ancestors': string[]
	'upgrade-insecure-requests'?: boolean
	'block-all-mixed-content'?: boolean
}

/**
 * Permissions Policy configuration
 */
export interface PermissionsPolicyDirectives {
	camera: string
	microphone: string
	geolocation: string
	gyroscope: string
	magnetometer: string
	payment: string
	usb: string
	'interest-cohort': string
	'browsing-topics': string
	'attribution-reporting': string
	'trust-token-redemption': string
	fullscreen: string
	'picture-in-picture': string
	accelerometer: string
	'ambient-light-sensor': string
	autoplay: string
	'clipboard-read': string
	'clipboard-write': string
	'display-capture': string
	'document-domain': string
	'encrypted-media': string
	'execution-while-not-rendered': string
	'execution-while-out-of-viewport': string
	gamepad: string
	hid: string
	'idle-detection': string
	'local-fonts': string
	midi: string
	'navigation-override': string
	'otp-credentials': string
	'publickey-credentials-create': string
	'publickey-credentials-get': string
	'screen-wake-lock': string
	serial: string
	'speaker-selection': string
	'storage-access': string
	'web-share': string
	'window-management': string
	'xr-spatial-tracking': string
}

/**
 * HTTP Strict Transport Security configuration
 */
export interface HSTSConfig {
	maxAge: number
	includeSubDomains: boolean
	preload: boolean
}

/**
 * Cross-origin policy configuration
 */
export interface CrossOriginConfig {
	embedderPolicy: 'unsafe-none' | 'require-corp'
	openerPolicy: 'unsafe-none' | 'same-origin-allow-popups' | 'same-origin'
	resourcePolicy: 'same-site' | 'same-origin' | 'cross-origin'
}

/**
 * CSP nonce management types
 */
export interface CSPNonceData {
	nonce: string
	expires: number
	sessionId?: string
}

/**
 * CSP violation report structure
 */
export interface CSPViolationReport {
	blockedURI?: string
	documentURI?: string
	effectiveDirective?: string
	originalPolicy?: string
	referrer?: string
	violatedDirective?: string
	sourceFile?: string
	lineNumber?: number
	columnNumber?: number
	sample?: string
	timestamp: string
}

/**
 * Security data classification types
 */
export type DataClassificationType =
	| 'PII' // Personally identifiable information
	| 'PHI' // Protected health information
	| 'FINANCIAL' // Financial/payment data
	| 'CREDENTIALS' // Authentication credentials
	| 'LEGAL' // Legal documents/contracts
	| 'OPERATIONAL' // Business operational data
	| 'PUBLIC' // Public information

/**
 * Type-safe user metadata for authentication
 */
export interface SecureAppMetadata {
	provider?: string
	providers?: string[]
	role?: string
	organizationId?: string
	permissions?: string[]
}

/**
 * Type-safe user metadata for profiles
 */
export interface SecureUserMetadata {
	name?: string
	full_name?: string
	avatar_url?: string
	phone?: string
	company_name?: string
	job_title?: string
	last_login?: string
	email_verified?: boolean
	phone_verified?: boolean
}

/**
 * Security event metadata with typed fields
 */
export interface SecurityEventMetadata {
	// Network security
	ipAddress?: string
	userAgent?: string
	requestId?: string

	// Authentication context
	sessionId?: string
	refreshTokenId?: string
	mfaUsed?: boolean
	loginMethod?: 'password' | 'oauth' | 'magic_link' | 'otp'

	// Device context
	deviceFingerprint?: string
	deviceType?: 'desktop' | 'mobile' | 'tablet' | 'unknown'
	platform?: string
	browser?: string

	// File security
	fileName?: string
	fileSize?: number
	fileType?: string
	filePath?: string
	fileHash?: string
	scanResult?: 'clean' | 'infected' | 'suspicious' | 'error'

	// Application context
	feature?: string
	action?: string
	resource?: string
	previousState?: string
	newState?: string

	// Error context
	errorCode?: string
	errorMessage?: string
	stackTrace?: string

	// Compliance context
	gdprBasis?:
		| 'consent'
		| 'contract'
		| 'legal_obligation'
		| 'vital_interests'
		| 'public_task'
		| 'legitimate_interests'
	retentionPeriod?: number
	anonymizationRequired?: boolean

	// Application-specific context
	context?: string
	quarantineReason?: string
	configChangeType?: string
	previousConfig?: unknown
	updates?: unknown
}
