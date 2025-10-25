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
		<div className="flex flex-col gap-3">
			{quickActions.map((action, index) => {
				const Icon = action.icon
				return (
					<Link
						key={action.href}
						href={action.href}
						className="group relative flex w-full items-center rounded-lg border-2 border-border/50 bg-card transition-all duration-300 hover:bg-accent hover:text-accent-foreground hover:border-primary/40 hover:shadow-md hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 animate-in fade-in slide-in-from-left-4 min-h-11 p-4 gap-3"
						style={{
							animationDelay: `${index * 50}ms`
						}}
						role="button"
						tabIndex={0}
						aria-label={`${action.title}: ${action.description}`}
					>
						<div className="flex shrink-0 items-center justify-center rounded-md bg-linear-to-br from-primary/10 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300 size-10 p-2">
							<Icon
								className="text-primary group-hover:scale-110 transition-transform duration-300 size-5"
								aria-hidden="true"
							/>
						</div>
						<div className="flex-1 text-left">
							<div className="font-semibold text-foreground group-hover:text-primary transition-colors text-base leading-normal">
								{action.title}
							</div>
							<div className="text-muted-foreground text-sm leading-tight">
								{action.description}
							</div>
						</div>
						<ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 shrink-0" />
					</Link>
				)
			})}
		</div>
	)
}
