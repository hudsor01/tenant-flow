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

export interface HealthCheckResponse {
	status: 'ok' | 'unhealthy'
	timestamp: string
	environment: string
	uptime: number
	memory: number
	version: string
	service: string
	config_loaded: {
		node_env: boolean
		cors_origins: boolean
		supabase_url: boolean
	}
	database: {
		status: string
		message: string
	}
	error?: string
}

// Security monitoring types
export type { SecurityEvent } from './security.js'

// Performance monitoring types
export interface PerformanceMetrics {
	endpoint: string
	method: string
	duration: number
	timestamp: string
	status: 'success' | 'error' | 'timeout'
	user_id?: string
	userAgent?: string
}
