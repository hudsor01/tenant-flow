import { Process, Processor } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { Job } from 'bull'
import { QUEUE_NAMES } from '../queue.module'
import { firstValueFrom } from 'rxjs'

interface WebhookJobData {
  url: string
  payload: Record<string, unknown>
  headers: Record<string, string>
  attemptNumber: number
  maxAttempts: number
}

@Processor(QUEUE_NAMES.WEBHOOKS)
export class WebhookProcessor {
  private readonly logger = new Logger(WebhookProcessor.name)

  constructor(private readonly httpService: HttpService) {}

  @Process('retry-webhook')
  async handleWebhookRetry(job: Job<WebhookJobData>): Promise<void> {
    this.logger.log(`Processing webhook retry job: ${job.id}`)
    const { url, payload, headers, attemptNumber, maxAttempts } = job.data
    
    // Log handled by base processor
    
    try {
      await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'TenantFlow-Webhook/1.0',
            ...headers
          },
          timeout: 30000, // 30 second timeout
          validateStatus: (status) => status >= 200 && status < 300
        })
      )
      
      // Log handled by base processor
      // Processing logic
      
    } catch (error) {
      // Error handled by base processor
      
      if (attemptNumber >= maxAttempts) {
        // Error handled by base processor
        await this.handlePermanentFailure(job.data, error as Error)
        throw error
      } else {
        // Will be retried by the queue system
        throw error
      }
    }
  }

  private async handlePermanentFailure(data: WebhookJobData, error: Error): Promise<void> {
    // TODO: Implement permanent failure handling
    // - Log the permanent failure
    // - Store failure details for debugging
    // - Notify administrators if critical webhook
    // - Update webhook endpoint status
    
    // Error handled by base processor
    // Store failure details for later processing
    const failureDetails = {
      url: data.url,
      attempts: data.maxAttempts,
      lastError: error.message,
      payload: data.payload
    }
    
    this.logger.error('Webhook permanently failed', failureDetails)
    
    // TODO: Store failure in database for admin review
    // TODO: Send alert to monitoring system
  }
}