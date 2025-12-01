import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { SharedModule } from '../../shared/shared.module'
import { PDFModule } from '../pdf/pdf.module'
import { LeasesController } from './leases.controller'
import { LeasesService } from './leases.service'
import { LeaseFinancialService } from './lease-financial.service'
import { LeaseLifecycleService } from './lease-lifecycle.service'
import { LeaseTransformationService } from './lease-transformation.service'
import { LeaseValidationService } from './lease-validation.service'
import { LeaseExpiryCheckerService } from './lease-expiry-checker.service'
import { TenantsModule } from '../tenants/tenants.module'

/**
 * Leases module - Repository pattern implementation
 * Clean separation of concerns with repository layer
 */
@Module({
	imports: [
		SupabaseModule,
		TenantsModule,
		PDFModule, // For lease PDF generation
		SharedModule
	],
	controllers: [LeasesController],
	providers: [
		LeasesService,
		LeaseFinancialService,
		LeaseLifecycleService,
		LeaseTransformationService,
		LeaseValidationService,
		LeaseExpiryCheckerService
	],
	exports: [
		LeasesService,
		LeaseFinancialService,
		LeaseLifecycleService,
		LeaseTransformationService,
		LeaseValidationService
	]
})
export class LeasesModule {}
