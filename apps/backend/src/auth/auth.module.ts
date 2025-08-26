import { forwardRef, Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { AuthWebhookController } from './auth-webhook.controller'
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard'
import { SupabaseModule } from '../database/supabase.module'
import { StripeModule } from '../billing/stripe.module'
import { UsersModule } from '../users/users.module'
import { CommonModule } from '../shared/common.module'

@Global()
@Module({
	imports: [
		ConfigModule,
		CommonModule,
		SupabaseModule,
		StripeModule,
		forwardRef(() => UsersModule)
	],
	controllers: [AuthController, AuthWebhookController],
	providers: [AuthService, JwtAuthGuard],
	exports: [AuthService, JwtAuthGuard]
})
export class AuthModule {}
