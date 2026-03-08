import {
	AlertCircle,
	Building2,
	CheckCircle2,
	Clock,
	CreditCard
} from 'lucide-react'
import { Badge } from '#components/ui/badge'
import { cn } from '#lib/utils'
import { formatCurrency, type CurrencyCode } from '#lib/formatters/currency'

interface ConnectedAccountData {
	onboarding_status: string | null
	charges_enabled: boolean | null
	payouts_enabled: boolean | null
	business_name: string | null
	requirements_due: string[] | null
}

interface BalanceData {
	available?: { amount: number; currency: string }[]
	pending?: { amount: number; currency: string }[]
}

export function StatusBadge({ account }: { account: ConnectedAccountData }) {
	const status = account.onboarding_status || 'pending'
	switch (status) {
		case 'complete':
			return (
				<Badge variant="success" className="gap-1">
					<CheckCircle2 className="size-3" />
					Verified
				</Badge>
			)
		case 'in_progress':
			return (
				<Badge variant="warning" className="gap-1">
					<Clock className="size-3" />
					Setup In Progress
				</Badge>
			)
		default:
			return (
				<Badge variant="secondary" className="gap-1">
					<AlertCircle className="size-3" />
					Pending Setup
				</Badge>
			)
	}
}

export function CapabilityCards({ account }: { account: ConnectedAccountData }) {
	return (
		<div className="grid gap-4 sm:grid-cols-2">
			<div
				className={cn(
					'flex items-center gap-3 rounded-lg border p-3',
					account.charges_enabled
						? 'border-success/30 bg-success/5'
						: 'border-muted bg-muted/50'
				)}
			>
				<CreditCard
					className={cn(
						'size-5',
						account.charges_enabled ? 'text-success' : 'text-muted-foreground'
					)}
				/>
				<div>
					<p className="text-sm font-medium">
						{account.charges_enabled ? 'Can Receive Payments' : 'Payments'}
					</p>
					<p className="text-xs text-muted-foreground">
						{account.charges_enabled ? 'Enabled' : 'Setup required'}
					</p>
				</div>
			</div>
			<div
				className={cn(
					'flex items-center gap-3 rounded-lg border p-3',
					account.payouts_enabled
						? 'border-success/30 bg-success/5'
						: 'border-muted bg-muted/50'
				)}
			>
				<Building2
					className={cn(
						'size-5',
						account.payouts_enabled ? 'text-success' : 'text-muted-foreground'
					)}
				/>
				<div>
					<p className="text-sm font-medium">
						{account.payouts_enabled ? 'Can Receive Payouts' : 'Payouts'}
					</p>
					<p className="text-xs text-muted-foreground">
						{account.payouts_enabled ? 'Enabled' : 'Setup required'}
					</p>
				</div>
			</div>
		</div>
	)
}

export function AccountBalance({ balance }: { balance: BalanceData }) {
	return (
		<div className="rounded-lg border bg-card p-4">
			<p className="mb-2 text-sm font-medium text-muted-foreground">Account Balance</p>
			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<p className="text-2xl font-bold text-foreground">
						{balance.available?.[0]
							? formatCurrency(balance.available[0].amount, { currency: balance.available[0].currency as CurrencyCode })
							: '$0.00'}
					</p>
					<p className="text-xs text-muted-foreground">Available</p>
				</div>
				<div>
					<p className="text-2xl font-bold text-muted-foreground">
						{balance.pending?.[0]
							? formatCurrency(balance.pending[0].amount, { currency: balance.pending[0].currency as CurrencyCode })
							: '$0.00'}
					</p>
					<p className="text-xs text-muted-foreground">Pending</p>
				</div>
			</div>
		</div>
	)
}

export function RequirementsWarning({ count }: { count: number }) {
	if (count === 0) return null
	return (
		<div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
			<div className="flex items-start gap-3">
				<AlertCircle className="mt-0.5 size-5 text-warning" />
				<div>
					<p className="font-medium text-warning-foreground">
						{count} item{count > 1 ? 's' : ''} needed
					</p>
					<p className="text-sm text-muted-foreground">
						Complete your verification to enable all features.
					</p>
				</div>
			</div>
		</div>
	)
}
