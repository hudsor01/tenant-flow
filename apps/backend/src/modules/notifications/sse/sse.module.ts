/**
 * SSE Module - Server-Sent Events
 *
 * Provides real-time event streaming to connected clients.
 * Exports SseService for use by other modules.
 *
 * @module SSE
 */

import { Module } from '@nestjs/common'
import { SseController } from './sse.controller'
import { SseService } from './sse.service'
import { SupabaseModule } from '../../../database/supabase.module'

@Module({
	imports: [SupabaseModule],
	controllers: [SseController],
	providers: [SseService],
	exports: [SseService]
})
export class SseModule {}
