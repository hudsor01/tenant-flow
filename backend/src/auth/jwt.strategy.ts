import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { AuthService } from './auth.service'
import type { ValidatedUser } from './auth.service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(
		private configService: ConfigService,
		private authService: AuthService
	) {
		const jwtSecret = configService.get<string>('SUPABASE_JWT_SECRET')
		if (!jwtSecret) {
			throw new Error(
				'SUPABASE_JWT_SECRET environment variable is required'
			)
		}

		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: jwtSecret,
			algorithms: ['HS256']
		})
	}

	async validate(payload: {
		sub: string
		email: string
		email_confirmed_at?: string
		user_metadata?: Record<string, unknown>
		iat?: number
		exp?: number
		aud?: string
		role?: string
	}): Promise<ValidatedUser> {
		try {
			// Supabase JWT payload structure
			const {
				sub: userId,
				email,
				email_confirmed_at,
				user_metadata
			} = payload

			if (!userId || !email) {
				throw new UnauthorizedException('Invalid token payload')
			}

			// Ensure email is verified
			if (!email_confirmed_at) {
				throw new UnauthorizedException('Email not verified')
			}

			// Get or sync user with local database
			const user = await this.authService.getUserBySupabaseId(userId)

			if (!user) {
				// If user doesn't exist locally, sync from Supabase
				// This handles cases where user was created in Supabase but not synced yet
				const supabaseUser = {
					id: userId,
					email,
					email_confirmed_at,
					user_metadata,
					created_at: payload.iat
						? new Date(payload.iat * 1000).toISOString()
						: new Date().toISOString(),
					updated_at: new Date().toISOString()
				}

				const syncedUser =
					await this.authService['syncUserWithDatabase'](supabaseUser)
				return {
					...syncedUser,
					supabaseId: userId
				}
			}

			return {
				...user,
				supabaseId: userId
			}
		} catch {
			throw new UnauthorizedException('Token validation failed')
		}
	}
}
