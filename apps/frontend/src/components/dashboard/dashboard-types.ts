import { Building2, FileText, UserPlus, Wallet, Wrench } from 'lucide-react'
import type { ChartConfig } from '#components/ui/chart'

export type PortfolioRow = {
	id: string
	property: string
	address: string
	units: { occupied: number; total: number }
	tenant: string | null
	leaseStatus: 'active' | 'expiring' | 'vacant'
	leaseEnd: string | null
	rent: number
	maintenanceOpen: number
}

export const chartConfig = {
	revenue: {
		label: 'Revenue',
		color: 'var(--chart-1)'
	}
} satisfies ChartConfig

export function formatDashboardCurrency(cents: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(cents / 100)
}

export const quickActions = [
	{
		title: 'Add Property',
		description: 'Register a new property',
		icon: Building2,
		action: 'addProperty'
	},
	{
		title: 'Create Lease',
		description: 'Draft a new lease agreement',
		icon: FileText,
		action: 'createLease'
	},
	{
		title: 'Invite Tenant',
		description: 'Send tenant invitation',
		icon: UserPlus,
		action: 'inviteTenant'
	},
	{
		title: 'Record Payment',
		description: 'Log a rent payment',
		icon: Wallet,
		action: 'recordPayment'
	},
	{
		title: 'New Request',
		description: 'Create maintenance request',
		icon: Wrench,
		action: 'createRequest'
	}
] as const

export type QuickActionType = (typeof quickActions)[number]['action']
