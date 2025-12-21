/**
 * DocuSeal Module
 *
 * Provides e-signature integration via self-hosted DocuSeal
 * https://sign.thehudsonfam.com
 *
 * Includes:
 * - DocuSealService: API client for creating/managing submissions
 * - DocuSealWebhookController: Receives signature events
 * - DocuSealWebhookService: Processes signature events (with SSE broadcast)
 */

import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { DocuSealService } from './docuseal.service'
import { DocuSealWebhookController } from './docuseal-webhook.controller'
import { DocuSealWebhookService } from './docuseal-webhook.service'
import { SseModule } from '../notifications/sse/sse.module'

@Module({
	imports: [SupabaseModule, SseModule],
	controllers: [DocuSealWebhookController],
	providers: [DocuSealService, DocuSealWebhookService],
	exports: [DocuSealService, DocuSealWebhookService]
})
export class DocuSealModule {}
