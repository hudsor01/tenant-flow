import React from 'react'
import { motion } from 'framer-motion'
import { Building2, Sparkles, Shield, TrendingUp } from 'lucide-react'

interface AuthLayoutProps {
	children: React.ReactNode
	side?: 'left' | 'right'
	title: string
	subtitle: string
	image: {
		src: string
		alt: string
	}
	heroContent: {
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
	image,
	heroContent,
	features = [
		{
			icon: <Shield className="h-5 w-5" />,
			title: 'Secure & Reliable',
			description: 'Bank-level security for your property data'
		},
		{
			icon: <TrendingUp className="h-5 w-5" />,
			title: 'Boost Efficiency',
			description: 'Streamline operations by up to 60%'
		},
		{
			icon: <Sparkles className="h-5 w-5" />,
			title: 'Modern Interface',
			description: 'Intuitive design that just works'
		}
	]
}) => {
	const formSection = (
		<div className="from-background via-background to-muted/20 relative flex w-full items-center justify-center overflow-hidden bg-gradient-to-br p-8 lg:w-1/2">
			{/* Subtle background patterns */}
			<div className="from-primary/5 to-secondary/5 absolute inset-0 bg-gradient-to-br via-transparent" />
			<div className="from-primary/10 absolute top-0 right-0 h-64 w-64 rounded-full bg-gradient-to-bl to-transparent blur-3xl" />
			<div className="from-secondary/10 absolute bottom-0 left-0 h-48 w-48 rounded-full bg-gradient-to-tr to-transparent blur-3xl" />

			<motion.div
				initial={{ opacity: 0, x: side === 'left' ? -20 : 20 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.6, ease: 'easeOut' }}
				className="relative z-10 w-full max-w-md"
			>
				{/* Enhanced Branding */}
				<div className="mb-10">
					<motion.div
						className="mb-8 flex items-center"
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2 }}
					>
						<div className="relative">
							<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-purple-600 shadow-lg shadow-blue-600/25">
								<Building2 className="h-7 w-7 text-white" />
							</div>
							<div className="absolute -top-1 -right-1 h-4 w-4 animate-pulse rounded-full bg-gradient-to-br from-green-400 to-green-500" />
						</div>
						<div className="ml-4">
							<span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-2xl font-bold text-transparent">
								TenantFlow
							</span>
							<div className="text-muted-foreground text-xs font-medium">
								Property Management
							</div>
						</div>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
					>
						<h1 className="text-foreground mb-3 text-3xl leading-tight font-bold">
							{title}
						</h1>
						<p className="text-muted-foreground text-lg leading-relaxed">
							{subtitle}
						</p>
					</motion.div>
				</div>

				{/* Form Content */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.4 }}
				>
					{children}
				</motion.div>
			</motion.div>
		</div>
	)

	const imageSection = (
		<motion.div
			className="relative hidden overflow-hidden lg:block lg:w-1/2"
			initial={{ opacity: 0, scale: 1.05 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ duration: 0.8, delay: 0.2 }}
		>
			{/* Enhanced gradient overlay */}
			<div className="absolute inset-0 z-10 bg-gradient-to-br from-blue-600/30 via-purple-600/20 to-indigo-600/30" />
			<div className="absolute inset-0 z-20 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

			{/* Hero image */}
			<img
				src={image.src}
				alt={image.alt}
				className="h-full w-full object-cover"
			/>

			{/* Hero content with enhanced styling */}
			<div className="absolute right-0 bottom-0 left-0 z-30 p-10 text-white">
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.6, duration: 0.6 }}
				>
					<h2 className="mb-4 text-4xl leading-tight font-bold">
						{heroContent.title}
					</h2>
					<p className="mb-8 text-lg leading-relaxed opacity-90">
						{heroContent.description}
					</p>

					{/* Feature highlights */}
					<div className="grid grid-cols-1 gap-4">
						{features.map((feature, index) => (
							<motion.div
								key={index}
								initial={{ opacity: 0, x: -20 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: 0.8 + index * 0.1 }}
								className="flex items-center gap-3 text-white/90"
							>
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
									{feature.icon}
								</div>
								<div>
									<div className="text-sm font-semibold">
										{feature.title}
									</div>
									<div className="text-xs opacity-75">
										{feature.description}
									</div>
								</div>
							</motion.div>
						))}
					</div>
				</motion.div>
			</div>

			{/* Floating elements for visual interest */}
			<div className="absolute top-20 right-20 h-2 w-2 animate-pulse rounded-full bg-white/30" />
			<div className="absolute top-32 right-32 h-1 w-1 animate-ping rounded-full bg-white/40" />
			<div className="absolute right-16 bottom-32 h-3 w-3 animate-pulse rounded-full bg-white/20" />
		</motion.div>
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
