// Re-export auth hooks from useApiAuth for consistent imports
export {
	useAuth,
	useAuthStatus,
	useLogin,
	useRegister,
	useLogout,
	useRefreshToken,
	useRequireAuth
} from './useApiAuth'