/**
 * Backend DTO types - NOW USING SHARED TYPES
 * All auth types moved to @repo/shared for centralization
 */

// Use shared auth types instead of local DTOs
export type {
	LoginCredentials as LoginDto,
	SignupCredentials as SignupDto,
	AuthResponse
} from '@repo/shared'
