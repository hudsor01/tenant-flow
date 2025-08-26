<<<<<<< HEAD
/**
 * Features Section - Re-export of OptimizedFeaturesSection
 * Created to resolve import resolution issues
 */

export { OptimizedFeaturesSection as FeaturesSection } from './optimized-features-section'
export { OptimizedFeaturesSection as default } from './optimized-features-section'
=======
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
		<section className="relative bg-white py-24 sm:py-32">
			<div className="mx-auto max-w-7xl px-6 lg:px-8">
				{/* Section header - Next.js inspired */}
				<div className="mx-auto max-w-2xl text-center">
					<div className="mb-8 inline-flex items-center gap-2 rounded-full border border-gray-200/60 bg-gray-50/80 px-4 py-2 text-sm font-medium text-gray-700">
						<Sparkles className="h-4 w-4 text-blue-600" />
						<span>Platform Features</span>
					</div>
					<h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
						Everything you need in one platform
					</h2>
					<p className="mt-6 text-lg leading-8 text-gray-600">
						Stop juggling multiple tools. TenantFlow brings all your
						property management needs together in one powerful
						platform.
					</p>
				</div>

				{/* Modern feature grid - Stripe inspired */}
				<div className="mx-auto mt-16 max-w-2xl lg:mt-20 lg:max-w-none">
					<dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
						{features.map((feature, index) => (
							<div key={index} className="group flex flex-col">
								<div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
									<feature.icon className="h-6 w-6 text-white" />
								</div>
								<dt className="text-lg leading-7 font-semibold text-gray-900">
									{feature.title}
								</dt>
								<dd className="mt-2 text-base leading-7 text-gray-600">
									{feature.description}
								</dd>
								<div className="mt-4 flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-700">
									<span>Learn more</span>
									<ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
								</div>
							</div>
						))}
					</dl>
				</div>

				{/* Bottom CTA */}
				<div className="mt-20 text-center">
					<p className="mb-8 text-base leading-7 text-gray-600">
						And many more features to streamline your workflow
					</p>
					<button className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-base font-medium text-white shadow-lg transition-all hover:from-blue-700 hover:to-purple-700 hover:shadow-xl">
						Explore All Features
						<ChevronRight className="h-4 w-4" />
					</button>
				</div>
			</div>
		</section>
	)
}
>>>>>>> origin/main
