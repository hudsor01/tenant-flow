import { Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import type { Queue } from 'bullmq'
import type { Database } from '@repo/shared/types/supabase'
import { asStripeSchemaClient } from '../../../types/stripe-schema'
import { SupabaseService } from '../../../database/supabase.service'
import { AppLogger } from '../../../logger/app-logger.service'

type AdminUserListItem = Pick<
	Database['public']['Tables']['users']['Row'],
	| 'id'
	| 'email'
	| 'full_name'
	| 'user_type'
	| 'status'
	| 'created_at'
	| 'onboarding_status'
>

export type AdminUserListResponse = {
	users: AdminUserListItem[]
	total: number
	page: number
	limit: number
	totalPages: number
}

/**
 * Admin Service
 * Handles admin-specific business logic and data aggregation
 */
@Injectable()
export class AdminService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger,
		@InjectQueue('emails') private readonly emailQueue: Queue,
		@InjectQueue('stripe-webhooks') private readonly webhookQueue: Queue
	) {}

	/**
	 * Get application metrics
	 */
	async getMetrics() {
		const client = this.supabase.getAdminClient()
		const stripeClient = asStripeSchemaClient(client)

		// Get counts from database
		const [
			{ count: totalUsers },
			{ count: totalProperties },
			{ count: activeLeases },
			{ count: activeSubscriptions }
		] = await Promise.all([
			client.from('users').select('id', { count: 'exact', head: true }),
			client.from('properties').select('id', { count: 'exact', head: true }),
			client
				.from('leases')
				.select('id', { count: 'exact', head: true })
				.eq('status', 'active'),
			stripeClient
				.schema('stripe')
				.from('subscriptions')
				.select('*', { count: 'exact', head: true })
				.eq('status', 'active')
		])

		// Get queue metrics
		const [emailQueueCounts, webhookQueueCounts] = await Promise.all([
			this.emailQueue.getJobCounts(),
			this.webhookQueue.getJobCounts()
		])

		return {
			users: totalUsers || 0,
			properties: totalProperties || 0,
			leases: activeLeases || 0,
			subscriptions: activeSubscriptions || 0,
			queues: {
				emails: emailQueueCounts,
				webhooks: webhookQueueCounts
			}
		}
	}

	/**
	 * List users with pagination and filtering
	 */
	async listUsers(filters: {
		page: number
		limit: number
		role?: string
		search?: string
	}): Promise<AdminUserListResponse> {
		const client = this.supabase.getAdminClient()
		const offset = (filters.page - 1) * filters.limit

		let query = client
			.from('users')
			.select(
				'id, email, full_name, user_type, status, created_at, onboarding_status',
				{ count: 'exact' }
			)
			.order('created_at', { ascending: false })
			.range(offset, offset + filters.limit - 1)

		// Filter by role if provided
		if (filters.role) {
			query = query.eq('user_type', filters.role)
		}

		// Search by email/name if provided
		if (filters.search) {
			// Sanitize search input: remove SQL special chars, wildcards, and control characters
			const sanitized = filters.search
				.trim()
				.replace(/[%_*();'"\\]/g, '') // Remove SQL wildcards and injection chars
				.split('')
				.filter(char => {
					const code = char.charCodeAt(0)
					// Keep only printable ASCII except control chars, DEL, and comma
					return code >= 32 && code !== 44 && code !== 127
				})
				.join('')
				.substring(0, 100) // Limit length

			if (sanitized) {
				query = query.or(
					`email.ilike.%${sanitized}%,full_name.ilike.%${sanitized}%`
				)
			}
		}

		const { data, error, count } = await query

		if (error) {
			this.logger.error('Failed to list users', { error })
			throw error
		}

		return {
			users: (data || []) as AdminUserListItem[],
			total: count ?? 0,
			page: filters.page,
			limit: filters.limit,
			totalPages: Math.ceil((count ?? 0) / filters.limit)
		}
	}

	/**
	 * Get detailed user information
	 */
	async getUserDetails(userId: string) {
		const client = this.supabase.getAdminClient()

		// Get user basic info
		const { data: user, error } = await client
			.from('users')
			.select('id, email, full_name, first_name, last_name, phone, avatar_url, status, user_type, onboarding_status, onboarding_completed_at, identity_verification_status, identity_verified_at, created_at, updated_at')
			.eq('id', userId)
			.single()

		if (error) {
			this.logger.error('Failed to get user details', { error, userId })
			throw error
		}

		// Get user's properties count
		const { count: propertiesCount } = await client
			.from('properties')
			.select('id', { count: 'exact', head: true })
			.eq('owner_id', userId)

		// Get user's leases count
		const { count: leasesCount } = await client
			.from('lease_tenants')
			.select('id', { count: 'exact', head: true })
			.eq('tenant_id', userId)

		return {
			...user,
			propertiesCount: propertiesCount || 0,
			leasesCount: leasesCount || 0
		}
	}

	/**
	 * Update user role or status
	 */
	async updateUser(
		userId: string,
		updates: {
			role?: string | undefined
			status?: string | undefined
		}
	) {
		const client = this.supabase.getAdminClient()

		const updateData: Database['public']['Tables']['users']['Update'] = {}

		if (updates.role) {
			updateData.user_type = updates.role
		}

		if (updates.status) {
			updateData.status = updates.status
		}

		const { data, error } = await client
			.from('users')
			.update(updateData)
			.eq('id', userId)
			.select()
			.single()

		if (error) {
			this.logger.error('Failed to update user', { error, userId, updates })
			throw error
		}

		this.logger.log('User updated successfully', { userId, updates })
		return data
	}

	/**
	 * Get application logs from security_events table
	 */
	async getLogs(filters: {
		level?: 'debug' | 'info' | 'warning' | 'error' | 'critical'
		limit: number
		offset: number
	}) {
		const client = this.supabase.getAdminClient()

		let query = client
			.from('security_events')
			.select('id, event_type, severity, message, user_id, user_email, user_type, ip_address, user_agent, resource_type, resource_id, request_id, metadata, tags, created_at', { count: 'exact' })
			.order('created_at', { ascending: false })
			.range(filters.offset, filters.offset + filters.limit - 1)

		// Filter by severity level if provided
		if (filters.level) {
			query = query.eq('severity', filters.level)
		}

		const { data, error, count } = await query

		if (error) {
			this.logger.error('Failed to get security logs', { error })
			throw error
		}

		return {
			logs: data || [],
			total: count || 0,
			filters
		}
	}

	/**
	 * Get user activity log from security_events
	 */
	async getUserActivity(userId: string, limit: number) {
		const client = this.supabase.getAdminClient()

		const { data, error, count } = await client
			.from('security_events')
			.select('id, event_type, severity, message, user_id, user_email, user_type, ip_address, user_agent, resource_type, resource_id, request_id, metadata, tags, created_at', { count: 'exact' })
			.eq('user_id', userId)
			.order('created_at', { ascending: false })
			.limit(limit)

		if (error) {
			this.logger.error('Failed to get user activity', { error, userId })
			throw error
		}

		return {
			userId,
			activity: data || [],
			count: count || 0
		}
	}

	/**
	 * Get failed jobs from queues
	 */
	async getFailedJobs(queueName?: string) {
		const queues = queueName
			? [{ name: queueName, queue: this.getQueueByName(queueName) }]
			: [
					{ name: 'emails', queue: this.emailQueue },
					{ name: 'stripe-webhooks', queue: this.webhookQueue }
				]

		const failedJobs = await Promise.all(
			queues.map(async ({ name, queue }) => {
				if (!queue) return { queueName: name, jobs: [] }

				const jobs = await queue.getFailed(0, 100)
				return {
					queueName: name,
					jobs: jobs.map(job => ({
						id: job.id,
						name: job.name,
						data: job.data,
						failedReason: job.failedReason,
						attemptsMade: job.attemptsMade,
						timestamp: job.timestamp
					}))
				}
			})
		)

		return { failedJobs }
	}

	/**
	 * Retry a failed job
	 */
	async retryJob(queueName: string, jobId: string) {
		const queue = this.getQueueByName(queueName)
		if (!queue) {
			throw new Error(`Queue ${queueName} not found`)
		}

		const job = await queue.getJob(jobId)
		if (!job) {
			throw new Error(`Job ${jobId} not found in queue ${queueName}`)
		}

		await job.retry()
		this.logger.log('Job retried', { queueName, jobId })

		return { success: true, jobId, queueName }
	}

	/**
	 * Get queue by name
	 */
	private getQueueByName(name: string): Queue | null {
		switch (name) {
			case 'emails':
				return this.emailQueue
			case 'stripe-webhooks':
				return this.webhookQueue
			default:
				return null
		}
	}
}
