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
		<div className="flex flex-col gap-4">
			{quickActions.map((action, index) => {
				const Icon = action.icon
				return (
					<Link
						key={action.href}
						href={action.href}
						className="group relative flex w-full items-center rounded-premium border-2 border-slate-200/60 bg-linear-to-r from-white to-slate-50/50 shadow-premium-sm transition-all duration-300 hover:shadow-premium-lg hover:border-slate-300/80 hover:bg-linear-to-r hover:from-slate-50 hover:to-slate-100 hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-slate-500/50 focus:ring-offset-2 min-h-14 p-5 gap-4 overflow-hidden dark:border-slate-700/60 dark:from-slate-900 dark:to-slate-800/50 dark:hover:from-slate-800 dark:hover:to-slate-700 dark:hover:border-slate-600/80 dark:focus:ring-slate-400/50"
						style={{
							animationDelay: `${index * 75}ms`
						}}
						role="button"
						tabIndex={0}
						aria-label={`${action.title}: ${action.description}`}
					>
						<div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
						<div className="relative flex shrink-0 items-center justify-center rounded-premium bg-linear-to-br from-slate-100 to-slate-200 group-hover:from-slate-200 group-hover:to-slate-300 transition-all duration-300 size-12 p-3 shadow-premium-inner dark:from-slate-700 dark:to-slate-800 dark:group-hover:from-slate-600 dark:group-hover:to-slate-700">
							<Icon
								className="text-slate-700 group-hover:text-slate-900 transition-all duration-300 size-5 group-hover:scale-110 dark:text-slate-300 dark:group-hover:text-white"
								aria-hidden="true"
							/>
						</div>
						<div className="relative flex-1 text-left">
							<div className="font-bold text-slate-900 group-hover:text-slate-950 transition-colors text-base leading-tight dark:text-white dark:group-hover:text-slate-100">
								{action.title}
							</div>
							<div className="text-slate-600 text-sm leading-tight font-medium dark:text-slate-400 dark:group-hover:text-slate-300">
								{action.description}
							</div>
						</div>
						<div className="relative flex items-center justify-center size-8 rounded-full bg-slate-100 group-hover:bg-slate-200 transition-colors dark:bg-slate-700 dark:group-hover:bg-slate-600">
							<ArrowRight className="size-4 text-slate-600 group-hover:text-slate-800 group-hover:translate-x-0.5 transition-all duration-300 dark:text-slate-400 dark:group-hover:text-slate-200" />
						</div>
					</Link>
				)
			})}
		</div>
	)
}
