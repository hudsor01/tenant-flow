import { Module } from '@nestjs/common'
import { LeasesController } from './leases.controller'
import { LeasesService } from './leases.service'
import { LeaseSupabaseRepository } from './lease-supabase.repository'
import { LeasePDFService } from './services/lease-pdf.service'
import { SupabaseModule } from '../common/supabase/supabase.module'
import { PDFModule } from '../common/pdf/pdf.module'
import { ErrorModule } from '../common/errors/error.module'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'
import { ZodValidationModule } from '../common/validation/zod-validation.module'

@Module({
	imports: [
		SupabaseModule,
		PDFModule,
		ErrorModule,
		SubscriptionsModule,
		ZodValidationModule
	],
	controllers: [LeasesController],
	providers: [LeasesService, LeaseSupabaseRepository, LeasePDFService],
	exports: [LeasesService, LeaseSupabaseRepository, LeasePDFService]
})
export class LeasesModule {}
