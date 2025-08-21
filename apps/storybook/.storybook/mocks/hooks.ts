// Mock hooks for Storybook
export const useA11yId = (prefix: string = 'mock') => {
	return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
}

export const useAuth = () => ({
	user: null,
	loading: false,
	error: null,
	signIn: () => Promise.resolve(),
	signOut: () => Promise.resolve(),
	signUp: () => Promise.resolve()
})

// Add other hooks as needed
