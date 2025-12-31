/**
 * LeaseSignatureStatus Component Tests
 * Tests the signature status display component in various states
 *
 * @jest-environment jsdom
 */

import { screen } from '@testing-library/react'
import { render } from '#test/utils/test-render'
import { LeaseSignatureStatus } from '../lease-signature-status'
import type { SignatureStatus } from '#hooks/api/queries/lease-queries'
import { vi } from 'vitest'

// Mock the hook
const mockUseLeaseSignatureStatus = vi.fn()

vi.mock('#hooks/api/use-lease', () => ({
	useLeaseSignatureStatus: (leaseId: string) =>
		mockUseLeaseSignatureStatus(leaseId)
}))

const mockLeaseId = 'lease-123'

// Mock data for different signature states
const mockDraftStatus: SignatureStatus = {
	lease_id: mockLeaseId,
	status: 'draft',
	owner_signed: false,
	owner_signed_at: null,
	tenant_signed: false,
	tenant_signed_at: null,
	sent_for_signature_at: null,
	both_signed: false
}

const mockPendingStatus: SignatureStatus = {
	lease_id: mockLeaseId,
	status: 'pending_signature',
	owner_signed: false,
	owner_signed_at: null,
	tenant_signed: false,
	tenant_signed_at: null,
	sent_for_signature_at: '2024-01-15T10:00:00Z',
	both_signed: false
}

const mockOwnerSignedStatus: SignatureStatus = {
	lease_id: mockLeaseId,
	status: 'pending_signature',
	owner_signed: true,
	owner_signed_at: '2024-01-16T14:30:00Z',
	tenant_signed: false,
	tenant_signed_at: null,
	sent_for_signature_at: '2024-01-15T10:00:00Z',
	both_signed: false
}

const mockTenantSignedStatus: SignatureStatus = {
	lease_id: mockLeaseId,
	status: 'pending_signature',
	owner_signed: false,
	owner_signed_at: null,
	tenant_signed: true,
	tenant_signed_at: '2024-01-17T09:15:00Z',
	sent_for_signature_at: '2024-01-15T10:00:00Z',
	both_signed: false
}

const mockFullySignedStatus: SignatureStatus = {
	lease_id: mockLeaseId,
	status: 'active',
	owner_signed: true,
	owner_signed_at: '2024-01-16T14:30:00Z',
	tenant_signed: true,
	tenant_signed_at: '2024-01-17T09:15:00Z',
	sent_for_signature_at: '2024-01-15T10:00:00Z',
	both_signed: true
}

