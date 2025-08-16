import type { FastifyInstance } from 'fastify'
import { createBullBoard } from '@bull-board/api'
import { BullAdapter } from '@bull-board/api/bullAdapter'
import { FastifyAdapter } from '@bull-board/fastify'
import type { Queue } from 'bull'
import { Logger } from '@nestjs/common'

/**
 * Setup Bull Dashboard for monitoring email queues
 * Provides web UI for monitoring queue status, jobs, and performance
 */
export class BullDashboardSetup {
	// private readonly logger = new Logger(BullDashboardSetup.name)

	/**
	 * Setup Bull Board dashboard
	 */
	static setupDashboard(app: FastifyInstance, emailQueue: Queue): void {
		const logger = new Logger(BullDashboardSetup.name)

		try {
			const serverAdapter = new FastifyAdapter()

			// Create Bull Board with email queue
			createBullBoard({
				queues: [new BullAdapter(emailQueue)],
				serverAdapter
			})

			// Set base path for dashboard
			serverAdapter.setBasePath('/admin/queues')

			// Register the routes with Fastify
			app.register(serverAdapter.registerPlugin(), {
				prefix: '/admin/queues'
			})

			logger.log('🎛️ Bull Dashboard setup completed', {
				path: '/admin/queues',
				queues: ['email'],
				environment: process.env.NODE_ENV
			})

			// Log dashboard access in development
			if (process.env.NODE_ENV === 'development') {
				logger.log(
					'📊 Bull Dashboard available at: http://localhost:3000/admin/queues'
				)
			}
		} catch (error) {
			logger.error('Failed to setup Bull Dashboard', error)
		}
	}

	/**
	 * Setup custom monitoring endpoints
	 */
	static setupMonitoringRoutes(
		app: FastifyInstance,
		emailQueue: Queue
	): void {
		const logger = new Logger('BullMonitoring')

		// Queue metrics endpoint
		app.get('/admin/queues/metrics', async (_request, reply) => {
			try {
				const [waiting, active, completed, failed, delayed, paused] =
					await Promise.all([
						emailQueue.getWaiting(),
						emailQueue.getActive(),
						emailQueue.getCompleted(),
						emailQueue.getFailed(),
						emailQueue.getDelayed(),
						emailQueue.isPaused()
					])

				const metrics = {
					timestamp: new Date().toISOString(),
					queue: emailQueue.name,
					counts: {
						waiting: waiting.length,
						active: active.length,
						completed: completed.length,
						failed: failed.length,
						delayed: delayed.length
					},
					status: {
						paused,
						healthy: failed.length < 10 && waiting.length < 1000
					},
					jobs: {
						recent_completed: completed.slice(-5).map(job => ({
							id: job.id,
							name: job.name,
							completedOn: job.finishedOn,
							processingTime:
								job.finishedOn && job.processedOn
									? job.finishedOn - job.processedOn
									: null
						})),
						recent_failed: failed.slice(-5).map(job => ({
							id: job.id,
							name: job.name,
							failedReason: job.failedReason,
							attemptsMade: job.attemptsMade
						}))
					}
				}

				reply.send(metrics)
			} catch (error) {
				logger.error('Failed to get queue metrics', error)
				reply.code(500).send({ error: 'Failed to get metrics' })
			}
		})

		// Health check endpoint specifically for queues
		app.get('/admin/queues/health', async (_request, reply) => {
			try {
				const [waiting, active, failed] = await Promise.all([
					emailQueue.getWaiting(),
					emailQueue.getActive(),
					emailQueue.getFailed()
				])

				const isHealthy = failed.length < 10 && waiting.length < 1000

				const health = {
					status: isHealthy ? 'healthy' : 'degraded',
					timestamp: new Date().toISOString(),
					checks: {
						redis_connection:
							(await emailQueue.client.ping()) === 'PONG',
						queue_not_overwhelmed: waiting.length < 1000,
						low_failure_rate: failed.length < 10,
						workers_active: active.length > 0 && active.length < 50
					},
					metrics: {
						waiting_jobs: waiting.length,
						active_jobs: active.length,
						failed_jobs: failed.length
					}
				}

				reply.code(isHealthy ? 200 : 503).send(health)
			} catch (error) {
				logger.error('Queue health check failed', error)
				reply.code(503).send({
					status: 'unhealthy',
					error: 'Health check failed',
					timestamp: new Date().toISOString()
				})
			}
		})

		// Queue operations endpoint (pause/resume)
		app.post('/admin/queues/operations', async (request, reply) => {
			try {
				const { action } = request.body as {
					action: 'pause' | 'resume' | 'clean'
				}

				let result
				switch (action) {
					case 'pause':
						await emailQueue.pause()
						result = {
							action: 'paused',
							timestamp: new Date().toISOString()
						}
						logger.warn('Email queue paused via admin dashboard')
						break

					case 'resume':
						await emailQueue.resume()
						result = {
							action: 'resumed',
							timestamp: new Date().toISOString()
						}
						logger.log('Email queue resumed via admin dashboard')
						break

					case 'clean': {
						const oneHourAgo = Date.now() - 60 * 60 * 1000
						await Promise.all([
							emailQueue.clean(oneHourAgo, 'completed'),
							emailQueue.clean(oneHourAgo, 'failed')
						])
						result = {
							action: 'cleaned',
							timestamp: new Date().toISOString()
						}
						logger.log('Email queue cleaned via admin dashboard')
						break
					}

					default:
						reply.code(400).send({ error: 'Invalid action' })
						return
				}

				reply.send(result)
			} catch (error) {
				logger.error('Queue operation failed', error)
				reply.code(500).send({ error: 'Operation failed' })
			}
		})

		logger.log('🔧 Queue monitoring routes setup completed', {
			endpoints: [
				'/admin/queues/metrics',
				'/admin/queues/health',
				'/admin/queues/operations'
			]
		})
	}
}
