

const benefits = [
	{ metric: '10+', label: 'Hours Saved Weekly', icon: 'i-lucide-clock' },
	{ metric: '99%', label: 'On-Time Payments', icon: 'i-lucide-trending-up' },
	{ metric: '85%', label: 'Less Admin Work', icon: 'i-lucide-zap' },
	{ metric: '4.9★', label: 'Customer Rating', icon: 'i-lucide-star' }
]

export function StatsSection() {
	return (
		<section className="from-primary bg-gradient-to-r to-purple-600 px-4 py-12 text-white">
			<div className="container mx-auto">
				<div className="grid grid-cols-2 gap-8 md:grid-cols-4">
					{benefits.map((benefit, index) => (
						<div key={index} className="text-center">
							<benefit.icon className="mx-auto mb-2 h-8 w-8 opacity-80" />
							<div className="text-3xl font-bold">
								{benefit.metric}
							</div>
							<div className="text-sm opacity-90">
								{benefit.label}
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
