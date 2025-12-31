'use client'

import { createPortal } from 'react-dom'
import { useEffect, useCallback } from 'react'
import {
	X,
	Mail,
	Phone,
	MapPin,
	CreditCard,
	Clock,
	AlertTriangle,
	Check,
	ChevronRight
} from 'lucide-react'
import { Button } from '#components/ui/button'
import type {
	TenantDetail,
	PaymentHistoryItem
} from '@repo/shared/types/sections/tenants'

// ============================================================================
// TYPES
// ============================================================================

interface TenantDetailSheetProps {
	tenant: TenantDetail | null
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	onEdit: (tenantId: string) => void
	onContact: (tenantId: string, method: 'email' | 'phone') => void
	onViewLease: (leaseId: string) => void
	onViewPaymentHistory: (tenantId: string) => void
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCurrency(cents: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD'
	}).format(cents / 100)
}

function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	})
}

// ============================================================================
// PAYMENT STATUS INDICATOR
// ============================================================================

function PaymentStatusIcon({
	status
}: {
	status: PaymentHistoryItem['status']
}) {
	switch (status) {
		case 'succeeded':
			return <Check className="w-4 h-4 text-emerald-500" />
		case 'pending':
		case 'processing':
			return <Clock className="w-4 h-4 text-amber-500" />
		case 'failed':
		case 'canceled':
			return <AlertTriangle className="w-4 h-4 text-red-500" />
		default:
			return null
	}
}

// ============================================================================
// MAIN SHEET COMPONENT
// Styled to match @intentui/sheet aesthetic
// ============================================================================

