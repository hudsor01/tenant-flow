/**
 * Tests for Owner Settings Page
 * Task Group 11: Settings Implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'

// Mock next/navigation
vi.mock('next/navigation', () => ({
	useSearchParams: () => ({
		get: vi.fn().mockReturnValue(null)
	}),
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn()
	})
}))

// Mock Supabase client
vi.mock('#utils/supabase/client', () => ({
	createClient: () => ({
		auth: {
			getUser: vi.fn().mockResolvedValue({
				data: { user: { id: 'user-123', email: 'owner@example.com' } },
				error: null
			}),
			updateUser: vi.fn().mockResolvedValue({ error: null }),
			signInWithPassword: vi.fn().mockResolvedValue({ error: null })
		},
		from: vi.fn().mockReturnValue({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: {
							first_name: 'Test',
							last_name: 'Owner',
							email: 'owner@example.com',
							phone: '555-1234'
						},
						error: null
					}),
					maybeSingle: vi.fn().mockResolvedValue({
						data: {
							business_name: 'Test Business',
							business_type: 'individual'
						},
						error: null
					}),
					order: vi.fn().mockReturnValue({
						data: [],
						error: null
					})
				}),
				order: vi.fn().mockResolvedValue({
					data: [],
					error: null
				})
			})
		})
	})
}))

// Mock preferences store
vi.mock('#providers/preferences-provider', () => ({
	usePreferencesStore: vi.fn(selector => {
		const state = {
			themeMode: 'system' as const,
			setThemeMode: vi.fn()
		}
		return selector(state)
	}),
	useDataDensity: () => ({
		dataDensity: 'comfortable' as const,
		setDataDensity: vi.fn()
	})
}))

// Mock billing hooks (subscription status and billing history)
vi.mock('#hooks/api/use-billing', () => ({
	useSubscriptionStatus: () => ({
		data: { subscriptionStatus: 'active' },
		isLoading: false
	}),
	useBillingHistory: () => ({
		data: [
			{
				id: 'inv_123',
				created_at: '2024-01-15',
				amount: 4900,
				status: 'succeeded'
			}
		],
		isLoading: false
	})
}))

// Mock notification settings hooks
vi.mock('#hooks/api/use-owner-notification-settings', () => ({
	useOwnerNotificationSettings: () => ({
		data: {
			email: true,
			sms: false,
			push: true,
			inApp: true,
			categories: {
				maintenance: true,
				leases: true,
				general: true
			}
		},
		isLoading: false
	}),
	useUpdateOwnerNotificationSettingsMutation: () => ({
		mutate: vi.fn(),
		isPending: false
	})
}))

// Mock sessions hook
vi.mock('#hooks/api/use-sessions', () => ({
	useUserSessions: () => ({
		data: [
			{
				id: 'session-1',
				browser: 'Chrome',
				os: 'macOS',
				device: 'desktop',
				is_current: true,
				updated_at: '2024-01-15T10:00:00Z'
			},
			{
				id: 'session-2',
				browser: 'Safari',
				os: 'iOS',
				device: 'mobile',
				is_current: false,
				updated_at: '2024-01-14T15:30:00Z'
			}
		],
		isLoading: false
	}),
	useRevokeSessionMutation: () => ({
		mutate: vi.fn(),
		isPending: false
	})
}))

// Mock MFA hooks
vi.mock('#hooks/api/use-mfa', () => ({
	useMfaStatus: () => ({
		data: { isMfaEnabled: false },
		isLoading: false
	}),
	useMfaFactors: () => ({
		data: [],
		isLoading: false
	})
}))

// Mock 2FA dialogs
vi.mock('#components/auth/two-factor-setup-dialog', () => ({
	TwoFactorSetupDialog: ({ open }: { open: boolean }) =>
		open ? <div data-testid="2fa-setup-dialog">2FA Setup Dialog</div> : null,
	DisableTwoFactorDialog: ({ open }: { open: boolean }) =>
		open ? <div data-testid="2fa-disable-dialog">2FA Disable Dialog</div> : null
}))

// Mock password strength component
vi.mock('#components/auth/password-strength', () => ({
	PasswordStrength: ({
		id,
		placeholder,
		value,
		onChange,
		disabled
	}: {
		id: string
		placeholder: string
		value: string
		onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
		disabled: boolean
	}) => (
		<input
			id={id}
			placeholder={placeholder}
			value={value}
			onChange={onChange}
			disabled={disabled}
			data-testid="password-strength"
		/>
	)
}))

// Mock Stripe Connect hooks
vi.mock('#hooks/api/use-stripe-connect', () => ({
	useConnectedAccount: () => ({
		data: null,
		isLoading: false
	}),
	useCreateConnectedAccountMutation: () => ({
		mutateAsync: vi.fn(),
		isPending: false
	}),
	useRefreshOnboardingMutation: () => ({
		mutateAsync: vi.fn(),
		isPending: false
	})
}))

// Mock api-request
vi.mock('#lib/api-request', () => ({
	apiRequest: vi
		.fn()
		.mockResolvedValue({ url: 'https://billing.stripe.com/session' })
}))

// Mock formatCurrency
vi.mock('#lib/formatters/currency', () => ({
	formatCurrency: (amount: number) => `$${amount.toFixed(2)}`
}))

function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0 },
			mutations: { retry: false }
		}
	})
}

function renderWithProviders(component: React.ReactElement) {
	const queryClient = createTestQueryClient()

	return render(
		<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
	)
}

describe('Settings Page', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('renders settings page with navigation tabs', async () => {
		const SettingsPage = (await import('../page')).default

		renderWithProviders(<SettingsPage />)

		// Check page title
		expect(
			screen.getByRole('heading', { name: 'Settings' })
		).toBeInTheDocument()

		// Check navigation tabs exist
		expect(screen.getByRole('button', { name: /General/i })).toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: /Notifications/i })
		).toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: /Security/i })
		).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /Billing/i })).toBeInTheDocument()
	})

	it('displays General tab content by default', async () => {
		const SettingsPage = (await import('../page')).default

		renderWithProviders(<SettingsPage />)

		// Check for General settings header
		await waitFor(() => {
			expect(
				screen.getByRole('heading', { name: 'General Settings' })
			).toBeInTheDocument()
		})

		// Check for Business Profile section
		expect(screen.getByText('Business Profile')).toBeInTheDocument()
		expect(screen.getByLabelText('Business Name')).toBeInTheDocument()
		expect(screen.getByLabelText('Contact Email')).toBeInTheDocument()
		expect(screen.getByLabelText('Phone Number')).toBeInTheDocument()

		// Check for Preferences section
		expect(screen.getByText('Preferences')).toBeInTheDocument()
		expect(screen.getByText('Theme')).toBeInTheDocument()
		expect(screen.getByText('Data Density')).toBeInTheDocument()
		expect(screen.getByText('Timezone')).toBeInTheDocument()
		expect(screen.getByText('Language')).toBeInTheDocument()
	})

	it('switches to Notifications tab when clicked', async () => {
		const SettingsPage = (await import('../page')).default
		const user = userEvent.setup()

		renderWithProviders(<SettingsPage />)

		// Click on Notifications tab
		const notificationsTab = screen.getByRole('button', {
			name: /Notifications/i
		})
		await user.click(notificationsTab)

		// Check for Notification Settings content
		await waitFor(() => {
			expect(
				screen.getByRole('heading', { name: 'Notification Settings' })
			).toBeInTheDocument()
		})

		// Check for notification channels
		expect(screen.getByText('Email Notifications')).toBeInTheDocument()
		expect(screen.getByText('SMS Notifications')).toBeInTheDocument()
		expect(screen.getByText('Push Notifications')).toBeInTheDocument()
		expect(screen.getByText('In-App Notifications')).toBeInTheDocument()

		// Check for notification categories
		expect(screen.getByText('Notification Categories')).toBeInTheDocument()
		expect(screen.getByText('Maintenance Requests')).toBeInTheDocument()
		expect(screen.getByText('Lease Updates')).toBeInTheDocument()
		expect(screen.getByText('General Notifications')).toBeInTheDocument()
	})

	it('switches to Security tab when clicked', async () => {
		const SettingsPage = (await import('../page')).default
		const user = userEvent.setup()

		renderWithProviders(<SettingsPage />)

		// Click on Security tab
		const securityTab = screen.getByRole('button', { name: /Security/i })
		await user.click(securityTab)

		// Check for Security Settings content
		await waitFor(() => {
			expect(
				screen.getByRole('heading', { name: 'Security Settings' })
			).toBeInTheDocument()
		})

		// Check for Password section
		expect(screen.getByText('Password')).toBeInTheDocument()
		expect(screen.getByLabelText('Current Password')).toBeInTheDocument()
		expect(screen.getByLabelText('New Password')).toBeInTheDocument()
		expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument()

		// Check for 2FA section
		expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument()
		expect(screen.getByText('2FA is Not Enabled')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /Enable/i })).toBeInTheDocument()

		// Check for Active Sessions section
		expect(screen.getByText('Active Sessions')).toBeInTheDocument()
	})

	it('switches to Billing tab when clicked', async () => {
		const SettingsPage = (await import('../page')).default
		const user = userEvent.setup()

		renderWithProviders(<SettingsPage />)

		// Click on Billing tab
		const billingTab = screen.getByRole('button', { name: /Billing/i })
		await user.click(billingTab)

		// Check for Billing Settings content
		await waitFor(() => {
			expect(
				screen.getByRole('heading', { name: 'Billing & Subscription' })
			).toBeInTheDocument()
		})

		// Check for Current Plan section
		expect(screen.getByText('Current Plan')).toBeInTheDocument()
		expect(screen.getByText('Professional')).toBeInTheDocument()
		expect(screen.getByText('Active')).toBeInTheDocument()

		// Check for Payment Method section
		expect(screen.getByText('Payment Method')).toBeInTheDocument()

		// Check for Billing History section
		expect(screen.getByText('Billing History')).toBeInTheDocument()

		// Check for Danger Zone
		expect(screen.getByText('Danger Zone')).toBeInTheDocument()
	})

	it('displays active sessions with current session badge', async () => {
		const SettingsPage = (await import('../page')).default
		const user = userEvent.setup()

		renderWithProviders(<SettingsPage />)

		// Navigate to Security tab
		const securityTab = screen.getByRole('button', { name: /Security/i })
		await user.click(securityTab)

		await waitFor(() => {
			expect(screen.getByText('Active Sessions')).toBeInTheDocument()
		})

		// Check for current session
		expect(screen.getByText(/Chrome on macOS/)).toBeInTheDocument()
		expect(screen.getByText('Current')).toBeInTheDocument()

		// Check for other session
		expect(screen.getByText(/Safari on iOS/)).toBeInTheDocument()
	})

	it('opens 2FA setup dialog when Enable button is clicked', async () => {
		const SettingsPage = (await import('../page')).default
		const user = userEvent.setup()

		renderWithProviders(<SettingsPage />)

		// Navigate to Security tab
		const securityTab = screen.getByRole('button', { name: /Security/i })
		await user.click(securityTab)

		await waitFor(() => {
			expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument()
		})

		// Click Enable 2FA button
		const enableButton = screen.getByRole('button', { name: /Enable/i })
		await user.click(enableButton)

		// Check that dialog is shown
		await waitFor(() => {
			expect(screen.getByTestId('2fa-setup-dialog')).toBeInTheDocument()
		})
	})

	it('shows password match validation feedback', async () => {
		const SettingsPage = (await import('../page')).default
		const user = userEvent.setup()

		renderWithProviders(<SettingsPage />)

		// Navigate to Security tab
		const securityTab = screen.getByRole('button', { name: /Security/i })
		await user.click(securityTab)

		await waitFor(() => {
			expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument()
		})

		// Type in passwords
		const newPasswordInput = screen.getByTestId('password-strength')
		const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

		await user.type(newPasswordInput, 'Password123!')
		await user.type(confirmPasswordInput, 'Different456!')

		// Check for mismatch message
		await waitFor(() => {
			expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
		})
	})

	it('displays subscription information in Billing tab', async () => {
		const SettingsPage = (await import('../page')).default
		const user = userEvent.setup()

		renderWithProviders(<SettingsPage />)

		// Navigate to Billing tab
		const billingTab = screen.getByRole('button', { name: /Billing/i })
		await user.click(billingTab)

		await waitFor(() => {
			expect(screen.getByText('Professional')).toBeInTheDocument()
		})

		// Check subscription details
		expect(screen.getByText('$49')).toBeInTheDocument()
		expect(screen.getByText('/month')).toBeInTheDocument()
		expect(screen.getByText(/Up to 50 units/)).toBeInTheDocument()
	})

	it('has proper touch targets for mobile responsiveness', async () => {
		const SettingsPage = (await import('../page')).default

		renderWithProviders(<SettingsPage />)

		// Check that navigation buttons have min-h-11 (44px touch targets)
		const navButtons = screen
			.getAllByRole('button')
			.filter(button =>
				['General', 'Notifications', 'Security', 'Billing'].some(label =>
					button.textContent?.includes(label)
				)
			)

		navButtons.forEach(button => {
			expect(button.className).toContain('min-h-11')
		})
	})

	it('uses semantic color tokens for status badges', async () => {
		const SettingsPage = (await import('../page')).default
		const user = userEvent.setup()

		renderWithProviders(<SettingsPage />)

		// Navigate to Billing tab
		const billingTab = screen.getByRole('button', { name: /Billing/i })
		await user.click(billingTab)

		await waitFor(() => {
			const activeBadge = screen.getByText('Active')
			// Check that the badge uses emerald color scheme for success state
			expect(activeBadge.className).toContain('bg-emerald')
		})
	})
})

describe('Settings Page - Light/Dark Mode', () => {
	it('respects theme preference from preferences store', async () => {
		const SettingsPage = (await import('../page')).default

		renderWithProviders(<SettingsPage />)

		await waitFor(() => {
			// The theme select should show the current preference
			expect(screen.getByText('Theme')).toBeInTheDocument()
		})

		// There should be at least one combobox (Select) in the settings
		const comboboxes = screen.getAllByRole('combobox')
		expect(comboboxes.length).toBeGreaterThan(0)
	})
})

describe('Settings Page - Mobile Responsiveness', () => {
	it('navigation tabs stack horizontally on mobile', async () => {
		const SettingsPage = (await import('../page')).default

		renderWithProviders(<SettingsPage />)

		// Check that the nav container uses flex with overflow for mobile
		const nav = screen.getByRole('navigation')
		expect(nav).toBeInTheDocument()

		// Check the nav has proper classes for mobile horizontal scroll
		const navContainer = nav.querySelector('.flex')
		expect(navContainer).toBeInTheDocument()
	})

	it('page has proper padding for different screen sizes', async () => {
		const SettingsPage = (await import('../page')).default

		const { container } = renderWithProviders(<SettingsPage />)

		// Check that the main container uses spacing utilities
		const mainContainer = container.querySelector('.space-y-6')
		expect(mainContainer).toBeInTheDocument()
	})
})
