'use client'

import { Button } from '@/components/ui/button'
import {
	UserPlus,
	FileText,
	Wrench,
	CreditCard,
	Home,
	Search,
	BarChart3
} from 'lucide-react'

const quickActions = [
	{
		title: 'Add Property',
		description: 'List a new property',
		icon: Home,
		color: 'text-blue-600',
		bgColor: 'bg-blue-50 hover:bg-blue-100',
		href: '/properties/new'
	},
	{
		title: 'Add Tenant',
		description: 'Register new tenant',
		icon: UserPlus,
		color: 'text-green-600',
		bgColor: 'bg-green-50 hover:bg-green-100',
		href: '/tenants/new'
	},
	{
		title: 'Create Lease',
		description: 'Draft new lease agreement',
		icon: FileText,
		color: 'text-purple-600',
		bgColor: 'bg-purple-50 hover:bg-purple-100',
		href: '/leases/new'
	},
	{
		title: 'Maintenance Request',
		description: 'Log maintenance issue',
		icon: Wrench,
		color: 'text-orange-600',
		bgColor: 'bg-orange-50 hover:bg-orange-100',
		href: '/maintenance/new'
	},
	{
		title: 'Collect Payment',
		description: 'Record rent payment',
		icon: CreditCard,
		color: 'text-emerald-600',
		bgColor: 'bg-emerald-50 hover:bg-emerald-100',
		href: '/payments/collect'
	},
	{
		title: 'Property Search',
		description: 'Find properties',
		icon: Search,
		color: 'text-indigo-600',
		bgColor: 'bg-indigo-50 hover:bg-indigo-100',
		href: '/properties'
	}
]

export function QuickActions() {
	return (
		<div className="space-y-3">
			{quickActions.map((action, index) => {
				const Icon = action.icon
				return (
					<Button
						key={index}
						variant="ghost"
						className={`w-full justify-start h-auto p-4 ${action.bgColor} border hover:border-gray-200`}
						asChild
					>
						<div className="cursor-pointer">
							<div className="flex items-center gap-3 w-full">
								<div className={`p-2 rounded-lg ${action.bgColor}`}>
									<Icon className={`h-4 w-4 ${action.color}`} />
								</div>
								<div className="flex-1 text-left">
									<div className="font-medium text-sm">{action.title}</div>
									<div className="text-xs text-muted-foreground">
										{action.description}
									</div>
								</div>
							</div>
						</div>
					</Button>
				)
			})}

			{/* Divider */}
			<div className="border-t pt-3">
				<Button variant="outline" className="w-full" asChild>
					<div className="cursor-pointer flex items-center gap-2">
						<BarChart3 className="h-4 w-4" />
						View Analytics
					</div>
				</Button>
			</div>
		</div>
	)
}