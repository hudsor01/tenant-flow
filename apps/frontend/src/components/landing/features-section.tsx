import {
	Building2,
	Users,
	FileText,
	CreditCard,
	Wrench,
	BarChart3,
	ChevronRight,
	Sparkles
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const features = [
	{
		icon: Building2,
		title: 'Property Management',
		description:
			'Track all your properties, units, and occupancy rates in one dashboard',
		gradient: 'from-primary to-cyan-500',
		shadowColor: 'shadow-primary/20'
	},
	{
		icon: Users,
		title: 'Tenant Portal',
		description:
			'Give tenants self-service access to pay rent and submit requests',
		gradient: 'from-purple-500 to-pink-500',
		shadowColor: 'shadow-purple-500/20'
	},
	{
		icon: FileText,
		title: 'Digital Leases',
		description: 'Create, sign, and manage lease agreements digitally',
		gradient: 'from-green-500 to-emerald-500',
		shadowColor: 'shadow-green-500/20'
	},
	{
		icon: CreditCard,
		title: 'Online Payments',
		description: 'Collect rent and fees online with automated reminders',
		gradient: 'from-orange-500 to-red-500',
		shadowColor: 'shadow-orange-500/20'
	},
	{
		icon: Wrench,
		title: 'Maintenance Tracking',
		description: 'Manage work orders and vendor assignments efficiently',
		gradient: 'from-pink-500 to-rose-500',
		shadowColor: 'shadow-pink-500/20'
	},
	{
		icon: BarChart3,
		title: 'Analytics & Reports',
		description: 'Track performance with detailed financial reporting',
		gradient: 'from-indigo-500 to-purple-500',
		shadowColor: 'shadow-indigo-500/20'
	}
]

export function FeaturesSection() {
	return (
		<section className="relative bg-gradient-to-b from-white to-gray-50/50 px-4 py-24">
			<div className="container mx-auto">
				{/* Section header with enhanced styling */}
				<div className="mb-16 text-center">
					<div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2">
						<Sparkles className="h-4 w-4 text-purple-600" />
						<span className="text-sm font-medium text-gray-700">
							Comprehensive Features
						</span>
					</div>
					<h2 className="mb-6 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
						Everything You Need in One Platform
					</h2>
					<p className="mx-auto max-w-2xl text-xl leading-relaxed text-gray-600">
						Stop juggling multiple tools. TenantFlow brings all your
						property management needs together.
					</p>
				</div>

				{/* Enhanced feature cards grid */}
				<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
					{features.map((feature, index) => (
						<Card
							key={index}
							className={cn(
								'relative overflow-hidden border-0 bg-white/95 shadow-xl backdrop-blur-sm',
								'group transform cursor-pointer transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl',
								feature.shadowColor
							)}
						>
							<CardContent className="p-8">
								{/* Gradient background effect */}
								<div
									className={cn(
										'absolute -top-20 -right-20 h-40 w-40 rounded-full opacity-10',
										'bg-gradient-to-br',
										feature.gradient
									)}
								/>

								<div className="relative z-10">
									{/* Icon with gradient background */}
									<div
										className={cn(
											'mb-6 flex h-14 w-14 items-center justify-center rounded-xl',
											'bg-gradient-to-br text-white shadow-lg transition-transform group-hover:scale-110',
											feature.gradient,
											feature.shadowColor
										)}
									>
										<feature.icon className="h-7 w-7" />
									</div>

									{/* Content */}
									<h3 className="mb-3 text-xl font-semibold text-gray-900">
										{feature.title}
									</h3>
									<p className="mb-4 leading-relaxed text-gray-600">
										{feature.description}
									</p>

									{/* Interactive learn more link */}
									<div
										className={cn(
											'flex items-center text-sm font-medium transition-all',
											'bg-gradient-to-r bg-clip-text text-transparent group-hover:gap-2',
											feature.gradient
										)}
									>
										<span>Learn more</span>
										<ChevronRight
											className={cn(
												'ml-1 h-4 w-4 transition-all group-hover:translate-x-1',
												'text-gray-400 group-hover:text-transparent'
											)}
										/>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>

				{/* Bottom CTA */}
				<div className="mt-16 text-center">
					<p className="mb-4 text-gray-600">
						And many more features to streamline your workflow
					</p>
					<button className="from-primary inline-flex items-center gap-2 rounded-lg bg-gradient-to-r to-purple-600 px-6 py-3 font-medium text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl">
						Explore All Features
						<ChevronRight className="h-4 w-4" />
					</button>
				</div>
			</div>
		</section>
	)
}
