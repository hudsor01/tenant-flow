import { Shield, Star, Zap, Users, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface PricingHeaderProps {
	className?: string
}

/**
 * Pricing page header with trust indicators and value proposition
 */
export function PricingHeader({ className }: PricingHeaderProps) {
	return (
		<div className={`mb-16 text-center ${className || ''}`}>
			{/* Main heading */}
			<div className="mb-8">
				<Badge variant="secondary" className="mb-4 px-4 py-2">
					✨ Professional Property Management
				</Badge>

				<h1 className="mb-6 text-5xl leading-tight font-bold text-gray-900 md:text-6xl">
					Simple, Transparent
					<span className="from-primary bg-gradient-to-r to-purple-600 bg-clip-text text-transparent">
						{' '}
						Pricing
					</span>
				</h1>

				<p className="mx-auto max-w-3xl text-xl leading-relaxed text-gray-600">
					Start with our free trial, then scale as your portfolio
					grows. All plans include our core property management
					features with no hidden fees.
				</p>
			</div>

			{/* Trust indicators */}
			<div className="mb-8 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
				<div className="flex items-center gap-2">
					<Shield className="h-4 w-4 text-green-600" />
					<span>Bank-level Security</span>
				</div>
				<div className="flex items-center gap-2">
					<Star className="h-4 w-4 text-yellow-500" />
					<span>5-star Support</span>
				</div>
				<div className="flex items-center gap-2">
					<Zap className="text-primary h-4 w-4" />
					<span>Instant Setup</span>
				</div>
				<div className="flex items-center gap-2">
					<Users className="h-4 w-4 text-purple-600" />
					<span>10,000+ Properties Managed</span>
				</div>
				<div className="flex items-center gap-2">
					<TrendingUp className="h-4 w-4 text-green-600" />
					<span>99.9% Uptime</span>
				</div>
			</div>

			{/* Key benefits */}
			<div className="mx-auto max-w-4xl rounded-2xl border bg-white p-8 shadow-lg">
				<div className="grid gap-6 text-left md:grid-cols-3">
					<div className="space-y-2">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
							<Zap className="text-primary h-5 w-5" />
						</div>
						<h3 className="font-semibold text-gray-900">
							Get Started in Minutes
						</h3>
						<p className="text-sm text-gray-600">
							No complex setup. Start managing properties
							immediately with our intuitive platform.
						</p>
					</div>

					<div className="space-y-2">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
							<TrendingUp className="h-5 w-5 text-green-600" />
						</div>
						<h3 className="font-semibold text-gray-900">
							Scale as You Grow
						</h3>
						<p className="text-sm text-gray-600">
							Flexible plans that grow with your business. Upgrade
							anytime without losing data.
						</p>
					</div>

					<div className="space-y-2">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
							<Shield className="h-5 w-5 text-purple-600" />
						</div>
						<h3 className="font-semibold text-gray-900">
							Enterprise Security
						</h3>
						<p className="text-sm text-gray-600">
							Bank-grade encryption and compliance. Your data is
							always protected and secure.
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}
