'use client'

import { cn } from '@/lib/utils'
import { getSemanticTypography } from '@repo/shared'
import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface HeroSectionProps {
	className?: string
}

export function HeroSection({ className }: HeroSectionProps) {
	return (
		<div className={cn('relative overflow-hidden bg-white', className)}>
			{/* Apple-style background with subtle gradient */}
			<div className="absolute inset-0 bg-gradient-to-b from-[#FAFAFA] via-white to-[#F7F7F7]" />

			<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
				<div className="max-w-4xl text-center mx-auto">
					{/* Typography - Page Title */}
					<h1 className={cn(getSemanticTypography('page-title'), "sm:text-[34px] md:text-[42px] lg:text-[50px] text-[#000000D9]")}>
						Property Management Made{' '}
						<span className="bg-gradient-to-r from-[#0D6FFF] to-[#0D6FFFD9] bg-clip-text text-transparent">
							Simple
						</span>
					</h1>
					{/* Typography - Page Subtitle */}
					<p className={cn(getSemanticTypography('page-subtitle'), "mt-8 sm:text-[19px] lg:text-[21px] text-[#00000080] max-w-3xl mx-auto")}>
						Streamline tenant management, track maintenance, and maximize your
						real estate investments with our intuitive platform.
					</p>
				</div>

				<div className="mt-16 relative max-w-6xl mx-auto">
					{/* Premium Property Image Showcase */}
					<div className="relative w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-[24px] overflow-hidden shadow-2xl">
						{/* Beautiful real estate image */}
						<Image
							src="https://images.unsplash.com/photo-1558036117-15d82a90b9b1?q=80&w=2070&auto=format&fit=crop"
							alt="Modern luxury apartment building with beautiful architecture"
							fill
							className="object-cover"
							priority
							sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
						/>

						{/* Gradient overlay for better text readability */}
						<div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />

						{/* Floating feature badges */}
						<div className="absolute bottom-8 left-8 right-8 flex flex-wrap gap-3">
							<div className="backdrop-blur-xl bg-white/90 px-4 py-2 rounded-full border border-white/20 shadow-lg">
								<span className="text-sm font-semibold text-gray-800">📊 Real-time Analytics</span>
							</div>
							<div className="backdrop-blur-xl bg-white/90 px-4 py-2 rounded-full border border-white/20 shadow-lg">
								<span className="text-sm font-semibold text-gray-800">🔧 Maintenance Tracking</span>
							</div>
							<div className="backdrop-blur-xl bg-white/90 px-4 py-2 rounded-full border border-white/20 shadow-lg">
								<span className="text-sm font-semibold text-gray-800">💳 Online Payments</span>
							</div>
						</div>
					</div>

					{/* Subtle ambient lighting effects */}
					<div className="absolute -bottom-20 -left-32 -z-10">
						<div className="w-64 h-64 bg-gradient-to-br from-[#0D6FFF15] to-transparent rounded-full blur-3xl opacity-70" />
					</div>

					<div className="absolute -top-20 -right-32 -z-10">
						<div className="w-64 h-64 bg-gradient-to-tr from-[#0D6FFF10] to-transparent rounded-full blur-3xl opacity-70" />
					</div>
				</div>

				{/* Apple Content Area Primary Buttons */}
				<div className="mt-20 flex flex-col sm:flex-row items-center justify-center gap-6">
					<Link href="/auth/signup" className="group relative overflow-hidden">
						{/* Apple Primary Default - Active Idle */}
						<div
							className="absolute inset-0 rounded-[16px] blur-sm group-hover:blur-md transition-all duration-300"
							style={{
								background:
									'linear-gradient(135deg, #0D6FFF50 0%, #0D6FFF50 50%, #0D6FFF 100%)'
							}}
						/>
						<div
							className="relative flex items-center justify-center min-w-[240px] px-8 py-4 rounded-[16px] shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 ease-out group-hover:opacity-95"
							style={{
								background:
									'linear-gradient(135deg, #0D6FFF50 0%, #0D6FFF50 50%, #0D6FFF 100%)',
								border: '1px solid #00000014'
							}}
						>
							{/* Typography - Primary Button */}
							<span className={cn(getSemanticTypography('button-primary'), "text-white")}>
								Get Started Free
							</span>
							<ArrowRight className="ml-2 h-4 w-4 text-white" />
						</div>
					</Link>

					<Link href="/demo" className="group relative overflow-hidden">
						{/* Apple Bordered Neutral - Off Idle */}
						<div
							className="relative flex items-center justify-center min-w-[240px] px-8 py-4 rounded-[16px] shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 ease-out"
							style={{
								background: '#0000000D',
								border: '1px solid #00000014',
								backdropFilter: 'blur(20px)'
							}}
						>
							{/* Typography - Secondary Button */}
							<span className={cn(getSemanticTypography('button-secondary'), "text-[#000000D9]")}>
								View Live Demo
							</span>
						</div>
					</Link>
				</div>

				{/* Trust indicators with typography */}
				<div className="mt-16 text-center">
					{/* Typography - Meta Text */}
					<p className={cn(getSemanticTypography('meta'), "text-[#00000040] mb-8")}>
						Trusted by property managers worldwide
					</p>
					<div className="flex items-center justify-center gap-12 flex-wrap">
						<div className="text-center">
							{/* Typography - Stat Value */}
							<div className={cn(getSemanticTypography('stat-value'), "text-[#000000D9]")}>
								500+
							</div>
							{/* Typography - Stat Label */}
							<div className={cn(getSemanticTypography('copyright'), "text-[#00000040] mt-1")}>
								Properties Managed
							</div>
						</div>
						<div className="text-center">
							<div className={cn(getSemanticTypography('stat-value'), "text-[#000000D9]")}>
								10K+
							</div>
							<div className={cn(getSemanticTypography('copyright'), "text-[#00000040] mt-1")}>
								Happy Tenants
							</div>
						</div>
						<div className="text-center">
							<div className={cn(getSemanticTypography('stat-value'), "text-[#000000D9]")}>
								99.9%
							</div>
							<div className={cn(getSemanticTypography('copyright'), "text-[#00000040] mt-1")}>
								Platform Uptime
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export default HeroSection
