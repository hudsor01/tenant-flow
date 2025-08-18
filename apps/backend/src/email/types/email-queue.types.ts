import type { AnyEmailData, EmailTemplateName } from './email-templates.types'

export interface EmailJob {
	to: string[]
	template: EmailTemplateName
	data: AnyEmailData
	priority: EmailPriority
	attempts?: number
	delay?: number
	repeat?: {
		cron?: string
		every?: number
	}
	metadata?: {
		userId?: string
		organizationId?: string
		campaignId?: string
		trackingId?: string
	}
}

export enum EmailPriority {
	CRITICAL = 1, // Welcome, invitations, password resets
	HIGH = 2, // Payment reminders, lease alerts
	NORMAL = 3, // Regular notifications
	MEDIUM = 4, // Property tips, notifications
	LOW = 5, // Bulk campaigns, newsletters
	BULK = 6 // Large volume campaigns
}

export interface EmailJobResult {
	jobId?: string
	success: boolean
	messageId?: string
	error?: string
	timestamp: Date
	processingTime: number
	recipientCount?: number
}

export interface EmailMetrics {
	sent: number
	failed: number
	retried: number
	avgProcessingTime: number
	queueDepth: number
	lastProcessed: Date
}

export interface QueueHealth {
	redis: {
		connected: boolean
		memory: number
		uptime: number
	}
	queues: {
		immediate: EmailMetrics
		scheduled: EmailMetrics
		bulk: EmailMetrics
		deadLetter: EmailMetrics
	}
	workers: {
		active: number
		waiting: number
		completed: number
		failed: number
	}
}
