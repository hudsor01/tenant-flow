import { Module, Global, forwardRef } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { AuthWebhookController } from './auth-webhook.controller'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { PrismaModule } from '../prisma/prisma.module'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { EmailModule } from '../email/email.module'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'
import { StripeModule } from '../stripe/stripe.module'
import { UsersModule } from '../users/users.module'

@Global()
@Module({
	imports: [
		ConfigModule,
		PrismaModule,
		EmailModule,
		SubscriptionsModule,
		StripeModule,
		forwardRef(() => UsersModule) // Use forwardRef to handle circular dependency
	],
	controllers: [AuthController, AuthWebhookController],
	providers: [AuthService, JwtAuthGuard, ErrorHandlerService],
	exports: [AuthService, JwtAuthGuard]
})
export class AuthModule {}
