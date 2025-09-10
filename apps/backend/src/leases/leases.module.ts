import { Module } from '@nestjs/common'
import { LeasesController } from './leases.controller'
import { LeasesService } from './leases.service'
import { LeaseGeneratorController } from './lease-generator.controller'
import { LeasePDFService } from '../pdf/lease-pdf.service'
import { SupabaseModule } from '../database/supabase.module'
import { PDFModule } from '../pdf/pdf.module'
import { SharedModule } from '../shared/shared.module'

/**
 * Leases module - Simplified with direct Supabase usage
 * No repositories, minimal dependencies
 */
@Module({
	imports: [
		SupabaseModule,
		PDFModule, // For lease PDF generation
		SharedModule
	],
	controllers: [LeasesController, LeaseGeneratorController],
	providers: [LeasesService, LeasePDFService],
	exports: [LeasesService, LeasePDFService]
})
export class LeasesModule {}
