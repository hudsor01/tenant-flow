/**
 * Authentication hook
 * Provides auth state and actions using React Context (no Jotai)
 */
import { useAuth as useAuthContext } from '../providers/auth-provider'

export function useAuth() {
	return useAuthContext()
}
