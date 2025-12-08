/**
 * Payments Page Autopay CTA Tests
 *
 * These tests verify that the payments page displays a prominent autopay status
 * and setup/manage CTA as specified in Requirements 7.1, 7.2
 *
 * Requirements covered:
 * - 7.1: Prominent autopay status display
 * - 7.2: Clear setup/manage autopay CTA
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the hooks
const mockUseTenantPaymentsHistory = vi.fn()
const mockUseTenantAutopayStatus = vi.fn()

vi.mock('#hooks/api/use-tenant-payments', () => ({
	useTenantPaymentsHistory: () => mockUseTenantPaymentsHistory()
}))

vi.mock('#hooks/api/use-tenant-portal', () => ({
	useTenantAutopayStatus: () => mockUseTenantAutopayStatus()
}))

vi.mock('next/navigation', () => ({
	useRouter: vi.fn(() => ({ push: vi.fn() })),
	usePathname: vi.fn(() => '/tenant/payments')
}))

// Import after mocks
import TenantPaymentsPage from '../page'

describe('Payments Page Autopay CTA (Requirements 7.1, 7.2)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockUseTenantPaymentsHistory.mockReturnValue({
			data: { payments: [] },
			isLoading: false
		})
	})

	it('should display autopay status section prominently', () => {
		mockUseTenantAutopayStatus.mockReturnValue({
			data: {
				autopayEnabled: true,
				subscriptionId: 'sub_123'
			},
			isLoading: false
		})

		render(<TenantPaymentsPage />)

		// Should have a prominent autopay status section
		const autopaySection = screen.getByTestId('autopay-status-section')
		expect(autopaySection).toBeInTheDocument()
	})

	it('should show "Autopay Active" status when autopay is enabled', () => {
		mockUseTenantAutopayStatus.mockReturnValue({
			data: {
				autopayEnabled: true,
				subscriptionId: 'sub_123'
			},
			isLoading: false
		})

		render(<TenantPaymentsPage />)

		expect(screen.getByText(/Autopay Active/i)).toBeInTheDocument()
	})

	it('should show "Manage Autopay" CTA when autopay is enabled', () => {
		mockUseTenantAutopayStatus.mockReturnValue({
			data: {
				autopayEnabled: true,
				subscriptionId: 'sub_123'
			},
			isLoading: false
		})

		render(<TenantPaymentsPage />)

		const manageButton = screen.getByRole('link', { name: /Manage Autopay/i })
		expect(manageButton).toBeInTheDocument()
		expect(manageButton).toHaveAttribute('href', '/tenant/payments/autopay')
	})

	it('should show "Setup Autopay" CTA when autopay is disabled', () => {
		mockUseTenantAutopayStatus.mockReturnValue({
			data: {
				autopayEnabled: false,
				subscriptionId: null
			},
			isLoading: false
		})

		render(<TenantPaymentsPage />)

		const setupButton = screen.getByRole('link', { name: /Setup Autopay/i })
		expect(setupButton).toBeInTheDocument()
		expect(setupButton).toHaveAttribute('href', '/tenant/payments/autopay')
	})

	it('should show "Autopay Not Set Up" status when autopay is disabled', () => {
		mockUseTenantAutopayStatus.mockReturnValue({
			data: {
				autopayEnabled: false,
				subscriptionId: null
			},
			isLoading: false
		})

		render(<TenantPaymentsPage />)

		expect(screen.getByText(/Autopay Not Set Up/i)).toBeInTheDocument()
	})

	it('should not show autopay section while loading', () => {
		mockUseTenantAutopayStatus.mockReturnValue({
			data: undefined,
			isLoading: true
		})

		render(<TenantPaymentsPage />)

		const autopaySection = screen.queryByTestId('autopay-status-section')
		expect(autopaySection).not.toBeInTheDocument()
	})

	it('should not show autopay section when data is null', () => {
		mockUseTenantAutopayStatus.mockReturnValue({
			data: null,
			isLoading: false
		})

		render(<TenantPaymentsPage />)

		const autopaySection = screen.queryByTestId('autopay-status-section')
		expect(autopaySection).not.toBeInTheDocument()
	})
})