describe('LeaseSignatureStatus', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Loading State', () => {
		test('renders skeleton when loading', () => {
			mockUseLeaseSignatureStatus.mockReturnValue({
				data: undefined,
				isLoading: true,
				error: null
			})

			const { container } = render(
				<LeaseSignatureStatus leaseId={mockLeaseId} />
			)

			// Should show skeleton elements (has animate-pulse class from Skeleton component)
			const skeletons = container.querySelectorAll(
				'[data-slot="skeleton"], .animate-pulse'
			)
			expect(skeletons.length).toBeGreaterThan(0)
		})

		test('renders compact skeleton when loading in compact mode', () => {
			mockUseLeaseSignatureStatus.mockReturnValue({
				data: undefined,
				isLoading: true,
				error: null
			})

			const { container } = render(
				<LeaseSignatureStatus leaseId={mockLeaseId} compact />
			)

			// Compact skeleton should be visible (has animate-pulse class)
			const skeletons = container.querySelectorAll(
				'[data-slot="skeleton"], .animate-pulse'
			)
			expect(skeletons.length).toBeGreaterThan(0)
		})
	})

	describe('Error State', () => {
		test('renders error message when there is an error', () => {
			mockUseLeaseSignatureStatus.mockReturnValue({
				data: undefined,
				isLoading: false,
				error: new Error('Failed to fetch')
			})

			render(<LeaseSignatureStatus leaseId={mockLeaseId} />)

			expect(
				screen.getByText(/unable to load signature status/i)
			).toBeInTheDocument()
			expect(screen.getByTestId('signature-status-error')).toBeInTheDocument()
		})

		test('applies destructive border class on error', () => {
			mockUseLeaseSignatureStatus.mockReturnValue({
				data: undefined,
				isLoading: false,
				error: new Error('Failed to fetch')
			})

			render(<LeaseSignatureStatus leaseId={mockLeaseId} />)

			const errorCard = screen.getByTestId('signature-status-error')
			expect(errorCard).toHaveClass('border-destructive/50')
		})
	})

	describe('Empty State', () => {
		test('returns null when no status data', () => {
			mockUseLeaseSignatureStatus.mockReturnValue({
				data: undefined,
				isLoading: false,
				error: null
			})

			const { container } = render(
				<LeaseSignatureStatus leaseId={mockLeaseId} />
			)

			expect(container.firstChild).toBeNull()
		})
	})

	describe('Draft Status', () => {
		test('displays draft status correctly', () => {
			mockUseLeaseSignatureStatus.mockReturnValue({
				data: mockDraftStatus,
				isLoading: false,
				error: null
			})

			render(<LeaseSignatureStatus leaseId={mockLeaseId} />)

			expect(screen.getByText(/draft - not sent/i)).toBeInTheDocument()
		})

		test('shows pending badges for both parties in draft', () => {
			mockUseLeaseSignatureStatus.mockReturnValue({
				data: mockDraftStatus,
				isLoading: false,
				error: null
			})

			render(<LeaseSignatureStatus leaseId={mockLeaseId} />)

			// Both should show "Pending" text
			const pendingTexts = screen.getAllByText(/pending/i)
			expect(pendingTexts.length).toBe(2) // Owner and Tenant pending
		})
	})

	describe('Pending Signature Status', () => {
		test('displays awaiting signatures when sent but neither signed', () => {
			mockUseLeaseSignatureStatus.mockReturnValue({
				data: mockPendingStatus,
				isLoading: false,
				error: null
			})

			render(<LeaseSignatureStatus leaseId={mockLeaseId} />)

			expect(screen.getByText(/awaiting signatures/i)).toBeInTheDocument()
		})

		test('shows sent for signature date', () => {
			mockUseLeaseSignatureStatus.mockReturnValue({
				data: mockPendingStatus,
				isLoading: false,
				error: null
			})

			render(<LeaseSignatureStatus leaseId={mockLeaseId} />)

			expect(screen.getByText(/sent for signature on/i)).toBeInTheDocument()
		})
	})

	describe('Owner Signed Status', () => {
		test('displays awaiting tenant signature when owner has signed', () => {
			mockUseLeaseSignatureStatus.mockReturnValue({
				data: mockOwnerSignedStatus,
				isLoading: false,
				error: null
			})

			render(<LeaseSignatureStatus leaseId={mockLeaseId} />)

			expect(screen.getByText(/awaiting tenant signature/i)).toBeInTheDocument()
		})

		test('shows owner signed date', () => {
			mockUseLeaseSignatureStatus.mockReturnValue({
				data: mockOwnerSignedStatus,
				isLoading: false,
				error: null
			})

			render(<LeaseSignatureStatus leaseId={mockLeaseId} />)

			// Should display "Signed" with date for owner
			const ownerRow = screen.getByText(/owner signature/i).closest('div')
			expect(ownerRow).toHaveTextContent(/signed/i)
		})
	})

	describe('Tenant Signed Status', () => {
		test('displays awaiting owner signature when tenant has signed', () => {
			mockUseLeaseSignatureStatus.mockReturnValue({
				data: mockTenantSignedStatus,
				isLoading: false,
				error: null
			})

			render(<LeaseSignatureStatus leaseId={mockLeaseId} />)

			expect(screen.getByText(/awaiting owner signature/i)).toBeInTheDocument()
		})

		test('shows tenant signed date', () => {
			mockUseLeaseSignatureStatus.mockReturnValue({
				data: mockTenantSignedStatus,
				isLoading: false,
				error: null
			})

			render(<LeaseSignatureStatus leaseId={mockLeaseId} />)

			// Should display "Signed" with date for tenant
			const tenantRow = screen.getByText(/tenant signature/i).closest('div')
			expect(tenantRow).toHaveTextContent(/signed/i)
		})
	})

	describe('Fully Signed Status', () => {
		test('displays fully signed when both parties have signed', () => {
			mockUseLeaseSignatureStatus.mockReturnValue({
				data: mockFullySignedStatus,
				isLoading: false,
				error: null
			})

			render(<LeaseSignatureStatus leaseId={mockLeaseId} />)

			expect(screen.getByText(/fully signed/i)).toBeInTheDocument()
		})

		test('shows green badge for fully signed status', () => {
			mockUseLeaseSignatureStatus.mockReturnValue({
				data: mockFullySignedStatus,
				isLoading: false,
				error: null
			})

			render(<LeaseSignatureStatus leaseId={mockLeaseId} />)

			// The badge should have green background class
			const badge = screen.getByText(/fully signed/i)
			expect(badge).toHaveClass('bg-success')
		})

		test('shows both signature dates', () => {
			mockUseLeaseSignatureStatus.mockReturnValue({
				data: mockFullySignedStatus,
				isLoading: false,
				error: null
			})

			render(<LeaseSignatureStatus leaseId={mockLeaseId} />)

			// Both rows should show "Signed" text
			const signedTexts = screen.getAllByText(/^signed/i)
			expect(signedTexts.length).toBe(2)
		})
	})

	describe('Compact Mode', () => {
		test('renders compact view with badges', () => {
			mockUseLeaseSignatureStatus.mockReturnValue({
				data: mockOwnerSignedStatus,
				isLoading: false,
				error: null
			})

			render(<LeaseSignatureStatus leaseId={mockLeaseId} compact />)

			// Should show Owner and Tenant badges
			expect(screen.getByText('Owner')).toBeInTheDocument()
			expect(screen.getByText('Tenant')).toBeInTheDocument()
		})

		test('compact mode shows correct styling for signed/unsigned', () => {
			mockUseLeaseSignatureStatus.mockReturnValue({
				data: mockOwnerSignedStatus,
				isLoading: false,
				error: null
			})

			render(<LeaseSignatureStatus leaseId={mockLeaseId} compact />)

			// Owner badge (signed) should have green background - Badge component is a span
			const ownerText = screen.getByText('Owner')
			// Find the badge by traversing up to the span element
			const ownerBadge = ownerText.closest('span')
			expect(ownerBadge).toHaveClass('bg-success')
		})
	})

	describe('Custom className', () => {
		test('applies custom className to container', () => {
			mockUseLeaseSignatureStatus.mockReturnValue({
				data: mockDraftStatus,
				isLoading: false,
				error: null
			})

			render(
				<LeaseSignatureStatus leaseId={mockLeaseId} className="custom-class" />
			)

			const card = screen.getByTestId('signature-status')
			expect(card).toHaveClass('custom-class')
		})
	})

	describe('Accessibility', () => {
		test('has proper heading structure', () => {
			mockUseLeaseSignatureStatus.mockReturnValue({
				data: mockPendingStatus,
				isLoading: false,
				error: null
			})

			render(<LeaseSignatureStatus leaseId={mockLeaseId} />)

			expect(screen.getByText(/signature status/i)).toBeInTheDocument()
		})

		test('signature badges have title attribute with date', () => {
			mockUseLeaseSignatureStatus.mockReturnValue({
				data: mockFullySignedStatus,
				isLoading: false,
				error: null
			})

			render(<LeaseSignatureStatus leaseId={mockLeaseId} compact />)

			// Badges should have title with signed date
			const ownerBadge = screen.getByText('Owner')
			expect(ownerBadge).toHaveAttribute('title')
		})
	})
})
