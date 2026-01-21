import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { EmailService } from './email.service'
import { EmailRendererService } from './email-renderer.service'
import { EmailSenderService } from './email-sender.service'
import { EmailTemplateService } from './email-template.service'
import { EmailProcessor } from './email.queue'
import { ResendWebhookController } from './resend-webhook.controller'

const WORKERS_ENABLED =
	process.env.BULLMQ_WORKERS_ENABLED !== 'false' &&
	process.env.BULLMQ_WORKERS_ENABLED !== '0'

/**
 * Resend Webhooks: Enable to receive email tracking events
 * (delivered, bounced, opened, clicked)
 */
const RESEND_WEBHOOKS_ENABLED = process.env.RESEND_WEBHOOKS_ENABLED === 'true'

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
	controllers: [...(RESEND_WEBHOOKS_ENABLED ? [ResendWebhookController] : [])],
	providers: [
		EmailService,
		EmailRendererService,
		EmailSenderService,
		EmailTemplateService,
		...(WORKERS_ENABLED ? [EmailProcessor] : [])
	],
	exports: [EmailService, EmailSenderService, BullModule]
})
export class EmailModule {}
