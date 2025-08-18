import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Job, JobOptions, Queue } from 'bull'
import {
	EmailJob,
	EmailPriority,
	QueueHealth
} from '../types/email-queue.types'
import {
	EmailTemplateName,
	ExtractEmailData
} from '../types/email-templates.types'

@Injectable()
export class EmailQueueService implements OnModuleInit {
	private readonly logger = new Logger(EmailQueueService.name)

	constructor(@InjectQueue('email') private readonly emailQueue: Queue) {}

	async onModuleInit() {
		// Make initialization non-blocking to prevent startup hangs
		setImmediate(async () => {
			try {
				// Set up queue event listeners first (these don't require Redis connection)
				this.setupQueueEventListeners()

				// Test Redis connection with timeout to prevent hanging
				await this.testRedisConnection()

				this.logger.log(
					'Email queue service initialized successfully with Redis connection'
				)
			} catch (error) {
				this.logger.error('Failed to initialize email queue', {
					error: error instanceof Error ? error.message : String(error)
				})
				// Don't throw - let the app run without email queue
			}
		})
	}

	/**
	 * Test Redis connection with timeout to prevent hanging during startup
	 */
	private async testRedisConnection(): Promise<void> {
		try {
			// Create a promise that times out after 2 seconds
			const connectionTest = new Promise<void>((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(
						new Error(
							'Redis connection test timed out after 2 seconds'
						)
					)
				}, 2000)

				// Test basic Redis operations
				this.emailQueue.client
					.ping()
					.then(() => {
						clearTimeout(timeout)
						resolve()
					})
					.catch(error => {
						clearTimeout(timeout)
						reject(error)
					})
			})

