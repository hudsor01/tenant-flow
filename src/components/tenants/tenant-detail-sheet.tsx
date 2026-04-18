'use client'

import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '#components/ui/button'
import type { TenantSectionDetail } from '#types/sections/tenants'
import {
	ContactSection,
	CurrentLeaseSection,
	RecentPaymentsSection,
	LeaseHistorySection,
	AccountInfoSection
} from './tenant-detail-sheet-tabs'

interface TenantDetailSheetProps {
	tenant: TenantSectionDetail | null
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	onEdit: (tenantId: string) => void
	onContact: (tenantId: string, method: 'email' | 'phone') => void
	onViewLease: (leaseId: string) => void
	onViewPaymentHistory?: (tenantId: string) => void
}

export function TenantDetailSheet({
	tenant,
	isOpen,
	onOpenChange,
	onEdit,
	onContact,
	onViewLease,
	onViewPaymentHistory
}: TenantDetailSheetProps) {
	useEffect(() => {
		if (isOpen) {
			const handleEscape = (e: KeyboardEvent) => {
				if (e.key === 'Escape') {
					onOpenChange(false)
				}
			}
			document.addEventListener('keydown', handleEscape)
			document.body.style.overflow = 'hidden'
			return () => {
				document.removeEventListener('keydown', handleEscape)
				document.body.style.overflow = ''
			}
		}
		return () => {
			document.body.style.overflow = ''
		}
	}, [isOpen, onOpenChange])

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
					<p className="text-pretty text-base/6 text-muted-foreground sm:text-sm/6">
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
					<ContactSection tenant={tenant} onContact={onContact} />
					<CurrentLeaseSection tenant={tenant} onViewLease={onViewLease} />
					{tenant.emergencyContactName && (
						<section>
							<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
								Emergency Contact
							</h3>
							<div className="p-4 rounded-lg bg-muted/50 border border-border">
								<p className="font-medium text-foreground">{tenant.emergencyContactName}</p>
								<p className="text-sm text-muted-foreground">{tenant.emergencyContactRelationship}</p>
								{tenant.emergencyContactPhone && (
									<p className="text-sm text-muted-foreground mt-1">{tenant.emergencyContactPhone}</p>
								)}
							</div>
						</section>
					)}
					{onViewPaymentHistory && (
						<RecentPaymentsSection tenant={tenant} onViewPaymentHistory={onViewPaymentHistory} />
					)}
					<LeaseHistorySection tenant={tenant} onViewLease={onViewLease} />
					<AccountInfoSection tenant={tenant} />
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
