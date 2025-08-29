/**
 * Stats Section - Server Component
 * Using semantic tokens and gradients for consistency
 */

const benefits = [
	{ metric: '98%', label: 'Avg Occupancy Rate', icon: 'i-lucide-home' },
	{ metric: '$2.5M', label: 'Monthly Revenue Tracked', icon: 'i-lucide-dollar-sign' },
	{ metric: '24hr', label: 'Maintenance Response', icon: 'i-lucide-wrench' },
	{ metric: '99.9%', label: 'Platform Uptime', icon: 'i-lucide-shield' }
]

export function StatsSection() {
	return (
		<section className="bg-gradient-to-r from-primary to-accent px-4 py-12 text-white">
			<div className="container mx-auto">
				<div className="grid grid-cols-2 gap-8 md:grid-cols-4">
					{benefits.map((benefit, index) => (
						<div key={index} className="text-center">
							<i className={`${benefit.icon} mx-auto mb-2 h-8 w-8 op-80`} />
							<div className="text-3xl font-bold">
								{benefit.metric}
							</div>
							<div className="text-sm op-90">
								{benefit.label}
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}