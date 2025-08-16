import { Injectable, Logger } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Job, JobOptions, Queue } from 'bull'
import { QUEUE_NAMES } from './constants/queue-names'

export interface QueueJob<T = unknown> {
  data: T
  options?: JobOptions
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger('QueueService')

  constructor(
    @InjectQueue(QUEUE_NAMES.EMAILS) private emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.PAYMENTS) private paymentQueue: Queue
  ) {}

  // Generic job addition method following DRY principles
  async addJob<T>(queueName: string, jobName: string, data: T, options?: JobOptions): Promise<Job> {
    try {
      const queue = this.getQueue(queueName)
      const job = await queue.add(jobName, data, options)
      this.logger.log(`Added ${jobName} job ${job.id} to ${queueName} queue`)
      return job
    } catch (error) {
      this.logger.error(`Failed to add ${jobName} job to ${queueName}:`, error)
      throw error
    }
  }

  // Email Jobs
  async addEmailJob(data: Record<string, unknown>): Promise<Job> {
    try {
      const job = await this.emailQueue.add('send-email', data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 }
      })
      
      // Format recipients for logging
      const recipients = Array.isArray(data.to) ? data.to.join(',') : data.to
      this.logger.log(`Added email job ${job.id} to ${recipients}`)
      return job
    } catch (error) {
      this.logger.error(`Failed to add email job:`, error)
      throw error
    }
  }

  // Payment Processing Jobs
  async addPaymentJob(data: Record<string, unknown> & { type: string; paymentId: string }): Promise<Job> {
    try {
      const jobName = `process-${data.type}`
      const job = await this.paymentQueue.add(jobName, data, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 3000 },
        priority: data.type === 'refund' ? 1 : 2
      })
      this.logger.log(`Added payment job ${job.id} for ${data.type} ${data.paymentId}`)
      return job
    } catch (error) {
      this.logger.error(`Failed to add payment job:`, error)
      throw error
    }
  }

  // Bulk operations
  async addBulkJobs<T>(
    queueName: string,
    jobs: { name: string; data: T; opts?: JobOptions }[]
  ): Promise<Job[]> {
    try {
      const queue = this.getQueue(queueName)
      const bulkJobs = await queue.addBulk(jobs)
      this.logger.log(`Added ${bulkJobs.length} bulk jobs to ${queueName}`)
      return bulkJobs
    } catch (error) {
      this.logger.error(`Failed to add bulk jobs to ${queueName}:`, error)
      throw error
    }
  }

  // Scheduled/Recurring Jobs
  async addRecurringJob(
    queueName: string,
    jobName: string,
    data: unknown,
    cron: string
  ): Promise<void> {
    try {
      const queue = this.getQueue(queueName)
      await queue.add(jobName, data, {
        repeat: { cron },
        removeOnComplete: 10,
        removeOnFail: 10
      })
      this.logger.log(`Added recurring job ${jobName} to ${queueName} with cron ${cron}`)
    } catch (error) {
      this.logger.error('Failed to add recurring job:', error)
      throw error
    }
  }

  // Queue management
  async getJobCounts(queueName: string): Promise<{
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
  }> {
    const queue = this.getQueue(queueName)
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount()
    ])

    return { waiting, active, completed, failed, delayed }
  }

  // Alias for getJobCounts for test compatibility
  async getQueueStats(queueName: string): Promise<{
    waiting: number
    active: number
    completed: number
    failed: number
    delayed?: number
  }> {
    return this.getJobCounts(queueName)
  }

  async cleanQueue(queueName: string, grace = 0): Promise<void> {
    const queue = this.getQueue(queueName)
    await queue.clean(grace, 'completed')
    await queue.clean(grace, 'failed')
    this.logger.log(`Cleaned queue ${queueName}`)
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName)
    await queue.pause()
    this.logger.log(`Paused queue ${queueName}`)
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName)
    await queue.resume()
    this.logger.log(`Resumed queue ${queueName}`)
  }

  private getQueue(queueName: string): Queue {
    // Handle both constant keys and string values
    switch (queueName) {
      case 'EMAILS':
      case 'email':
        return this.emailQueue
      case 'PAYMENTS': 
      case 'payments':
        return this.paymentQueue
      default:
        throw new Error(`Unknown queue: ${queueName}`)
    }
  }
}