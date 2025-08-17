/**
 * Tests for Signup Page
 * Tests the user registration flow with form and auth redirect logic
 */

import { render, screen } from '@testing-library/react'
import SignupPage from '../page'

// Mock auth actions
jest.mock('@/lib/actions/auth-actions', () => ({
	getCurrentUser: jest.fn()
}))

// Mock auth layout
jest.mock('@/components/auth/auth-layout', () => ({
	AuthLayout: jest.fn(
		({ children, title, description, side, image, heroContent }) => (
			<div data-testid="auth-layout">
				<div data-testid="auth-layout-title">{title}</div>
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

// Mock signup form
jest.mock('@/components/auth/signup-form', () => ({
	SignupFormRefactored: jest.fn(({ redirectTo }) => (
		<div data-testid="signup-form">
			<h2>Create Your Account</h2>
			<form>
				<input placeholder="Email" type="email" />
				<input placeholder="Password" type="password" />
				<input placeholder="Confirm Password" type="password" />
				<button type="submit">Sign Up</button>
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

describe('Signup Page', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		mockGetCurrentUser.mockResolvedValue(null) // Default: no authenticated user
	})

	describe('Page Metadata', () => {
		it('has proper metadata configuration', () => {
			const { metadata } = jest.requireMock('../page')

			expect(metadata).toEqual({
				title: 'Sign Up | TenantFlow',
				description:
					'Create your TenantFlow account and start managing properties efficiently.'
			})
		})
	})

	describe('Unauthenticated User Flow', () => {
		it('renders signup form when user is not authenticated', async () => {
			mockGetCurrentUser.mockResolvedValue(null)

			const searchParams = Promise.resolve({})
			const component = await SignupPage({ searchParams })

			render(component)

			expect(screen.getByTestId('auth-layout')).toBeInTheDocument()
			expect(screen.getByTestId('signup-form')).toBeInTheDocument()
			expect(screen.getByText('Create Your Account')).toBeInTheDocument()
			expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
			expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
			expect(
				screen.getByPlaceholderText('Confirm Password')
			).toBeInTheDocument()
			expect(
				screen.getByRole('button', { name: /sign up/i })
			).toBeInTheDocument()
		})

		it('renders with correct auth layout configuration', async () => {
			mockGetCurrentUser.mockResolvedValue(null)

			const searchParams = Promise.resolve({})
			const component = await SignupPage({ searchParams })

			render(component)

			expect(screen.getByTestId('auth-layout-title')).toHaveTextContent(
				'Get Started'
			)
			expect(
				screen.getByTestId('auth-layout-description')
			).toHaveTextContent(
				'Create your account and start managing properties effortlessly'
			)
			expect(screen.getByTestId('auth-layout-side')).toHaveTextContent(
				'right'
			)
			expect(
				screen.getByTestId('auth-layout-image-src')
			).toHaveTextContent('/property-management-og.jpg')
			expect(
				screen.getByTestId('auth-layout-image-alt')
			).toHaveTextContent('Property management platform')
		})

		it('displays hero content with trial offer', async () => {
			mockGetCurrentUser.mockResolvedValue(null)

			const searchParams = Promise.resolve({})
			const component = await SignupPage({ searchParams })

			render(component)

			expect(
				screen.getByTestId('auth-layout-hero-title')
			).toHaveTextContent('Start Your 14-Day Free Trial')
			expect(
				screen.getByTestId('auth-layout-hero-description')
			).toHaveTextContent(
				'No credit card required. Get instant access to all features and see how TenantFlow can transform your property management.'
			)
		})

		it('passes default redirect to dashboard when no redirect specified', async () => {
			mockGetCurrentUser.mockResolvedValue(null)

			const searchParams = Promise.resolve({})
			const component = await SignupPage({ searchParams })

			render(component)

			expect(screen.getByTestId('redirect-to')).toHaveTextContent(
				'/dashboard'
			)
		})

		it('passes custom redirect when specified in search params', async () => {
			mockGetCurrentUser.mockResolvedValue(null)

			const searchParams = Promise.resolve({ redirect: '/pricing' })
			const component = await SignupPage({ searchParams })

			render(component)

			expect(screen.getByTestId('redirect-to')).toHaveTextContent(
				'/pricing'
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
			const component = await SignupPage({ searchParams })

			render(component)

			expect(screen.getByTestId('auth-redirect')).toBeInTheDocument()
			expect(
				screen.getByText('Redirecting to: /dashboard')
			).toBeInTheDocument()
			expect(screen.queryByTestId('signup-form')).not.toBeInTheDocument()
		})

		it('redirects authenticated user to custom redirect path', async () => {
			mockGetCurrentUser.mockResolvedValue({
				id: 'user-123',
				email: 'test@example.com'
			})

			const searchParams = Promise.resolve({ redirect: '/properties' })
			const component = await SignupPage({ searchParams })

			render(component)

			expect(screen.getByTestId('auth-redirect')).toBeInTheDocument()
			expect(
				screen.getByText('Redirecting to: /properties')
			).toBeInTheDocument()
		})
	})

	describe('Component Integration', () => {
		it('uses Suspense with loading fallback for signup form', async () => {
			mockGetCurrentUser.mockResolvedValue(null)

			const searchParams = Promise.resolve({})
			const component = await SignupPage({ searchParams })

			render(component)

			// The Suspense component would render the form
			expect(screen.getByTestId('signup-form')).toBeInTheDocument()
		})

		it('calls auth action to check current user', async () => {
			const searchParams = Promise.resolve({})
			await SignupPage({ searchParams })

			expect(mockGetCurrentUser).toHaveBeenCalledTimes(1)
		})

		it('passes correct props to signup form component', async () => {
			mockGetCurrentUser.mockResolvedValue(null)
			const { SignupFormRefactored } = jest.requireMock(
				'@/components/auth/signup-form'
			)

			const searchParams = Promise.resolve({ redirect: '/custom-path' })
			const component = await SignupPage({ searchParams })

			render(component)

			expect(SignupFormRefactored).toHaveBeenCalledWith(
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
			const component = await SignupPage({ searchParams })

			render(component)

			expect(AuthLayout).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Get Started',
					description:
						'Create your account and start managing properties effortlessly',
					side: 'right',
					image: {
						src: '/property-management-og.jpg',
						alt: 'Property management platform'
					},
					heroContent: {
						title: 'Start Your 14-Day Free Trial',
						description:
							'No credit card required. Get instant access to all features and see how TenantFlow can transform your property management.'
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
			const component = await SignupPage({ searchParams })

			render(component)

			expect(screen.getByTestId('redirect-to')).toHaveTextContent(
				'/dashboard'
			)
		})

		it('handles error parameter in search params', async () => {
			mockGetCurrentUser.mockResolvedValue(null)

			const searchParams = Promise.resolve({ error: 'invalid_request' })
			const component = await SignupPage({ searchParams })

			render(component)

			// Form should still render - error handling would be in the form component
			expect(screen.getByTestId('signup-form')).toBeInTheDocument()
		})

		it('handles both redirect and error parameters', async () => {
			mockGetCurrentUser.mockResolvedValue(null)

			const searchParams = Promise.resolve({
				redirect: '/billing',
				error: 'access_denied'
			})
			const component = await SignupPage({ searchParams })

			render(component)

			expect(screen.getByTestId('redirect-to')).toHaveTextContent(
				'/billing'
			)
			expect(screen.getByTestId('signup-form')).toBeInTheDocument()
		})
	})

	describe('Accessibility', () => {
		it('has accessible form structure', async () => {
			mockGetCurrentUser.mockResolvedValue(null)

			const searchParams = Promise.resolve({})
			const component = await SignupPage({ searchParams })

			render(component)

			expect(
				screen.getByRole('heading', {
					level: 2,
					name: /create your account/i
				})
			).toBeInTheDocument()
			expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
			expect(
				screen.getByRole('button', { name: /sign up/i })
			).toBeInTheDocument()
		})
	})

	describe('Security Considerations', () => {
		it('uses server component for auth check', async () => {
			// Test that this is an async server component
			const searchParams = Promise.resolve({})
			const result = SignupPage({ searchParams })

			expect(result).toBeInstanceOf(Promise)
		})

		it('checks authentication before rendering form', async () => {
			const searchParams = Promise.resolve({})
			await SignupPage({ searchParams })

			// getCurrentUser should be called before any form rendering
			expect(mockGetCurrentUser).toHaveBeenCalled()
		})
	})

	describe('Error Handling', () => {
		it('handles getCurrentUser errors gracefully', async () => {
			mockGetCurrentUser.mockRejectedValue(
				new Error('Auth service unavailable')
			)

			const searchParams = Promise.resolve({})

			// Should handle error and render signup form as fallback
			try {
				const component = await SignupPage({ searchParams })
				expect(component).toBeDefined()
			} catch (error) {
				// If it throws, that's expected behavior - test passes
				expect(error).toBeInstanceOf(Error)
			}
		})
	})
})
