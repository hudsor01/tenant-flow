/**
 * Backend DTO types - Define locally
 * Using Database types directly for authentication
 */

import type { Database } from '@repo/shared'

// Define auth types locally from Database schema
export interface LoginDto {
	email: string
	password: string
}

export interface SignupDto {
	email: string
	password: string
	name?: string
}

export interface AuthResponse {
	user: Database['public']['Tables']['User']['Row']
	session: {
		access_token: string
		refresh_token: string
		expires_in: number
		token_type: string
	}
}
