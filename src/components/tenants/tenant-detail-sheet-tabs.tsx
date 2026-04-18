import {
	Mail,
	Phone,
	MapPin,
	Clock,
	AlertTriangle,
	Check,
	ChevronRight
} from 'lucide-react'
import { formatCurrency } from '#lib/utils/currency'
import { formatDate } from '#lib/formatters/date'
import type {
	TenantSectionDetail,
	TenantPaymentHistoryItem
} from '#types/sections/tenants'

function PaymentStatusIcon({
	status
}: {
	status: TenantPaymentHistoryItem['status']
}) {
	switch (status) {
		case 'succeeded':
			return <Check className="w-4 h-4 text-emerald-500" />
		case 'pending':
		case 'processing':
			return <Clock className="w-4 h-4 text-amber-500" />
		case 'failed':
		case 'cancelled':
			return <AlertTriangle className="w-4 h-4 text-red-500" />
		default:
			return null
	}
}

export function ContactSection({
	tenant,
	onContact
}: {
	tenant: TenantSectionDetail
	onContact: (tenantId: string, method: 'email' | 'phone') => void
}) {
	return (
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
						<p className="text-sm font-medium text-foreground">{tenant.email}</p>
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
							<p className="text-sm font-medium text-foreground">{tenant.phone}</p>
							<p className="text-xs text-muted-foreground">Phone</p>
						</div>
					</button>
				)}
			</div>
		</section>
	)
}

export function CurrentLeaseSection({
	tenant,
	onViewLease
}: {
	tenant: TenantSectionDetail
	onViewLease: (leaseId: string) => void
}) {
	if (!tenant.currentLease) return null
	return (
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
			</button>
		</section>
	)
}

export function RecentPaymentsSection({
	tenant,
	onViewPaymentHistory
}: {
	tenant: TenantSectionDetail
	onViewPaymentHistory: (tenantId: string) => void
}) {
	if (!tenant.paymentHistory || tenant.paymentHistory.length === 0) return null
	return (
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
	)
}

export function LeaseHistorySection({
	tenant,
	onViewLease
}: {
	tenant: TenantSectionDetail
	onViewLease: (leaseId: string) => void
}) {
	if (!tenant.leaseHistory || tenant.leaseHistory.length === 0) return null
	return (
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
								{formatDate(lease.startDate)} — {formatDate(lease.endDate)}
							</p>
						</div>
						<span className="text-xs text-muted-foreground capitalize px-2 py-1 bg-muted rounded">
							{lease.status}
						</span>
					</button>
				))}
			</div>
		</section>
	)
}

export function AccountInfoSection({ tenant }: { tenant: TenantSectionDetail }) {
	return (
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
	)
}
