import { forwardRef, Module } from '@nestjs/common'
import { LeasesController } from './leases.controller'
import { LeasesService } from './leases.service'
import { LeasePDFService } from '../pdf/lease-pdf.service'
import { SupabaseModule } from '../database/supabase.module'
import { PDFModule } from '../pdf/pdf.module'
import { SubscriptionsModule } from '../billing/subscriptions.module'

/**
 * Leases module - Simplified with direct Supabase usage
 * No repositories, minimal dependencies
 */
@Module({
	imports: [
		SupabaseModule,
		PDFModule, // For lease PDF generation
		forwardRef(() => SubscriptionsModule) // For usage limits guard
	],
	controllers: [LeasesController],
	providers: [LeasesService, LeasePDFService],
	exports: [LeasesService, LeasePDFService]
})
export class LeasesModule {}
