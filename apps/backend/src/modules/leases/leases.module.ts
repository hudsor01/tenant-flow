import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { RepositoriesModule } from '../../repositories/repositories.module'
import { SharedModule } from '../../shared/shared.module'
import { LeasePDFService } from '../pdf/lease-pdf.service'
import { PDFModule } from '../pdf/pdf.module'
import { LeaseGeneratorController } from './lease-generator.controller'
import { LeasesController } from './leases.controller'
import { LeasesService } from './leases.service'

/**
 * Leases module - Repository pattern implementation
 * Clean separation of concerns with repository layer
 */
@Module({
	imports: [
		SupabaseModule,
		RepositoriesModule,
		PDFModule, // For lease PDF generation
		SharedModule
	],
	controllers: [LeasesController, LeaseGeneratorController],
	providers: [LeasesService, LeasePDFService],
	exports: [LeasesService, LeasePDFService]
})
export class LeasesModule {}