export function TenantDetailSheet({
	tenant,
	isOpen,
	onOpenChange,
	onEdit,
	onContact,
	onViewLease,
	onViewPaymentHistory
}: TenantDetailSheetProps) {
	// Handle escape key
	const handleEscape = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onOpenChange(false)
			}
		},
		[onOpenChange]
	)

	useEffect(() => {
		if (isOpen) {
			document.addEventListener('keydown', handleEscape)
			document.body.style.overflow = 'hidden'
		}
		return () => {
			document.removeEventListener('keydown', handleEscape)
			document.body.style.overflow = ''
		}
	}, [isOpen, handleEscape])

	if (!isOpen || !tenant) return null
	if (typeof window === 'undefined') return null

	return createPortal(
		<>
			{/* Overlay */}
			<div
				className="fixed inset-0 z-50 bg-black/15 entering:fade-in entering:animate-in entering:duration-500 exiting:fade-out exiting:animate-out exiting:duration-300"
				onClick={() => onOpenChange(false)}
			/>

			{/* Sheet */}
			<div
				role="dialog"
				aria-label={`${tenant.fullName} tenant profile`}
				className="fixed inset-y-2 right-2 z-50 h-auto w-3/4 overflow-y-auto rounded-lg border-l ring ring-fg/5 bg-overlay text-overlay-fg shadow-lg sm:max-w-80 entering:slide-in-from-right entering:fade-in entering:animate-in entering:duration-500 exiting:slide-out-to-right-80 exiting:fade-in exiting:animate-out exiting:duration-300 flex flex-col"
				style={{ maxWidth: '28rem' }}
			>
				{/* Header */}
				<div className="relative space-y-1 p-6 pb-3">
					<h2 className="text-balance font-semibold text-fg text-lg/6 sm:text-base/6">
						{tenant.fullName}
					</h2>
					<p className="text-pretty text-base/6 text-muted-fg sm:text-sm/6">
						Tenant Profile
					</p>
					<button
						aria-label="Close"
						onClick={() => onOpenChange(false)}
						className="absolute top-2 right-2 z-50 grid size-8 place-content-center rounded-xl hover:bg-secondary focus:bg-secondary focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary sm:top-2 sm:right-2 sm:size-7 sm:rounded-md"
					>
						<X className="size-4" />
					</button>
				</div>

				{/* Body - Scrollable */}
				<div className="isolate flex min-h-0 flex-1 flex-col overflow-auto px-6 py-1 space-y-6">
					{/* Contact Information */}
					<section>
						<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
							Contact Information
						</h3>
						<div className="space-y-3">
							<button
								onClick={() => onContact(tenant.id, 'email')}
								className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted transition-colors"
							>
								<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
									<Mail className="w-4 h-4 text-primary" />
								</div>
								<div className="text-left">
									<p className="text-sm font-medium text-foreground">
										{tenant.email}
									</p>
									<p className="text-xs text-muted-foreground">Email</p>
								</div>
							</button>
							{tenant.phone && (
								<button
									onClick={() => onContact(tenant.id, 'phone')}
									className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted transition-colors"
								>
									<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
										<Phone className="w-4 h-4 text-primary" />
									</div>
									<div className="text-left">
										<p className="text-sm font-medium text-foreground">
											{tenant.phone}
										</p>
										<p className="text-xs text-muted-foreground">Phone</p>
									</div>
								</button>
							)}
						</div>
					</section>

					{/* Current Lease */}
					{tenant.currentLease && (
						<section>
							<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
								Current Lease
							</h3>
							<button
								onClick={() => onViewLease(tenant.currentLease!.id)}
								className="w-full p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all text-left group"
							>
								<div className="flex items-start justify-between mb-2">
									<div className="flex items-center gap-2">
										<MapPin className="w-4 h-4 text-muted-foreground" />
										<span className="font-medium text-foreground">
											{tenant.currentLease.propertyName}
										</span>
									</div>
									<ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
								</div>
								<p className="text-sm text-muted-foreground mb-2">
									Unit {tenant.currentLease.unitNumber}
								</p>
								<div className="flex items-center gap-4 text-sm">
									<span className="text-foreground font-medium">
										{formatCurrency(tenant.currentLease.rentAmount)}/mo
									</span>
									<span className="text-muted-foreground">
										{formatDate(tenant.currentLease.startDate)} —{' '}
										{tenant.currentLease.endDate ? formatDate(tenant.currentLease.endDate) : 'Ongoing'}
									</span>
								</div>
								{tenant.currentLease.autopayEnabled && (
									<div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
										<CreditCard className="w-3 h-3" />
										Autopay enabled
									</div>
								)}
							</button>
						</section>
					)}

					{/* Emergency Contact */}
					{tenant.emergencyContactName && (
						<section>
							<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
								Emergency Contact
							</h3>
							<div className="p-4 rounded-lg bg-muted/50 border border-border">
								<p className="font-medium text-foreground">
									{tenant.emergencyContactName}
								</p>
								<p className="text-sm text-muted-foreground">
									{tenant.emergencyContactRelationship}
								</p>
								{tenant.emergencyContactPhone && (
									<p className="text-sm text-muted-foreground mt-1">
										{tenant.emergencyContactPhone}
									</p>
								)}
							</div>
						</section>
					)}

					{/* Recent Payments */}
					{tenant.paymentHistory && tenant.paymentHistory.length > 0 && (
						<section>
							<div className="flex items-center justify-between mb-3">
								<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
									Recent Payments
								</h3>
								<button
									onClick={() => onViewPaymentHistory(tenant.id)}
									className="text-xs text-primary hover:underline"
								>
									View all
								</button>
							</div>
							<div className="space-y-2">
								{tenant.paymentHistory.slice(0, 3).map(payment => (
									<div
										key={payment.id}
										className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
									>
										<div className="flex items-center gap-3">
											<PaymentStatusIcon status={payment.status} />
											<div>
												<p className="text-sm font-medium text-foreground">
													{formatCurrency(payment.amount)}
												</p>
												<p className="text-xs text-muted-foreground">
													{formatDate(payment.dueDate)}
												</p>
											</div>
										</div>
										<span className="text-xs text-muted-foreground capitalize">
											{payment.status}
										</span>
									</div>
								))}
							</div>
						</section>
					)}

					{/* Lease History */}
					{tenant.leaseHistory && tenant.leaseHistory.length > 0 && (
						<section>
							<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
								Lease History
							</h3>
							<div className="space-y-2">
								{tenant.leaseHistory.map(lease => (
									<button
										key={lease.id}
										onClick={() => onViewLease(lease.id)}
										className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted transition-colors text-left"
									>
										<div>
											<p className="text-sm font-medium text-foreground">
												{lease.propertyName} - Unit {lease.unitNumber}
											</p>
											<p className="text-xs text-muted-foreground">
												{formatDate(lease.startDate)} —{' '}
												{formatDate(lease.endDate)}
											</p>
										</div>
										<span className="text-xs text-muted-foreground capitalize px-2 py-1 bg-muted rounded">
											{lease.status}
										</span>
									</button>
								))}
							</div>
						</section>
					)}

					{/* Account Info */}
					<section>
						<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
							Account Info
						</h3>
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<p className="text-muted-foreground">Member since</p>
								<p className="font-medium text-foreground">
									{tenant.createdAt ? formatDate(tenant.createdAt) : 'N/A'}
								</p>
							</div>
							<div>
								<p className="text-muted-foreground">Last updated</p>
								<p className="font-medium text-foreground">
									{tenant.updatedAt ? formatDate(tenant.updatedAt) : 'N/A'}
								</p>
							</div>
							<div>
								<p className="text-muted-foreground">Identity</p>
								<p className="font-medium text-foreground">
									{tenant.identityVerified ? (
										<span className="text-emerald-600 flex items-center gap-1">
											<Check className="w-3 h-3" /> Verified
										</span>
									) : (
										<span className="text-amber-600">Not verified</span>
									)}
								</p>
							</div>
							<div>
								<p className="text-muted-foreground">Total paid</p>
								<p className="font-medium text-foreground">
									{formatCurrency(tenant.totalPaid)}
								</p>
							</div>
						</div>
					</section>
				</div>

				{/* Footer - Sticky */}
				<div className="isolate mt-auto flex flex-col-reverse justify-end gap-3 p-6 pt-4 sm:flex-row">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Close
					</Button>
					<Button variant="default" onClick={() => onEdit(tenant.id)}>
						Edit Profile
					</Button>
				</div>
			</div>
		</>,
		document.body
	)
}
