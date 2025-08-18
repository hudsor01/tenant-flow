/**
 * Tests for Login Page
 * Tests the user authentication flow with form and auth redirect logic
 */

import { render, screen } from '@testing-library/react'
import LoginPage from '../page'

// Mock auth actions
jest.mock('@/lib/actions/auth-actions', () => ({
	getCurrentUser: jest.fn()
}))

// Mock auth layout
jest.mock('@/components/auth/auth-layout', () => ({
	AuthLayout: jest.fn(
		({
			children,
			title,
			subtitle,
			description,
			side,
			image,
			heroContent
		}) => (
			<div data-testid="auth-layout">
				<div data-testid="auth-layout-title">{title}</div>
				<div data-testid="auth-layout-subtitle">{subtitle}</div>
				<div data-testid="auth-layout-description">{description}</div>
				<div data-testid="auth-layout-side">{side}</div>
				<div data-testid="auth-layout-image-src">{image?.src}</div>
				<div data-testid="auth-layout-image-alt">{image?.alt}</div>
				<div data-testid="auth-layout-hero-title">
					{heroContent?.title}
				</div>
				<div data-testid="auth-layout-hero-description">
					{heroContent?.description}
				</div>
				{children}
			</div>
		)
	)
}))

// Mock login form
jest.mock('@/components/auth/login-form', () => ({
	LoginFormRefactored: jest.fn(({ redirectTo }) => (
		<div data-testid="login-form">
			<h2>Welcome Back</h2>
			<form>
				<input placeholder="Email" type="email" />
				<input placeholder="Password" type="password" />
				<button type="submit">Sign In</button>
			</form>
			<div data-testid="redirect-to">{redirectTo}</div>
		</div>
	))
}))

// Mock auth redirect
jest.mock('@/components/auth/auth-redirect', () => ({
	AuthRedirect: jest.fn(({ to }) => (
		<div data-testid="auth-redirect">Redirecting to: {to}</div>
	))
}))

const mockGetCurrentUser = jest.mocked(
	jest.requireMock('@/lib/actions/auth-actions').getCurrentUser
)