			await connectionTest
			this.logger.log('Redis connection test passed')
		} catch (error) {
			this.logger.warn(
				'Redis connection test failed - email queue will work but may have connection issues',
				{
					error:
						error instanceof Error ? error.message : String(error)
				}
			)
			// Don't throw - allow the service to continue without Redis connectivity check
		}
	}

	/**
	 * Add immediate email to queue (welcome, invitations, password resets)
	 */
	async addImmediateEmail<T extends EmailTemplateName>(
		to: string | string[],
		template: T,
		data: ExtractEmailData<T>,
		metadata?: {
			userId?: string
			organizationId?: string
			trackingId?: string
		}
	): Promise<Job<EmailJob>> {
		const recipients = Array.isArray(to) ? to : [to]

		return this.emailQueue.add(
			'send-immediate',
			{
				to: recipients,
				template,
				data,
				priority: EmailPriority.CRITICAL,
				metadata
			},
			{
				priority: EmailPriority.CRITICAL,
				attempts: 3,
				backoff: {
					type: 'exponential',
					delay: 2000
				},
				removeOnComplete: 100,
				removeOnFail: 50
			}
		)
	}

	/**
	 * Schedule email for future delivery
	 */
	async addScheduledEmail<T extends EmailTemplateName>(
		to: string | string[],
		template: T,
		data: ExtractEmailData<T>,
		scheduleOptions: {
			delay?: number // milliseconds from now
			cron?: string // cron expression
			at?: Date // specific date/time
		},
		metadata?: {
			userId?: string
			organizationId?: string
			campaignId?: string
		}
	): Promise<Job<EmailJob>> {
		const recipients = Array.isArray(to) ? to : [to]

		const jobOptions: JobOptions = {
			priority: EmailPriority.HIGH,
			attempts: 5,
			backoff: {
				type: 'exponential',
				delay: 5000
			},
			removeOnComplete: 200,
			removeOnFail: 100
		}

		// Handle different scheduling options
		if (scheduleOptions.delay) {
			jobOptions.delay = scheduleOptions.delay
		} else if (scheduleOptions.at) {
			jobOptions.delay = scheduleOptions.at.getTime() - Date.now()
		} else if (scheduleOptions.cron) {
			jobOptions.repeat = { cron: scheduleOptions.cron }
		}

		return this.emailQueue.add(
			'send-scheduled',
			{
				to: recipients,
				template,
				data,
				priority: EmailPriority.HIGH,
				metadata
			},
			jobOptions
		)
	}

	/**
	 * Add bulk campaign emails (newsletters, announcements)
	 */
	async addBulkCampaign<T extends EmailTemplateName>(
		recipients: { email: string; data: ExtractEmailData<T> }[],
		template: T,
		metadata?: { campaignId?: string; organizationId?: string }
	): Promise<Job<EmailJob>[]> {
		const batchSize = 50 // Process in smaller batches for bulk
		const jobs: Job<EmailJob>[] = []

		for (let i = 0; i < recipients.length; i += batchSize) {
			const batch = recipients.slice(i, i + batchSize)

			// Create job for this batch
			const job = await this.emailQueue.add(
				'send-bulk',
				{
					to: batch.map(r => r.email),
					template,
					data: batch[0]?.data || {}, // Use first recipient's data as base
					priority: EmailPriority.BULK,
					metadata: {
						...metadata,
						batchNumber: Math.floor(i / batchSize) + 1,
						totalBatches: Math.ceil(recipients.length / batchSize)
					}
				},
				{
					priority: EmailPriority.BULK,
					attempts: 2,
					delay: i * 1000, // Stagger batches by 1 second
					backoff: {
						type: 'fixed',
						delay: 30000 // 30 second delay between retries
					},
					removeOnComplete: 50,
					removeOnFail: 25
				}
			)

			jobs.push(job)
		}

		this.logger.log(`🚀 Bulk campaign queued`, {
			template,
			totalRecipients: recipients.length,
			batches: jobs.length,
			campaignId: metadata?.campaignId
		})

		return jobs
	}

	/**
	 * Retry failed email
	 */
	async retryFailedEmail(jobId: string): Promise<Job<EmailJob> | null> {
		const failedJobs = await this.emailQueue.getFailed()
		const job = failedJobs.find(j => j.id?.toString() === jobId)

		if (!job) {
			this.logger.warn(`Failed job ${jobId} not found`)
			return null
		}

		// Move to retry queue with exponential backoff
		return this.emailQueue.add('retry-failed', job.data, {
			priority: EmailPriority.HIGH,
			attempts: 2,
			delay: Math.min(job.attemptsMade * 60000, 300000), // Max 5 minutes
			backoff: {
				type: 'exponential',
				delay: 10000
			}
		})
	}

	/**
	 * Get queue health and metrics
	 */
	async getQueueHealth(): Promise<QueueHealth> {
		const [waiting, active, completed, failed, delayed] = await Promise.all(
			[
				this.emailQueue.getWaiting(),
				this.emailQueue.getActive(),
				this.emailQueue.getCompleted(),
				this.emailQueue.getFailed(),
				this.emailQueue.getDelayed()
			]
		)

		// Redis info
		const redisInfo = await this.emailQueue.client.info('memory')
		const redisMemory = redisInfo.match(/used_memory:(\d+)/)?.[1] || '0'

		return {
			redis: {
				connected: (await this.emailQueue.client.ping()) === 'PONG',
				memory: parseInt(redisMemory),
				uptime: Date.now() // Simplified
			},
			queues: {
				immediate: {
					sent: completed.filter(j => j.name === 'send-immediate')
						.length,
					failed: failed.filter(j => j.name === 'send-immediate')
						.length,
					retried: 0, // Would need to track this separately
					avgProcessingTime: 0, // Would need to calculate from job data
					queueDepth: waiting.filter(j => j.name === 'send-immediate')
						.length,
					lastProcessed: new Date()
				},
				scheduled: {
					sent: completed.filter(j => j.name === 'send-scheduled')
						.length,
					failed: failed.filter(j => j.name === 'send-scheduled')
						.length,
					retried: 0,
					avgProcessingTime: 0,
					queueDepth:
						delayed.length +
						waiting.filter(j => j.name === 'send-scheduled').length,
					lastProcessed: new Date()
				},
				bulk: {
					sent: completed.filter(j => j.name === 'send-bulk').length,
					failed: failed.filter(j => j.name === 'send-bulk').length,
					retried: 0,
					avgProcessingTime: 0,
					queueDepth: waiting.filter(j => j.name === 'send-bulk')
						.length,
					lastProcessed: new Date()
				},
				deadLetter: {
					sent: 0,
					failed: failed.filter(
						j => j.attemptsMade >= (j.opts.attempts || 3)
					).length,
					retried: 0,
					avgProcessingTime: 0,
					queueDepth: 0,
					lastProcessed: new Date()
				}
			},
			workers: {
				active: active.length,
				waiting: waiting.length,
				completed: completed.length,
				failed: failed.length
			}
		}
	}

	/**
	 * Pause/resume queue
	 */
	async pauseQueue(): Promise<void> {
		await this.emailQueue.pause()
		this.logger.warn('Email queue paused')
	}

	async resumeQueue(): Promise<void> {
		await this.emailQueue.resume()
		this.logger.log('Email queue resumed')
	}

	/**
	 * Clean up old completed/failed jobs
	 */
	async cleanupOldJobs(): Promise<void> {
		const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

		await Promise.all([
			this.emailQueue.clean(oneWeekAgo, 'completed'),
			this.emailQueue.clean(oneWeekAgo, 'failed')
		])

		this.logger.debug('Cleaned up old jobs')
	}

	/**
	 * Set up event listeners for monitoring
	 */
	private setupQueueEventListeners(): void {
		this.emailQueue.on('completed', (job: Job) => {
			this.logger.debug(`Job ${job.id || 'unknown'} completed`, {
				name: job.name,
				processingTime:
					job.processedOn && job.finishedOn
						? job.finishedOn - job.processedOn
						: 0,
				attempts: job.attemptsMade
			})
		})

		this.emailQueue.on('failed', (job: Job, error: Error) => {
			this.logger.error(`Job ${job.id || 'unknown'} failed`, {
				name: job.name,
				attempts: job.attemptsMade,
				maxAttempts: job.opts.attempts,
				error: error.message
			})

			// Move to dead letter queue if max attempts reached
			if (job.attemptsMade >= (job.opts.attempts || 3)) {
				void this.moveToDeadLetterQueue(job, error)
			}
		})

		this.emailQueue.on('stalled', (job: Job) => {
			this.logger.warn(`Job ${job.id || 'unknown'} stalled`, {
				name: job.name,
				attempts: job.attemptsMade
			})
		})
	}

	/**
	 * Move job to dead letter queue
	 */
	private async moveToDeadLetterQueue(job: Job, error: Error): Promise<void> {
		this.logger.error(
			`Moving job ${job.id || 'unknown'} to dead letter queue`,
			{
				name: job.name,
				data: job.data,
				error: error.message,
				attempts: job.attemptsMade
			}
		)

		// In a production system, you'd store this in a separate queue or database
		// For now, we'll just log it with special markers for monitoring
	}
}
