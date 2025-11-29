/**
 * DocuSeal Module
 *
 * Provides e-signature integration via self-hosted DocuSeal
 * https://sign.thehudsonfam.com
 *
 * Includes:
 * - DocuSealService: API client for creating/managing submissions
 * - DocuSealWebhookController: Receives signature events
 * - DocuSealWebhookService: Processes signature events
 */

import { Logger, Module } from '@nestjs/common'
import { DocuSealService } from './docuseal.service'
import { DocuSealWebhookController } from './docuseal-webhook.controller'
import { DocuSealWebhookService } from './docuseal-webhook.service'

@Module({
	controllers: [DocuSealWebhookController],
	providers: [Logger, DocuSealService, DocuSealWebhookService],
	exports: [DocuSealService, DocuSealWebhookService]
})
export class DocuSealModule {}
