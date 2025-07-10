import type { User } from '@prisma/client'

export interface AuthenticatedUser extends User {
	supabaseId: string
}

export interface RequestWithUser extends Request {
	user: AuthenticatedUser
}