import type { User } from '@prisma/client'

export interface AuthenticatedUser extends User {
	supabaseId: string
}

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