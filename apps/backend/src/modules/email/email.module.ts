import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { EmailService } from './email.service'
import { EmailRendererService } from './email-renderer.service'
import { EmailSenderService } from './email-sender.service'
import { EmailTemplateService } from './email-template.service'
import { EmailProcessor } from './email.queue'
import { N8nEmailWebhookController } from './n8n-email-webhook.controller'

const WORKERS_ENABLED =
	process.env.BULLMQ_WORKERS_ENABLED !== 'false' &&
	process.env.BULLMQ_WORKERS_ENABLED !== '0'

/**
 * N8N Mode: When enabled, the n8n webhook controller handles email sending
 * via HTTP endpoints, allowing n8n to manage retries and orchestration.
 * BullMQ workers are disabled when using n8n mode.
 */
const N8N_MODE_ENABLED = process.env.N8N_EMAIL_MODE === 'true'

@Module({
	imports: [
		BullModule.registerQueue({
			name: 'emails',
			defaultJobOptions: {
				attempts: 3, // Retry 3 times
				backoff: {
					type: 'exponential',
					delay: 5000 // Start with 5s, then 25s, then 125s
				},
				removeOnComplete: {
					age: 24 * 3600, // Keep completed jobs for 24 hours
					count: 1000
				},
				removeOnFail: {
					age: 7 * 24 * 3600 // Keep failed jobs for 7 days
				}
			}
		})
	],
	controllers: [...(N8N_MODE_ENABLED ? [N8nEmailWebhookController] : [])],
	providers: [
		EmailService,
		EmailRendererService,
		EmailSenderService,
		EmailTemplateService,
		...(WORKERS_ENABLED && !N8N_MODE_ENABLED ? [EmailProcessor] : [])
	],
	exports: [EmailService, BullModule]
})
export class EmailModule {}
