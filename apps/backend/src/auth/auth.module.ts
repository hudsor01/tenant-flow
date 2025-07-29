import { Module, forwardRef } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { AuthWebhookController } from './auth-webhook.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { EmailModule } from '../email/email.module'
import { UsersModule } from '../users/users.module'

@Module({
	imports: [
		ConfigModule,
		PrismaModule,
		EmailModule,
		forwardRef(() => UsersModule)
	],
	controllers: [AuthController, AuthWebhookController],
	providers: [AuthService, ErrorHandlerService],
	exports: [AuthService]
})
export class AuthModule {}
