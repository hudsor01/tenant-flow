import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { JwtStrategy } from './jwt.strategy'
import { JwtAuthGuard } from './jwt-auth.guard'

@Module({
	imports: [
		ConfigModule,
		PassportModule.register({ defaultStrategy: 'jwt' }),
		JwtModule.registerAsync({
			imports: [ConfigModule],
			useFactory: (configService: ConfigService) => {
				const secret = configService.get<string>('SUPABASE_JWT_SECRET')
				if (!secret) {
					throw new Error('SUPABASE_JWT_SECRET is required')
				}
				return {
					secret,
					signOptions: {
						// We don't sign tokens ourselves - Supabase does that
						// This is just for validation
						algorithm: 'HS256' as const
					}
				}
			},
			inject: [ConfigService]
		})
	],
	controllers: [AuthController],
	providers: [AuthService, JwtStrategy, JwtAuthGuard],
	exports: [AuthService, JwtAuthGuard]
})
export class AuthModule {}
