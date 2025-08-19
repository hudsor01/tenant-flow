import { forwardRef, Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { AuthWebhookController } from './auth-webhook.controller'
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard'
import { SupabaseModule } from '../database/supabase.module'
import { ErrorHandlerService } from '../services/error-handler.service'
import { EmailModule } from '../email/email.module'
import { SubscriptionsModule } from '../billing/subscriptions.module'
import { StripeModule } from '../billing/stripe.module'
import { UsersModule } from '../users/users.module'

@Global()
@Module({
	imports: [
		ConfigModule,
		SupabaseModule,
		EmailModule,
		SubscriptionsModule,
		StripeModule,
		forwardRef(() => UsersModule)
	],
	controllers: [AuthController, AuthWebhookController],
	providers: [AuthService, JwtAuthGuard, ErrorHandlerService],
	exports: [AuthService, JwtAuthGuard]
})
export class AuthModule {}
