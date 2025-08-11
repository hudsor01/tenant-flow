import { Sparkles, Shield, TrendingUp, Star, CheckCircle, Zap } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { AuthLayoutClient } from './auth-layout-client'

interface AuthLayoutProps {
	children: React.ReactNode
	side?: 'left' | 'right'
	title: string
	subtitle?: string
	description?: string
	image?: {
		src: string
		alt: string
	}
	heroContent?: {
		title: string
		description: string
	}
	features?: {
		icon: React.ReactNode
		title: string
		description: string
	}[]
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
	children,
	side = 'left',
	title,
	subtitle,
	description,
	image = {
		src: '/images/roi-up_to_the_right.jpg',
		alt: 'Property Management Dashboard'
	},
	heroContent,
	features = [
		{
			icon: <Shield className="h-5 w-5" />,
			title: 'Enterprise Security',
			description: 'SOC 2 compliant with bank-level encryption'
		},
		{
			icon: <TrendingUp className="h-5 w-5" />,
			title: 'Boost ROI by 60%',
			description: 'Streamline operations and increase profitability'
		},
		{
			icon: <Sparkles className="h-5 w-5" />,
			title: 'AI-Powered Insights',
			description: 'Smart analytics and predictive maintenance'
		},
		{
			icon: <Star className="h-5 w-5" />,
			title: 'Trusted by 10K+ Properties',
			description: 'Join property managers who love TenantFlow'
		}
	]
}) => {
	const formSection = (
		<div className="relative flex w-full items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background/95 to-muted/30 py-8 px-4 md:px-8 lg:py-12 lg:px-12 xl:px-16 min-h-screen">
			{/* Enhanced background patterns with modern gradients */}
			<div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-accent/5 to-success/8" />
			<div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-gradient-to-bl from-primary/15 via-accent/10 to-transparent blur-3xl animate-pulse" />
			<div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-gradient-to-tr from-success/15 via-primary/10 to-transparent blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
			<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-gradient-to-r from-accent/8 to-success/8 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

			{/* Floating animation elements */}
			<div className="absolute top-20 right-20 h-2 w-2 animate-bounce rounded-full bg-primary/40" style={{ animationDelay: '0.5s' }} />
			<div className="absolute top-32 right-32 h-1 w-1 animate-ping rounded-full bg-accent/50" />
			<div className="absolute bottom-32 left-16 h-3 w-3 animate-pulse rounded-full bg-success/30" style={{ animationDelay: '1.5s' }} />

			{/* Container for proper width constraints */}
			<div className="relative z-10 w-full max-w-md mx-auto">
				{/* Enhanced Branding with better visual treatment */}
				<div className="mb-12">
					<Link href="/" className="mb-10 flex items-center justify-center hover:opacity-90 transition-all duration-300 hover:scale-105 cursor-pointer group">
						<div className="relative">
							<Image
								src="/tenant-flow-logo.png"
								alt="TenantFlow - Property Management"
								width={280}
								height={90}
								className="h-auto w-auto max-h-20 object-contain drop-shadow-lg"
								priority
							/>
							{/* Subtle glow effect on hover */}
							<div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
						</div>
					</Link>

					<div className="text-center space-y-3">
						<h1 className="text-foreground text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
							{title}
						</h1>
						<p className="text-muted-foreground text-base leading-relaxed max-w-sm mx-auto">
							{subtitle || description}
						</p>
						
						{/* Trust indicators */}
						<div className="flex items-center justify-center space-x-6 mt-6 pt-4 border-t border-border/30">
							<div className="flex items-center space-x-2 text-xs text-muted-foreground">
								<Shield className="w-4 h-4 text-success" />
								<span className="font-medium">SOC 2 Certified</span>
							</div>
							<div className="flex items-center space-x-2 text-xs text-muted-foreground">
								<CheckCircle className="w-4 h-4 text-success" />
								<span className="font-medium">10K+ Properties</span>
							</div>
						</div>
					</div>
				</div>

				{/* Form Content with Client-side animations */}
				<AuthLayoutClient side={side}>
					{children}
				</AuthLayoutClient>
			</div>
		</div>
	)

	const imageSection = (
		<div className="relative hidden overflow-hidden lg:block lg:w-1/2 min-h-screen">
			{/* Enhanced gradient overlay with modern colors */}
			<div className="absolute inset-0 z-10 bg-gradient-to-br from-primary/40 via-accent/30 to-success/35" />
			<div className="absolute inset-0 z-20 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
			<div className="absolute inset-0 z-15 bg-gradient-to-r from-transparent via-primary/10 to-accent/15" />

			{/* Hero image */}
			<Image
				src={image.src}
				alt={image.alt}
				fill
				sizes="50vw"
				className="object-cover transition-transform duration-700 hover:scale-105"
			/>

			{/* Hero content with enhanced styling */}
			<div className="absolute right-0 bottom-0 left-0 z-30 p-10 text-white">
				<div className="max-w-lg">
					{/* Enhanced hero title with gradient text */}
					<div className="mb-6">
						<div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm font-medium mb-4">
							<Star className="w-4 h-4 mr-2 text-amber-300" />
							<span>Rated #1 Property Management Platform</span>
						</div>
						<h2 className="text-4xl lg:text-5xl leading-tight font-bold mb-4 bg-gradient-to-r from-white via-white/95 to-white/90 bg-clip-text text-transparent">
							{heroContent?.title || 'Transform Your Property Management'}
						</h2>
						<p className="text-xl leading-relaxed opacity-90 text-white/90">
							{heroContent?.description || 'Join thousands of property owners who are streamlining their operations with TenantFlow'}
						</p>
					</div>

					{/* Enhanced feature highlights with better visual treatment */}
					<div className="grid grid-cols-1 gap-4">
						{features.map((feature, index) => (
							<div
								key={index}
								className="flex items-center gap-4 p-4 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/15 transition-all duration-300"
							>
								<div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-white/25 to-white/15 backdrop-blur-sm">
									{feature.icon}
								</div>
								<div className="flex-1">
									<div className="font-semibold text-white mb-1">
										{feature.title}
									</div>
									<div className="text-sm text-white/80 leading-relaxed">
										{feature.description}
									</div>
								</div>
							</div>
						))}
					</div>

					{/* Enhanced social proof */}
					<div className="mt-8 pt-6 border-t border-white/20">
						<div className="flex items-center space-x-8 text-sm">
							<div className="flex items-center space-x-2">
								<div className="flex -space-x-2">
									{[...Array(4)].map((_, i) => (
										<div key={i} className="w-8 h-8 rounded-full bg-gradient-to-r from-white/20 to-white/10 border-2 border-white/30 flex items-center justify-center">
											<CheckCircle className="w-4 h-4 text-success" />
										</div>
									))}
								</div>
								<span className="text-white/90 font-medium">10,000+ Happy Customers</span>
							</div>
							<div className="flex items-center space-x-2">
								<Zap className="w-4 h-4 text-accent" />
								<span className="text-white/90">60% Faster Operations</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Enhanced floating elements with better animations */}
			<div className="absolute top-20 right-20 h-3 w-3 animate-bounce rounded-full bg-gradient-to-r from-accent to-success shadow-lg" style={{ animationDelay: '0.5s' }} />
			<div className="absolute top-40 right-40 h-2 w-2 animate-ping rounded-full bg-gradient-to-r from-primary to-accent" />
			<div className="absolute right-16 bottom-40 h-4 w-4 animate-pulse rounded-full bg-gradient-to-r from-success to-primary shadow-lg" style={{ animationDelay: '1.5s' }} />
			<div className="absolute top-1/2 right-12 h-1 w-1 animate-pulse rounded-full bg-white/50" style={{ animationDelay: '2s' }} />
			<div className="absolute top-1/3 right-28 h-2 w-2 animate-bounce rounded-full bg-white/30" style={{ animationDelay: '2.5s' }} />
		</div>
	)

	if (side === 'right') {
		return (
			<div className="flex min-h-screen">
				{imageSection}
				{formSection}
			</div>
		)
	}

	return (
		<div className="flex min-h-screen">
			{formSection}
			{imageSection}
		</div>
	)
}

export default AuthLayout
