import { forwardRef, Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { AuthWebhookController } from './auth-webhook.controller'
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard'
import { SupabaseModule } from '../database/supabase.module'
import { EmailModule } from '../email/email.module'
import { StripeModule } from '../billing/stripe.module'
import { UsersModule } from '../users/users.module'
import { CommonModule } from '../shared/common.module'
import { SecurityMonitorService } from '../security/security-monitor.service'
import { ErrorHandlerService } from '../services/error-handler.service'

@Global()
@Module({
	imports: [
		ConfigModule,
		CommonModule,
		SupabaseModule,
		EmailModule,
		StripeModule,
		forwardRef(() => UsersModule)
	],
	controllers: [AuthController, AuthWebhookController],
	providers: [
		AuthService,
		JwtAuthGuard,
		SecurityMonitorService,
		ErrorHandlerService
	],
	exports: [AuthService, JwtAuthGuard]
})
export class AuthModule {}
