import { Logger, Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { SharedModule } from '../../shared/shared.module'
import { PDFModule } from '../pdf/pdf.module'
import { StripeModule } from '../billing/stripe.module'
import { DocuSealModule } from '../docuseal/docuseal.module'
import { LeasesController } from './leases.controller'
import { LeasesService } from './leases.service'
import { LeaseTransformationService } from './lease-transformation.service'
import { LeaseValidationService } from './lease-validation.service'
import { LeaseExpiryCheckerService } from './lease-expiry-checker.service'
import { LeaseSignatureService } from './lease-signature.service'
import { TenantsModule } from '../tenants/tenants.module'

/**
 * Leases module - Repository pattern implementation
 * Clean separation of concerns with repository layer
 *
 * Lease Lifecycle:
 * 1. Create lease (draft status)
 * 2. Send for signature (pending_signature)
 * 3. Owner signs
 * 4. Tenant signs
 * 5. Both signed → active, Stripe subscription created
 */
@Module({
	imports: [
		SupabaseModule,
		TenantsModule,
		PDFModule, // For lease PDF generation
		SharedModule,
		StripeModule, // For billing when lease is activated
		DocuSealModule // For e-signature via self-hosted DocuSeal
	],
	controllers: [LeasesController],
	providers: [
		Logger,
		LeasesService,
		LeaseTransformationService,
		LeaseValidationService,
		LeaseExpiryCheckerService,
		LeaseSignatureService
	],
	exports: [
		LeasesService,
		LeaseTransformationService,
		LeaseValidationService,
		LeaseSignatureService
	]
})
export class LeasesModule {}
