import type { BaseJobData } from '../base/base.processor'

// Re-export BaseJobData for use in tests and other modules
export type { BaseJobData }

/**
 * Email Job Data Interface
 * Strongly typed following official Bull patterns
 */
export interface EmailJobData extends BaseJobData {
	to: string[]
	template: string
	data: Record<string, unknown>
	priority?: 'low' | 'normal' | 'high' | 'critical'
	scheduledAt?: Date
	batchId?: string
}

/**
 * Payment Job Data Interface
 * For Stripe payment processing
 */
export interface PaymentJobData extends BaseJobData {
	type: 'charge' | 'refund' | 'subscription' | 'invoice'
	paymentId: string
	amount?: number
	currency?: string
	customerId: string
	idempotencyKey?: string
	retryAttempt?: number
	refundReason?: string
}

/**
 * Maintenance Job Data Interface
 * For future maintenance request processing
 */
export interface MaintenanceJobData extends BaseJobData {
	requestId: string
	maintenanceId?: string
	action: 'created' | 'updated' | 'assigned' | 'completed'
	propertyId?: string
	unitId?: string
	priority?: 'low' | 'medium' | 'high' | 'emergency'
	assignedTo?: string
	propertyManagerEmail?: string
	propertyAddress?: string
	tenantName?: string
	tenantId?: string
	tenantEmail?: string
	description?: string
	status?: string
}

/**
 * Notification Job Data Interface
 * For future notification system
 */
export interface NotificationJobData extends BaseJobData {
	type: 'email' | 'sms' | 'push' | 'in-app'
	recipient: string
	subject: string
	content: string
	templateId?: string
	channels?: string[]
	suppressDuplicates?: boolean
}

/**
 * Report Job Data Interface
 * For future report generation
 */
export interface ReportJobData extends BaseJobData {
	reportType: 'financial' | 'maintenance' | 'occupancy' | 'tenant'
	startDate: string
	endDate: string
	format: 'pdf' | 'excel' | 'csv'
	email?: string
	includeCharts?: boolean
	filterCriteria?: Record<string, unknown>
}

/**
 * Webhook Job Data Interface
 * For future webhook retry system
 */
export interface WebhookJobData extends BaseJobData {
	id?: string
	url: string
	payload: Record<string, unknown>
	headers: Record<string, string>
	attemptNumber: number
	maxAttempts: number
	webhookId?: string
	eventType?: string
}

/**
 * Job Options following Bull best practices
 */
export interface StandardJobOptions {
	priority?: number
	delay?: number
	attempts?: number
	backoff?: {
		type: 'fixed' | 'exponential'
		delay: number
	}
	lifo?: boolean
	timeout?: number
	removeOnComplete?: boolean | number
	removeOnFail?: boolean | number
	repeat?: {
		cron?: string
		every?: number
		limit?: number
	}
}

/**
 * Job Status enum following Bull standards
 */
export enum JobStatus {
	WAITING = 'waiting',
	ACTIVE = 'active',
	COMPLETED = 'completed',
	FAILED = 'failed',
	DELAYED = 'delayed',
	PAUSED = 'paused'
}

/**
 * Queue Statistics Interface
 */
export interface QueueStats {
	waiting: number
	active: number
	completed: number
	failed: number
	delayed: number
	paused: number
}

/**
 * Job Progress Interface
 */
export interface JobProgress {
	percentage: number
	message?: string
	data?: Record<string, unknown>
	timestamp: Date
}
