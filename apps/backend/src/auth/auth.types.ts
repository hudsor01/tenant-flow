import type { User } from '@prisma/client'

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