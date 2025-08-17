import { Module } from '@nestjs/common'
import { UnitsController } from './units.controller'
import { UnitsService } from './units.service'
import { UnitsSupabaseRepository } from './units-supabase.repository'
import { SupabaseModule } from '../common/supabase/supabase.module'
import { ErrorModule } from '../common/errors/error.module'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'
import { ZodValidationModule } from '../common/validation/zod-validation.module'

@Module({
	imports: [
		SupabaseModule,
		ErrorModule,
		SubscriptionsModule,
		ZodValidationModule
	],
	controllers: [UnitsController],
	providers: [UnitsService, UnitsSupabaseRepository],
	exports: [UnitsService, UnitsSupabaseRepository]
})
export class UnitsModule {}
