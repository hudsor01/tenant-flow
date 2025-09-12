import { Global, Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { AuthWebhookController } from './auth-webhook.controller'
import { UsersModule } from '../users/users.module'

@Global()
@Module({
	imports: [UsersModule],
	controllers: [AuthController, AuthWebhookController],
	providers: [AuthService],
	exports: [AuthService]
})
export class AuthModule {}
