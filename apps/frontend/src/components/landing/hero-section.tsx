import { Badge } from '@/components/ui/badge'
import { Sparkles, Shield, Zap, Users } from 'lucide-react'
import { HeroButtons } from './hero-buttons'

export function HeroSection() {
	return (
		<section className="relative flex min-h-[90vh] items-center overflow-hidden px-4 pt-32 pb-20">
			{/* Brand-consistent hero background */}
			<div className="bg-hero absolute inset-0" />

			{/* Animated blobs with brand colors */}
			<div className="absolute inset-0">
				<div className="animate-blob bg-simplify-soft absolute top-20 left-20 h-96 w-96 rounded-full opacity-30 mix-blend-multiply blur-3xl filter" />
				<div className="animate-blob animation-delay-2000 bg-simplify-radial absolute top-40 right-20 h-96 w-96 rounded-full opacity-25 mix-blend-multiply blur-3xl filter" />
				<div className="animate-blob animation-delay-4000 bg-simplify-soft absolute -bottom-8 left-40 h-96 w-96 rounded-full opacity-20 mix-blend-multiply blur-3xl filter" />
			</div>

			<div className="relative z-10 container mx-auto text-center">
				{/* Brand-consistent badge */}
				<Badge className="bg-simplify shadow-simplify mb-6 border-0 px-4 py-1.5 text-white">
					<Sparkles className="mr-2 h-4 w-4" />
					New: AI-Powered Lease Generator Now Available
				</Badge>

				{/* Brand typography with "Simplify" gradient */}
				<h1 className="animate-fade-in-up mb-6">
					<span className="text-display-2xl block text-gray-900">
						Property Management
					</span>
					<span className="text-brand-hero mt-2 block">
						Made Simple
					</span>
				</h1>

				{/* Brand-consistent subtitle with improved typography */}
				<p className="animate-fade-in-up animation-delay-200 text-body-xl mx-auto mb-12 max-w-3xl text-gray-600">
					Save 10+ hours per week with the all-in-one platform trusted
					by 10,000+ property managers
				</p>

				{/* CTA Buttons */}
				<HeroButtons />

				{/* Trust indicators with brand-consistent colors */}
				<div className="animate-fade-in-up animation-delay-600 text-ui-md mt-12 flex flex-col items-center justify-center gap-6 text-gray-600 sm:flex-row">
					<div className="flex items-center gap-2">
						<Shield className="h-4 w-4 text-green-600" />
						<span>No credit card required</span>
					</div>
					<div className="flex items-center gap-2">
						<Zap
							className="h-4 w-4"
							style={{ color: 'oklch(0.52 0.18 235)' }}
						/>
						<span>Setup in 5 minutes</span>
					</div>
					<div className="flex items-center gap-2">
						<Users
							className="h-4 w-4"
							style={{ color: 'oklch(0.55 0.14 200)' }}
						/>
						<span>Join 10,000+ users</span>
					</div>
				</div>
			</div>
		</section>
	)
}
