import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20'
import { ConfigService } from '@nestjs/config'
import { AuthService } from '../auth.service'

export interface GoogleUser {
	id?: string
	googleId?: string
	email: string
	name: string
	firstName?: string
	lastName?: string
	avatarUrl?: string | null
	role?: string
	accessToken?: string
	isExistingUser?: boolean
	isNewUser?: boolean
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
	constructor(
		private configService: ConfigService,
		private authService: AuthService
	) {
		super({
			clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
			clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
			callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') ||
				`${configService.get<string>('VITE_API_BASE_URL') || 'https://api.tenantflow.app/api/v1'}/auth/google/callback`,
			scope: ['email', 'profile']
		})
	}

	async validate(
		accessToken: string,
		refreshToken: string,
		profile: Profile,
		done: VerifyCallback
	): Promise<void> {
		try {
			const { name, emails, photos, id } = profile

			// Ensure we have required data
			if (!emails || emails.length === 0) {
				return done(new Error('Email is required from Google profile'), false)
			}

			const email = emails[0]?.value
			if (!email) {
				return done(new Error('Email is required from Google profile'), false)
			}

			const firstName = name?.givenName || ''
			const lastName = name?.familyName || ''
			const fullName = `${firstName} ${lastName}`.trim()
			const picture = photos && photos.length > 0 ? photos[0]?.value : null

			// Check if user already exists in our database
			const existingUser = await this.authService.getUserByEmail(email)

			if (existingUser) {
				// User exists, return them
				return done(null, {
					id: existingUser.id,
					email: existingUser.email,
					name: existingUser.name || fullName,
					avatarUrl: existingUser.avatarUrl || picture,
					role: existingUser.role,
					isExistingUser: true
				})
			}

			// New user, prepare data for creation
			return done(null, {
				googleId: id,
				email,
				name: fullName || firstName,
				firstName,
				lastName,
				avatarUrl: picture,
				accessToken,
				isNewUser: true
			})
		} catch (error) {
			return done(error, false)
		}
	}
}