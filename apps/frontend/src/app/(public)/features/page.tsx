import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const features = [
	{
		icon: 'i-lucide-building-2',
		title: 'Property Management',
		description:
			'Comprehensive property portfolio management with occupancy tracking',
		details: [
			'Multi-property dashboard',
			'Unit availability tracking',
			'Property maintenance scheduling',
			'Digital property records'
		],
		gradient: 'from-primary to-cyan-500'
	},
	{
		icon: 'i-lucide-users',
		title: 'Tenant Portal',
		description:
			'Self-service portal for tenants to manage their rental experience',
		details: [
			'Online rent payments',
			'Maintenance request submission',
			'Lease document access',
			'Communication center'
		],
		gradient: 'from-purple-500 to-pink-500'
	},
	{
		icon: 'i-lucide-credit-card',
		title: 'Online Payments',
		description: 'Secure payment processing with automated reminders',
		details: [
			'Multiple payment methods',
			'Automatic rent collection',
			'Late fee automation',
			'Payment history tracking'
		],
		gradient: 'from-green-500 to-emerald-500'
	},
	{
		icon: 'i-lucide-file-text',
		title: 'Digital Leases',
		description: 'Create, sign, and manage lease agreements electronically',
		details: [
			'Digital signature integration',
			'Customizable lease templates',
			'Automated lease renewals',
			'Document storage & retrieval'
		],
		gradient: 'from-orange-500 to-red-500'
	},
	{
		icon: 'i-lucide-wrench',
		title: 'Maintenance Tracking',
		description:
			'Streamlined maintenance request and work order management',
		details: [
			'Work order automation',
			'Vendor management',
			'Cost tracking',
			'Maintenance history'
		],
		gradient: 'from-pink-500 to-rose-500'
	},
	{
		icon: 'i-lucide-bar-chart-3',
		title: 'Analytics & Reports',
		description: 'Comprehensive financial and operational reporting',
		details: [
			'Revenue analytics',
			'Occupancy reports',
			'Maintenance cost analysis',
			'Custom report builder'
		],
		gradient: 'from-indigo-500 to-purple-500'
	}
]

const additionalFeatures = [
	{
		icon: 'i-lucide-smartphone',
		title: 'Mobile App',
		description: 'Manage properties on-the-go with our mobile application'
	},
	{
		icon: 'i-lucide-shield',
		title: 'Security & Compliance',
		description: 'Bank-level security with compliance reporting'
	},
	{
		icon: 'i-lucide-zap',
		title: 'API Integration',
		description: 'Connect with your favorite tools via our robust API'
	},
	{
		icon: 'i-lucide-clock',
		title: '24/7 Support',
		description: 'Round-the-clock customer support and assistance'
	}
]

export default function FeaturesPage() {
	return (
		<div className="min-h-screen bg-white">
			{/* Navigation */}
			<nav className="border-b bg-white/95 backdrop-blur-sm">
				<div className="container mx-auto flex h-16 items-center justify-between px-4">
					<Link
						href="/"
						className="group flex items-center space-x-2"
					>
						<i className="i-lucide-building-2 inline-block text-primary h-8 w-8 transition-transform group-hover:scale-110"  />
						<span className="from-primary bg-gradient-to-r to-purple-600 bg-clip-text text-xl font-bold text-transparent">
							TenantFlow
						</span>
					</Link>
					<Button asChild>
						<Link href="/auth/signup">Get Started Free</Link>
					</Button>
				</div>
			</nav>

			{/* Hero Section */}
			<section className="bg-gradient-to-br from-blue-50 to-purple-50 px-4 pb-12 pt-24">
				<div className="container mx-auto text-center">
					<Badge className="from-primary mb-6 bg-gradient-to-r to-purple-600 text-white">
						<i className="i-lucide-sparkles inline-block mr-2 h-4 w-4"  />
						Complete Feature Set
					</Badge>
					<h1 className="mb-6 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-5xl font-bold text-transparent">
						Everything You Need to Manage Properties
					</h1>
					<p className="mx-auto max-w-3xl text-xl text-gray-600">
						From tenant management to financial reporting,
						TenantFlow provides all the tools you need to streamline
						your property management operations.
					</p>
				</div>
			</section>

			{/* Main Features Grid */}
			<section className="px-4 py-20">
				<div className="container mx-auto">
					<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
						{features.map((feature, index) => {
							return (
								<Card
									key={index}
									className="border-0 shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
								>
									<CardContent className="p-8">
										<div
											className={`h-14 w-14 rounded-xl bg-gradient-to-br ${feature.gradient} mb-6 flex items-center justify-center`}
										>
											<i className={`${feature.icon} h-7 w-7 inline-block text-white`} />
										</div>
										<h3 className="mb-3 text-xl font-semibold text-gray-900">
											{feature.title}
										</h3>
										<p className="mb-6 text-gray-600">
											{feature.description}
										</p>
										<ul className="space-y-2">
											{feature.details.map(
												(detail, idx) => (
													<li
														key={idx}
														className="flex items-center text-sm text-gray-600"
													>
														<i className="i-lucide-check-circle inline-block mr-2 h-4 w-4 flex-shrink-0 text-green-500" />
														{detail}
													</li>
												)
											)}
										</ul>
									</CardContent>
								</Card>
							)
						})}
					</div>
				</div>
			</section>

			{/* Additional Features */}
			<section className="bg-gray-50 px-4 py-20">
				<div className="container mx-auto">
					<div className="mb-12 text-center">
						<h2 className="mb-4 text-3xl font-bold text-gray-900">
							Plus Many More Features
						</h2>
						<p className="mx-auto max-w-2xl text-gray-600">
							TenantFlow includes everything you need to run your
							property management business efficiently
						</p>
					</div>
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
						{additionalFeatures.map((feature, index) => {
							return (
								<Card
									key={index}
									className="p-6 text-center transition-shadow hover:shadow-lg"
								>
									<i className={`${feature.icon} text-primary mx-auto mb-4 h-8 w-8 inline-block`} />
									<h3 className="mb-2 font-semibold">
										{feature.title}
									</h3>
									<p className="text-sm text-gray-600">
										{feature.description}
									</p>
								</Card>
							)
						})}
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="from-primary bg-gradient-to-r to-purple-600 px-4 py-20 text-white">
				<div className="container mx-auto text-center">
					<h2 className="mb-4 text-4xl font-bold">
						Ready to Get Started?
					</h2>
					<p className="mb-8 text-xl text-blue-100">
						Join thousands of property managers using TenantFlow
					</p>
					<div className="flex flex-col justify-center gap-4 sm:flex-row">
						<Link href="/auth/signup">
							<Button
								size="lg"
								className="text-primary inline-flex items-center bg-white hover:bg-gray-100"
							>
								Start Free Trial
								<i className="i-lucide-arrow-right inline-block ml-2 h-5 w-5"  />
							</Button>
						</Link>
						<Link href="/pricing">
							<Button
								size="lg"
								variant="outline"
								className="border-white text-white hover:bg-white/10"
							>
								View Pricing
							</Button>
						</Link>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="bg-gray-900 px-4 py-8 text-gray-400">
				<div className="container mx-auto text-center">
					<p>&copy; 2023 TenantFlow. All rights reserved.</p>
				</div>
			</footer>
		</div>
	)
}
