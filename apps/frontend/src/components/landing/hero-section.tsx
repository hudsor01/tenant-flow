import { Badge } from '@/components/ui/badge'
import { Sparkles, Shield, Zap, Users } from 'lucide-react'
import { HeroButtons } from './hero-buttons'

export function HeroSection() {
	return (
		<section className="relative flex min-h-[90vh] items-center overflow-hidden px-4 pt-32 pb-20">
			{/* Enhanced gradient background with glassmorphism */}
			<div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-purple-50/50 to-pink-50/50" />

			{/* Animated blobs with better colors */}
			<div className="absolute inset-0">
				<div className="animate-blob absolute top-20 left-20 h-96 w-96 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 opacity-20 mix-blend-multiply blur-3xl filter" />
				<div className="animate-blob animation-delay-2000 absolute top-40 right-20 h-96 w-96 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 opacity-20 mix-blend-multiply blur-3xl filter" />
				<div className="animate-blob animation-delay-4000 absolute -bottom-8 left-40 h-96 w-96 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 opacity-20 mix-blend-multiply blur-3xl filter" />
			</div>

			<div className="relative z-10 container mx-auto text-center">
				{/* Enhanced badge with shadow */}
				<Badge className="from-primary mb-6 border-0 bg-gradient-to-r to-purple-600 px-4 py-1.5 text-white shadow-lg shadow-purple-500/20">
					<Sparkles className="mr-2 h-4 w-4" />
					New: AI-Powered Lease Generator Now Available
				</Badge>

				{/* Enhanced heading with better typography */}
				<h1 className="animate-fade-in-up mb-6 text-6xl font-bold md:text-8xl">
					<span className="text-gray-900">Property Management</span>
					<span className="from-primary mt-2 block bg-gradient-to-r via-purple-600 to-pink-600 bg-clip-text text-transparent">
						Made Simple
					</span>
				</h1>

				{/* Enhanced subtitle */}
				<p className="animate-fade-in-up animation-delay-200 mx-auto mb-12 max-w-3xl text-xl leading-relaxed text-gray-600 md:text-2xl">
					Save 10+ hours per week with the all-in-one platform trusted
					by 10,000+ property managers
				</p>

				{/* CTA Buttons */}
				<HeroButtons />

				{/* Trust indicators with icons */}
				<div className="animate-fade-in-up animation-delay-600 mt-12 flex flex-col items-center justify-center gap-6 text-sm text-gray-600 sm:flex-row">
					<div className="flex items-center gap-2">
						<Shield className="h-4 w-4 text-green-600" />
						<span>No credit card required</span>
					</div>
					<div className="flex items-center gap-2">
						<Zap className="text-primary h-4 w-4" />
						<span>Setup in 5 minutes</span>
					</div>
					<div className="flex items-center gap-2">
						<Users className="h-4 w-4 text-purple-600" />
						<span>Join 10,000+ users</span>
					</div>
				</div>
			</div>
		</section>
	)
}
