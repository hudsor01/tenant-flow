import { Module } from '@nestjs/common'
import { LeasesController } from './leases.controller'
import { LeasesService } from './leases.service'
import { LeasePDFService } from '../pdf/lease-pdf.service'
import { SupabaseModule } from '../database/supabase.module'
import { PDFModule } from '../pdf/pdf.module'
import { CommonModule } from '../shared/common.module'

/**
 * Leases module - Simplified with direct Supabase usage
 * No repositories, minimal dependencies
 */
@Module({
	imports: [
		SupabaseModule,
		PDFModule, // For lease PDF generation
		CommonModule
	],
	controllers: [LeasesController],
	providers: [LeasesService, LeasePDFService],
	exports: [LeasesService, LeasePDFService]
})
export class LeasesModule {}
