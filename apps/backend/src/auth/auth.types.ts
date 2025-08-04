import type { User } from '@repo/database'

export type AuthenticatedUser = User

export interface RequestWithUser extends Request {
	user: AuthenticatedUser
}

export interface GoogleOAuthUser {
	id: string
	email: string
	name?: string
	picture?: string
	[key: string]: string | number | boolean | null | undefined
}