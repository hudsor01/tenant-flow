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
			total: number
			percentage: number
		}
		cpu: {
			percentage: number
		}
	}
	version: string
	environment: string
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
	timestamp: Date
	source: string
	userAgent?: string
	ip?: string
	details: Record<string, unknown>
	blocked: boolean
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
	| 'unauthorized_access'
	| 'brute_force_attempt'
	| 'csrf_token_missing'
	| 'csrf_token_invalid'
	| 'file_upload_threat'
	| 'injection_pattern_detected'
	| 'sanitization_triggered'
	| 'validation_failed'

export interface SecurityMetrics {
	totalEvents: number
	blockedEvents: number
	criticalEvents: number
	eventsLast24h: number
	topEventTypes: Array<{ type: SecurityEventType; count: number }>
}
