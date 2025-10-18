/**
 * Stripe Sync Module
 * Integrates Stripe Sync Engine for automatic Stripe data synchronization
 */

import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { StripeSyncController } from './stripe-sync.controller'

@Module({
	imports: [SupabaseModule],
	controllers: [StripeSyncController]
})
export class StripeSyncModule {}
