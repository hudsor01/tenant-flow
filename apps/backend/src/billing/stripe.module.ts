import { Module } from '@nestjs/common'
import { StripeService } from './stripe.service'
import { TypeSafeConfigModule } from '../config/config.module'

@Module({
	imports: [TypeSafeConfigModule],
	providers: [StripeService],
	exports: [StripeService]
})
export class StripeModule {}
