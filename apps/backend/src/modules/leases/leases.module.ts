import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { SupabaseHelpersModule } from '../../shared/supabase/supabase-helpers.module'
import { SharedModule } from '../../shared/shared.module'
import { PDFModule } from '../pdf/pdf.module'
import { LeasesController } from './leases.controller'
import { LeasesService } from './leases.service'
import { LeaseTransformationService } from './lease-transformation.service'
import { LeaseValidationService } from './lease-validation.service'
import { TenantsModule } from '../tenants/tenants.module'

/**
 * Leases module - Repository pattern implementation
 * Clean separation of concerns with repository layer
 */
@Module({
	imports: [
		SupabaseModule,
		SupabaseHelpersModule,
		TenantsModule,
		PDFModule, // For lease PDF generation
		SharedModule
	],
	controllers: [LeasesController],
	providers: [
		LeasesService,
		LeaseTransformationService,
		LeaseValidationService
	],
	exports: [
		LeasesService,
		LeaseTransformationService,
		LeaseValidationService
	]
})
export class LeasesModule {}
