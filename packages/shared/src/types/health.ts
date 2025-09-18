/**
 * Health Check Types
 * Centralized health monitoring interfaces
 */

export interface ServiceHealth {
	healthy: boolean
	responseTime?: number
	lastCheck?: string
	details?: unknown
}

export interface SystemHealth {
	status: 'healthy' | 'degraded' | 'unhealthy'
	timestamp: string
	services: Record<string, ServiceHealth>
	performance: {
		uptime: number
		memory: {
			used: number
			free: number
			total: number
			usagePercent: number
		}
		cpu: {
			user: number
			system: number
		}
	}
	cache: unknown
	version: string
	deployment: {
		environment: string
		region: string
		instance: string
	}
	checks?: {
		db: 'healthy' | 'unhealthy'
		message?: string
		hint?: string
	}
	duration?: number
	reason?: string
}

export interface HealthCheckResult {
	ok: boolean
	message?: string
}

// Security monitoring types
export interface SecurityEvent {
	id: string
	type: SecurityEventType
	severity: 'low' | 'medium' | 'high' | 'critical'
	timestamp: string
	source: string
	description: string
	userAgent?: string
	ipAddress?: string
	userId?: string
	metadata: Record<string, unknown>
	blocked?: boolean
	resolved?: boolean
	ruleName?: string
}

export type SecurityEventType =
	| 'sql_injection_attempt'
	| 'xss_attempt'
	| 'path_traversal_attempt'
	| 'command_injection_attempt'
	| 'rate_limit_exceeded'
	| 'suspicious_input'
	| 'malformed_request'
	| 'malicious_request'
	| 'unauthorized_access'
	| 'brute_force_attempt'
	| 'csrf_token_missing'
	| 'csrf_token_invalid'
	| 'file_upload_threat'
	| 'injection_pattern_detected'
	| 'sanitization_triggered'
	| 'validation_failed'
	| 'auth_failure'
	| 'suspicious_activity'
	| 'account_takeover'

export interface SecurityMetrics {
	totalEvents: number
	eventsBySeverity: Record<'low' | 'medium' | 'high' | 'critical', number>
	eventsByType: Record<SecurityEventType, number>
	topThreateningIPs: Array<{ ip: string; count: number }>
	recentTrends: {
		lastHour: number
		last24Hours: number
		last7Days: number
	}
}
