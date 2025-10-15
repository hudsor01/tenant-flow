'use client'

import {
	BarChart3,
	CreditCard,
	FileText,
	Home,
	Search,
	UserPlus,
	Wrench
} from 'lucide-react'
import Link from 'next/link'

const quickActions = [
	{
		title: 'Add Property',
		description: 'List a new property',
		icon: Home,
		href: '/manage/properties/new'
	},
	{
		title: 'Add Tenant',
		description: 'Register new tenant',
		icon: UserPlus,
		href: '/manage/tenants/new'
	},
	{
		title: 'Create Lease',
		description: 'Draft new lease agreement',
		icon: FileText,
		href: '/manage/leases/new'
	},
	{
		title: 'Maintenance Request',
		description: 'Log maintenance issue',
		icon: Wrench,
		href: '/manage/maintenance/new'
	},
	{
		title: 'Collect Payment',
		description: 'Record rent payment',
		icon: CreditCard,
		href: '/manage/rent-collection'
	},
	{
		title: 'Property Search',
		description: 'Find properties',
		icon: Search,
		href: '/manage/properties'
	}
]

export function QuickActions() {
	return (
		<div style={{ gap: 'var(--spacing-3)' }} className="flex flex-col">
			{quickActions.map(action => {
				const Icon = action.icon
				return (
					<Link
						key={action.href}
						href={action.href}
						className="group relative flex w-full items-center rounded-lg border border-border bg-card transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
						style={{
							minHeight: '44px',
							padding: 'var(--spacing-4)',
							gap: 'var(--spacing-3)'
						}}
						role="button"
						tabIndex={0}
						aria-label={`${action.title}: ${action.description}`}
					>
						<div
							className="flex shrink-0 items-center justify-center rounded-md bg-primary/10"
							style={{
								width: '32px',
								height: '32px',
								padding: 'var(--spacing-2)'
							}}
						>
							<Icon
								className="text-primary"
								style={{ width: '16px', height: '16px' }}
								aria-hidden="true"
							/>
						</div>
						<div className="flex-1 text-left">
							<div
								className="font-medium text-foreground"
								style={{
									fontSize: 'var(--font-body)',
									lineHeight: 'var(--line-height-body)'
								}}
							>
								{action.title}
							</div>
							<div
								className="text-muted-foreground"
								style={{
									fontSize: 'var(--font-small)',
									lineHeight: 'var(--line-height-small)'
								}}
							>
								{action.description}
							</div>
						</div>
					</Link>
				)
			})}

			{/* Divider with proper spacing */}
			<div
				className="border-t border-border"
				style={{
					marginTop: 'var(--spacing-3)',
					paddingTop: 'var(--spacing-3)'
				}}
			>
				<Link
					href="/manage/analytics"
					className="group relative flex w-full items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
					style={{
						minHeight: '44px',
						padding: 'var(--spacing-3)',
						gap: 'var(--spacing-2)'
					}}
					role="button"
					tabIndex={0}
					aria-label="View Analytics dashboard"
				>
					<BarChart3
						className="text-primary"
						style={{ width: '16px', height: '16px' }}
						aria-hidden="true"
					/>
					<span
						className="font-medium text-foreground"
						style={{
							fontSize: 'var(--font-body)',
							lineHeight: 'var(--line-height-body)'
						}}
					>
						View Analytics
					</span>
				</Link>
			</div>
		</div>
	)
}
