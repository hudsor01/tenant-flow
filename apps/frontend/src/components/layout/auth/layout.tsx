import {
	Sparkles,
	Shield,
	TrendingUp,
	Star,
	CheckCircle,
	Zap
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { AuthLayoutClient } from './layout-client'

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
		<div className="from-background via-background/95 to-muted/30 relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br px-4 py-8 md:px-8 lg:px-12 lg:py-12 xl:px-16">
			{/* Enhanced background patterns with modern gradients */}
			<div className="from-primary/8 via-accent/5 to-success/8 absolute inset-0 bg-gradient-to-br" />
			<div className="from-primary/15 via-accent/10 absolute top-0 right-0 h-96 w-96 animate-pulse rounded-full bg-gradient-to-bl to-transparent blur-3xl" />
			<div
				className="from-success/15 via-primary/10 absolute bottom-0 left-0 h-64 w-64 animate-pulse rounded-full bg-gradient-to-tr to-transparent blur-3xl"
				style={{ animationDelay: '1s' }}
			/>
			<div
				className="from-accent/8 to-success/8 absolute top-1/2 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-gradient-to-r blur-3xl"
				style={{ animationDelay: '2s' }}
			/>

			{/* Floating animation elements */}
			<div
				className="bg-primary/40 absolute top-20 right-20 h-2 w-2 animate-bounce rounded-full"
				style={{ animationDelay: '0.5s' }}
			/>
			<div className="bg-accent/50 absolute top-32 right-32 h-1 w-1 animate-ping rounded-full" />
			<div
				className="bg-success/30 absolute bottom-32 left-16 h-3 w-3 animate-pulse rounded-full"
				style={{ animationDelay: '1.5s' }}
			/>

			{/* Container for proper width constraints */}
			<div className="relative z-10 mx-auto w-full max-w-md">
				{/* Enhanced Branding with better visual treatment */}
				<div className="mb-12">
					<Link
						href="/"
						className="group mb-10 flex cursor-pointer items-center justify-center transition-all duration-300 hover:scale-105 hover:opacity-90"
					>
						<div className="relative">
							<Image
								src="/tenant-flow-logo.png"
								alt="TenantFlow - Property Management"
								width={280}
								height={90}
								className="h-auto max-h-20 w-auto object-contain drop-shadow-lg"
								priority
							/>
							{/* Subtle glow effect on hover */}
							<div className="from-primary/20 to-accent/20 absolute inset-0 rounded-lg bg-gradient-to-r opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-50" />
						</div>
					</Link>

					<div className="space-y-3 text-center">
						<h1 className="text-foreground from-foreground to-foreground/80 bg-gradient-to-r bg-clip-text text-2xl font-bold md:text-3xl">
							{title}
						</h1>
						<p className="text-muted-foreground mx-auto max-w-sm text-base leading-relaxed">
							{subtitle ?? description}
						</p>

						{/* Trust indicators */}
						<div className="border-border/30 mt-6 flex items-center justify-center space-x-6 border-t pt-4">
							<div className="text-muted-foreground flex items-center space-x-2 text-xs">
								<Shield className="text-success h-4 w-4" />
								<span className="font-medium">
									SOC 2 Certified
								</span>
							</div>
							<div className="text-muted-foreground flex items-center space-x-2 text-xs">
								<CheckCircle className="text-success h-4 w-4" />
								<span className="font-medium">
									10K+ Properties
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Form Content with Client-side animations */}
				<AuthLayoutClient side={side}>{children}</AuthLayoutClient>
			</div>
		</div>
	)

	const imageSection = (
		<div className="relative hidden min-h-screen overflow-hidden lg:block lg:w-1/2">
			{/* Enhanced gradient overlay with modern colors */}
			<div className="from-primary/40 via-accent/30 to-success/35 absolute inset-0 z-10 bg-gradient-to-br" />
			<div className="absolute inset-0 z-20 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
			<div className="via-primary/10 to-accent/15 absolute inset-0 z-15 bg-gradient-to-r from-transparent" />

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
						<div className="mb-4 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-md">
							<Star className="mr-2 h-4 w-4 text-amber-300" />
							<span>Rated #1 Property Management Platform</span>
						</div>
						<h2 className="mb-4 bg-gradient-to-r from-white via-white/95 to-white/90 bg-clip-text text-4xl leading-tight font-bold text-transparent lg:text-5xl">
							{heroContent?.title ??
								'Transform Your Property Management'}
						</h2>
						<p className="text-xl leading-relaxed text-white/90 opacity-90">
							{heroContent?.description ??
								'Join thousands of property owners who are streamlining their operations with TenantFlow'}
						</p>
					</div>

					{/* Enhanced feature highlights with better visual treatment */}
					<div className="grid grid-cols-1 gap-4">
						{features.map((feature, index) => (
							<div
								key={index}
								className="flex items-center gap-4 rounded-lg border border-white/20 bg-white/10 p-4 text-white backdrop-blur-md transition-all duration-300 hover:bg-white/15"
							>
								<div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-white/25 to-white/15 backdrop-blur-sm">
									{feature.icon}
								</div>
								<div className="flex-1">
									<div className="mb-1 font-semibold text-white">
										{feature.title}
									</div>
									<div className="text-sm leading-relaxed text-white/80">
										{feature.description}
									</div>
								</div>
							</div>
						))}
					</div>

					{/* Enhanced social proof */}
					<div className="mt-8 border-t border-white/20 pt-6">
						<div className="flex items-center space-x-8 text-sm">
							<div className="flex items-center space-x-2">
								<div className="flex -space-x-2">
									{[...Array(4)].map((_, i) => (
										<div
											key={i}
											className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/30 bg-gradient-to-r from-white/20 to-white/10"
										>
											<CheckCircle className="text-success h-4 w-4" />
										</div>
									))}
								</div>
								<span className="font-medium text-white/90">
									10,000+ Happy Customers
								</span>
							</div>
							<div className="flex items-center space-x-2">
								<Zap className="text-accent h-4 w-4" />
								<span className="text-white/90">
									60% Faster Operations
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Enhanced floating elements with better animations */}
			<div
				className="from-accent to-success absolute top-20 right-20 h-3 w-3 animate-bounce rounded-full bg-gradient-to-r shadow-lg"
				style={{ animationDelay: '0.5s' }}
			/>
			<div className="from-primary to-accent absolute top-40 right-40 h-2 w-2 animate-ping rounded-full bg-gradient-to-r" />
			<div
				className="from-success to-primary absolute right-16 bottom-40 h-4 w-4 animate-pulse rounded-full bg-gradient-to-r shadow-lg"
				style={{ animationDelay: '1.5s' }}
			/>
			<div
				className="absolute top-1/2 right-12 h-1 w-1 animate-pulse rounded-full bg-white/50"
				style={{ animationDelay: '2s' }}
			/>
			<div
				className="absolute top-1/3 right-28 h-2 w-2 animate-bounce rounded-full bg-white/30"
				style={{ animationDelay: '2.5s' }}
			/>
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
