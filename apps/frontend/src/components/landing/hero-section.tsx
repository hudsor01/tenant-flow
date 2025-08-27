import { HeroButtons } from './hero-buttons'

export function HeroSection() {
	return (
		<section className="relative overflow-hidden bg-white py-16 sm:py-20 lg:py-24">
			{/* Subtle gradient background */}
			<div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-blue-50/30" />

			<div className="relative mx-auto max-w-7xl px-6 lg:px-8">
				<div className="mx-auto max-w-4xl text-center">
					{/* Compact announcement badge */}
					<div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-600 shadow-sm">
						<div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
						<span>New: AI-Powered Property Insights</span>
						<i className="i-lucide-arrow-right inline-block h-3 w-3"  />
					</div>

					{/* Compact typography */}
					<h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
						<span className="block">Property Management</span>
						<span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
							Made Simple
						</span>
					</h1>

					{/* Compact subtitle */}
					<p className="mx-auto mt-6 max-w-2xl text-lg leading-7 text-gray-600">
						The all-in-one platform trusted by 10,000+ property
						managers to save 10+ hours per week
					</p>

					{/* Compact CTA section */}
					<div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
						<HeroButtons />
						<button className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
							<i className="i-lucide-play inline-block h-4 w-4"  />
							Watch Demo
						</button>
					</div>

					{/* Compact trust indicators */}
					<div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
						<div className="flex items-center gap-2">
							<i className="i-lucide-shield inline-block h-4 w-4 text-emerald-500"  />
							<span>14-day free trial</span>
						</div>
						<div className="flex items-center gap-2">
							<i className="i-lucide-zap inline-block h-4 w-4 text-blue-500"  />
							<span>5-minute setup</span>
						</div>
						<div className="flex items-center gap-2">
							<i className="i-lucide-users inline-block h-4 w-4 text-purple-500"  />
							<span>Join 10,000+ users</span>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