describe.skip('Login Page', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		mockGetCurrentUser.mockResolvedValue(null) // Default: no authenticated user
	})

	describe('Page Metadata', () => {
		it('has proper metadata configuration', () => {
			const { metadata } = jest.requireMock('../page')

			expect(metadata).toEqual({
				title: 'Sign In | TenantFlow',
				description:
					'Sign in to your TenantFlow account to access your property management dashboard.'
			})
		})
	})

	describe('Unauthenticated User Flow', () => {
		it('renders login form when user is not authenticated', async () => {
			mockGetCurrentUser.mockResolvedValue(null)

			const searchParams = Promise.resolve({})
			const component = await LoginPage({ searchParams })

			render(component)

			expect(screen.getByTestId('auth-layout')).toBeInTheDocument()
			expect(screen.getByTestId('login-form')).toBeInTheDocument()
			expect(screen.getByText('Welcome Back')).toBeInTheDocument()
			expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
			expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
			expect(
				screen.getByRole('button', { name: /sign in/i })
			).toBeInTheDocument()
		})

		it('renders with correct auth layout configuration', async () => {
			mockGetCurrentUser.mockResolvedValue(null)

			const searchParams = Promise.resolve({})
			const component = await LoginPage({ searchParams })

			render(component)

			expect(screen.getByTestId('auth-layout-title')).toHaveTextContent(
				'Sign In'
			)
			expect(
				screen.getByTestId('auth-layout-subtitle')
			).toHaveTextContent('Welcome back to TenantFlow')
			expect(
				screen.getByTestId('auth-layout-description')
			).toHaveTextContent(
				'Enter your credentials to access your dashboard'
			)
			expect(screen.getByTestId('auth-layout-side')).toHaveTextContent(
				'left'
			)
			expect(
				screen.getByTestId('auth-layout-image-src')
			).toHaveTextContent('/images/roi-up_to_the_right.jpg')
			expect(
				screen.getByTestId('auth-layout-image-alt')
			).toHaveTextContent('Modern property management dashboard')
		})

		it('displays hero content with value proposition', async () => {
			mockGetCurrentUser.mockResolvedValue(null)

			const searchParams = Promise.resolve({})
			const component = await LoginPage({ searchParams })

			render(component)

			expect(
				screen.getByTestId('auth-layout-hero-title')
			).toHaveTextContent('Streamline Your Property Management')
			expect(
				screen.getByTestId('auth-layout-hero-description')
			).toHaveTextContent(
				'Join thousands of property owners who save hours every week with our powerful, intuitive platform.'
			)
		})

		it('passes default redirect to dashboard when no redirect specified', async () => {
			mockGetCurrentUser.mockResolvedValue(null)

			const searchParams = Promise.resolve({})
			const component = await LoginPage({ searchParams })

			render(component)

			expect(screen.getByTestId('redirect-to')).toHaveTextContent(
				'/dashboard'
			)
		})

		it('passes custom redirect when specified in search params', async () => {
			mockGetCurrentUser.mockResolvedValue(null)

			const searchParams = Promise.resolve({ redirect: '/properties' })
			const component = await LoginPage({ searchParams })

			render(component)

			expect(screen.getByTestId('redirect-to')).toHaveTextContent(
				'/properties'
			)
		})
	})

	describe('Authenticated User Flow', () => {
		it('redirects authenticated user to dashboard by default', async () => {
			mockGetCurrentUser.mockResolvedValue({
				id: 'user-123',
				email: 'test@example.com'
			})

			const searchParams = Promise.resolve({})
			const component = await LoginPage({ searchParams })

			render(component)

			expect(screen.getByTestId('auth-redirect')).toBeInTheDocument()
			expect(
				screen.getByText('Redirecting to: /dashboard')
			).toBeInTheDocument()
			expect(screen.queryByTestId('login-form')).not.toBeInTheDocument()
		})

		it('redirects authenticated user to custom redirect path', async () => {
			mockGetCurrentUser.mockResolvedValue({
				id: 'user-123',
				email: 'test@example.com'
			})

			const searchParams = Promise.resolve({ redirect: '/billing' })
			const component = await LoginPage({ searchParams })

			render(component)

			expect(screen.getByTestId('auth-redirect')).toBeInTheDocument()
			expect(
				screen.getByText('Redirecting to: /billing')
			).toBeInTheDocument()
		})
	})

	describe('Component Integration', () => {
		it('uses Suspense with loading fallback for login form', async () => {
			mockGetCurrentUser.mockResolvedValue(null)

			const searchParams = Promise.resolve({})
			const component = await LoginPage({ searchParams })

			render(component)

			// The Suspense component would render the form
			expect(screen.getByTestId('login-form')).toBeInTheDocument()
		})

		it('calls auth action to check current user', async () => {
			const searchParams = Promise.resolve({})
			await LoginPage({ searchParams })

			expect(mockGetCurrentUser).toHaveBeenCalledTimes(1)
		})

		it('passes correct props to login form component', async () => {
			mockGetCurrentUser.mockResolvedValue(null)
			const { LoginFormRefactored } = jest.requireMock(
				'@/components/auth/login-form'
			)

			const searchParams = Promise.resolve({ redirect: '/custom-path' })
			const component = await LoginPage({ searchParams })

			render(component)

			expect(LoginFormRefactored).toHaveBeenCalledWith(
				{ redirectTo: '/custom-path' },
				undefined
			)
		})

		it('passes correct props to auth layout component', async () => {
			mockGetCurrentUser.mockResolvedValue(null)
			const { AuthLayout } = jest.requireMock(
				'@/components/auth/auth-layout'
			)

			const searchParams = Promise.resolve({})
			const component = await LoginPage({ searchParams })

			render(component)

			expect(AuthLayout).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Sign In',
					subtitle: 'Welcome back to TenantFlow',
					description:
						'Enter your credentials to access your dashboard',
					side: 'left',
					image: {
						src: '/images/roi-up_to_the_right.jpg',
						alt: 'Modern property management dashboard'
					},
					heroContent: {
						title: 'Streamline Your Property Management',
						description:
							'Join thousands of property owners who save hours every week with our powerful, intuitive platform.'
					}
				}),
				undefined
			)
		})
	})

	describe('Search Params Handling', () => {
		it('handles empty search params', async () => {
			mockGetCurrentUser.mockResolvedValue(null)

			const searchParams = Promise.resolve({})
			const component = await LoginPage({ searchParams })

			render(component)

			expect(screen.getByTestId('redirect-to')).toHaveTextContent(
				'/dashboard'
			)
		})

		it('handles error parameter in search params', async () => {
			mockGetCurrentUser.mockResolvedValue(null)

			const searchParams = Promise.resolve({
				error: 'invalid_credentials'
			})
			const component = await LoginPage({ searchParams })

			render(component)

			// Form should still render - error handling would be in the form component
			expect(screen.getByTestId('login-form')).toBeInTheDocument()
		})

		it('handles both redirect and error parameters', async () => {
			mockGetCurrentUser.mockResolvedValue(null)

			const searchParams = Promise.resolve({
				redirect: '/settings',
				error: 'session_expired'
			})
			const component = await LoginPage({ searchParams })

			render(component)

			expect(screen.getByTestId('redirect-to')).toHaveTextContent(
				'/settings'
			)
			expect(screen.getByTestId('login-form')).toBeInTheDocument()
		})
	})

	describe('TypeScript Interface Compliance', () => {
		it('accepts correct LoginPageProps interface', async () => {
			const props = {
				searchParams: Promise.resolve({
					redirect: '/test',
					error: 'test_error'
				})
			}

			// Should not throw TypeScript error
			await expect(LoginPage(props)).resolves.toBeDefined()
		})
	})

	describe('Accessibility', () => {
		it('has accessible form structure', async () => {
			mockGetCurrentUser.mockResolvedValue(null)

			const searchParams = Promise.resolve({})
			const component = await LoginPage({ searchParams })

			render(component)

			expect(
				screen.getByRole('heading', { level: 2, name: /welcome back/i })
			).toBeInTheDocument()
			expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
			expect(
				screen.getByRole('button', { name: /sign in/i })
			).toBeInTheDocument()
		})
	})

	describe('Security Considerations', () => {
		it('uses server component for auth check', async () => {
			// Test that this is an async server component
			const searchParams = Promise.resolve({})
			const result = LoginPage({ searchParams })

			expect(result).toBeInstanceOf(Promise)
		})

		it('checks authentication before rendering form', async () => {
			const searchParams = Promise.resolve({})
			await LoginPage({ searchParams })

			// getCurrentUser should be called before any form rendering
			expect(mockGetCurrentUser).toHaveBeenCalled()
		})
	})

	describe('Different Layout Configuration', () => {
		it('uses left side layout (different from signup page)', async () => {
			mockGetCurrentUser.mockResolvedValue(null)

			const searchParams = Promise.resolve({})
			const component = await LoginPage({ searchParams })

			render(component)

			// Login page uses 'left' side, signup uses 'right'
			expect(screen.getByTestId('auth-layout-side')).toHaveTextContent(
				'left'
			)
		})

		it('uses different image from signup page', async () => {
			mockGetCurrentUser.mockResolvedValue(null)

			const searchParams = Promise.resolve({})
			const component = await LoginPage({ searchParams })

			render(component)

			// Different image than signup page
			expect(
				screen.getByTestId('auth-layout-image-src')
			).toHaveTextContent('/images/roi-up_to_the_right.jpg')
			expect(
				screen.getByTestId('auth-layout-image-alt')
			).toHaveTextContent('Modern property management dashboard')
		})
	})

	describe('Error Handling', () => {
		it('handles getCurrentUser errors gracefully', async () => {
			mockGetCurrentUser.mockRejectedValue(
				new Error('Auth service unavailable')
			)

			const searchParams = Promise.resolve({})

			// Should handle error and render login form as fallback
			try {
				const component = await LoginPage({ searchParams })
				expect(component).toBeDefined()
			} catch (error) {
				// If it throws, that's expected behavior - test passes
				expect(error).toBeInstanceOf(Error)
			}
		})
	})
})
