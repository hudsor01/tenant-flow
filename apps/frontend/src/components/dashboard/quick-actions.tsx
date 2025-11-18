'use client'

import {
	ArrowRight,
	BarChart3,
	FileText,
	Home,
	Search,
	UserPlus,
	Wrench,
	Building
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
		title: 'Add Unit',
		description: 'Add a new unit to a property',
		icon: Building,
		href: '/manage/units/new'
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
		title: 'View Analytics',
		description: 'Property performance',
		icon: BarChart3,
		href: '/manage/analytics'
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
		<div className="dashboard-quick-actions">
			{quickActions.map(action => {
				const Icon = action.icon
				return (
					<Link
						key={action.href}
						href={action.href}
						className="dashboard-quick-action group focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring"

						aria-label={`${action.title}: ${action.description}`}
					>
						<div className="dashboard-quick-action-icon">
							<Icon className="size-5" aria-hidden="true" />
						</div>
						<div className="dashboard-quick-action-content">
							<p className="dashboard-quick-action-title">{action.title}</p>
							<p className="dashboard-quick-action-description">
								{action.description}
							</p>
						</div>
						<div className="dashboard-quick-action-chevron">
							<ArrowRight className="size-4 transition-transform duration-200" />
						</div>
					</Link>
				)
			})}
		</div>
	)
}
