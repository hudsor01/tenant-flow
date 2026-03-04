import type { ElementType } from 'react'
import Link from 'next/link'
import {
	TrendingUp,
	TrendingDown,
	Wallet,
	ArrowRight,
	Building2,
	FileText,
	Receipt,
	CreditCard
} from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { formatCents } from '#lib/formatters/currency'

interface QuickLinkCardProps {
	href: string
	icon: ElementType
	title: string
	description: string
	value?: string
	trend?: 'up' | 'down' | 'neutral'
}

function QuickLinkCard({
	href,
	icon: Icon,
	title,
	description,
	value,
	trend
}: QuickLinkCardProps) {
	return (
		<Link
			href={href}
			className="group bg-card border border-border rounded-lg p-5 hover:bg-muted/50 transition-colors"
		>
			<div className="flex items-start justify-between mb-4">
				<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
					<Icon className="w-5 h-5 text-primary" />
				</div>
				<ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
			</div>
			<h3 className="font-medium text-foreground mb-1">{title}</h3>
			<p className="text-sm text-muted-foreground mb-3">{description}</p>
			{value && (
				<div className="flex items-center gap-2">
					<span className="text-lg font-semibold tabular-nums">{value}</span>
					{trend === 'up' && (
						<TrendingUp className="w-4 h-4 text-emerald-600" />
					)}
					{trend === 'down' && (
						<TrendingDown className="w-4 h-4 text-red-600" />
					)}
				</div>
			)}
		</Link>
	)
}

interface FinancialsQuickLinksProps {
	netIncome: number
	totalRevenue: number
	totalExpenses: number
}

export function FinancialsQuickLinks({
	netIncome,
	totalRevenue,
	totalExpenses
}: FinancialsQuickLinksProps) {
	return (
		<BlurFade delay={0.35} inView>
			<h2 className="text-lg font-medium text-foreground mb-4">
				Financial Reports
			</h2>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
				<QuickLinkCard
					href="/financials/income-statement"
					icon={FileText}
					title="Income Statement"
					description="Revenue, expenses, and net income breakdown"
					value={formatCents(netIncome)}
					trend={netIncome > 0 ? 'up' : netIncome < 0 ? 'down' : 'neutral'}
				/>
				<QuickLinkCard
					href="/financials/cash-flow"
					icon={TrendingUp}
					title="Cash Flow"
					description="Track money coming in and going out"
					value={formatCents(totalRevenue - totalExpenses)}
					trend="up"
				/>
				<QuickLinkCard
					href="/financials/balance-sheet"
					icon={Building2}
					title="Balance Sheet"
					description="Assets, liabilities, and equity snapshot"
				/>
				<QuickLinkCard
					href="/financials/payouts"
					icon={Wallet}
					title="Payouts"
					description="Stripe Connect payout history and balance"
				/>
				<QuickLinkCard
					href="/financials/expenses"
					icon={Receipt}
					title="Expenses"
					description="Track maintenance and operating costs"
					value={formatCents(totalExpenses)}
					trend="down"
				/>
				<QuickLinkCard
					href="/financials/tax-documents"
					icon={CreditCard}
					title="Tax Documents"
					description="Download tax forms and schedules"
				/>
			</div>
		</BlurFade>
	)
}

