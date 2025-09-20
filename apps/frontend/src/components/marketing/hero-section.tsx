'use client'

import { cn } from '@/lib/utils'
import { ArrowRight, Play } from 'lucide-react'
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
					{/* Apple Typography System - LargeTitle Emphasized */}
					<h1 className="text-[26px] sm:text-[34px] md:text-[42px] lg:text-[50px] font-bold text-[#000000D9] tracking-[0px] leading-[1.231] font-['SF_Pro']">
						Property Management Made{' '}
						<span className="bg-gradient-to-r from-[#0D6FFF] to-[#0D6FFFD9] bg-clip-text text-transparent">
							Simple
						</span>
					</h1>
					{/* Apple Typography System - Title2 */}
					<p className="mt-8 text-[17px] sm:text-[19px] lg:text-[21px] text-[#00000080] max-w-3xl mx-auto leading-[1.294] font-['SF_Pro'] font-normal tracking-[0px]">
						Streamline tenant management, track maintenance, and maximize your
						real estate investments with our intuitive platform.
					</p>
				</div>

				<div className="mt-16 relative max-w-5xl mx-auto">
					{/* Apple Liquid Glass Design System */}
					<div
						className="relative w-full h-[400px] sm:h-[480px] lg:h-[560px] rounded-[28px] overflow-hidden"
						style={{
							background: 'linear-gradient(135deg, #FFFFFFB3 0%, #FAFAFA 100%)',
							border: '0.5px solid #0000001A',
							boxShadow:
								'0px 0px 25px #00000029, 0px 0px 8px 1px #00000033, -1px -1px 2px #1A1A1A, 1px 1px 2px #1A1A1A, 2px 2px 0.25px -1.5px #FFFFFFB3, 0px 0px 2px #0000001A'
						}}
					>
						{/* Apple Premium glass fill */}
						<div
							className="absolute inset-0"
							style={{
								background:
									'linear-gradient(135deg, #FFFFFF66 0%, #FAFAFA 100%)'
							}}
						/>

						{/* Apple Focus Ring Pattern */}
						<div
							className="absolute inset-0 opacity-20"
							style={{
								backgroundImage: `radial-gradient(circle at 2px 2px, #0088FF40 1px, transparent 0)`,
								backgroundSize: '28px 28px'
							}}
						/>

						{/* Apple glass depth overlay */}
						<div className="absolute inset-0 bg-gradient-to-t from-white/30 via-transparent to-white/10" />

						{/* Apple Primary Button Design */}
						<div className="absolute inset-0 flex items-center justify-center">
							<button
								className="group flex items-center gap-4 px-8 py-4 rounded-[16px] shadow-xl hover:scale-105 transition-all duration-[300ms] ease-out"
								style={{
									background:
										'linear-gradient(135deg, #0D6FFF80 0%, #0D6FFF80 50%, #0D6FFF 100%)',
									border: '1px solid #00000014',
									backdropFilter: 'blur(20px)'
								}}
								aria-label="Play overview video"
							>
								<div className="relative">
									{/* Apple Glyph Shadow */}
									<div className="absolute inset-0 bg-[#0000002E] rounded-full blur-[10px] group-hover:bg-[#0000003D] transition-all duration-300" />
									<div
										className="relative w-14 h-14 rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-300"
										style={{
											background:
												'linear-gradient(135deg, #0D6FFF 0%, #0D6FFFD9 100%)',
											boxShadow: '0px 8px 16px #0D6FFF40'
										}}
									>
										<Play
											className="w-6 h-6 text-white ml-0.5"
											fill="currentColor"
										/>
									</div>
								</div>
								{/* Apple Typography - Headline */}
								<span className="text-[13px] font-bold text-white tracking-[0px] leading-[1.231] font-['SF_Pro']">
									Play overview
								</span>
							</button>
						</div>
					</div>

					{/* Apple-style ambient lighting */}
					<div className="absolute -bottom-16 -left-24 -z-10">
						<div className="w-56 h-56 bg-gradient-to-br from-[#0D6FFF1A] to-[#0D6FFF05] rounded-[32px] blur-3xl" />
					</div>

					<div className="absolute -top-16 -right-24 -z-10">
						<div className="w-56 h-56 bg-gradient-to-tr from-[#0D6FFF15] to-[#007AFF10] rounded-full blur-3xl" />
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
							{/* Apple Typography - Headline Emphasized */}
							<span className="text-[13px] font-bold text-white tracking-[0px] leading-[1.231] font-['SF_Pro']">
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
							{/* Apple Typography - Headline */}
							<span className="text-[13px] font-bold text-[#000000D9] tracking-[0px] leading-[1.231] font-['SF_Pro']">
								View Live Demo
							</span>
						</div>
					</Link>
				</div>

				{/* Apple Trust indicators with proper typography */}
				<div className="mt-16 text-center">
					{/* Apple Typography - Subheadline */}
					<p className="text-[11px] font-normal text-[#00000040] tracking-[0px] leading-[1.273] font-['SF_Pro'] mb-8">
						Trusted by property managers worldwide
					</p>
					<div className="flex items-center justify-center gap-12 flex-wrap">
						<div className="text-center">
							{/* Apple Typography - Title1 Emphasized */}
							<div className="text-[22px] font-bold text-[#000000D9] tracking-[0px] leading-[1.182] font-['SF_Pro']">
								500+
							</div>
							{/* Apple Typography - Caption1 */}
							<div className="text-[10px] font-normal text-[#00000040] tracking-[0px] leading-[1.3] font-['SF_Pro'] mt-1">
								Properties Managed
							</div>
						</div>
						<div className="text-center">
							<div className="text-[22px] font-bold text-[#000000D9] tracking-[0px] leading-[1.182] font-['SF_Pro']">
								10K+
							</div>
							<div className="text-[10px] font-normal text-[#00000040] tracking-[0px] leading-[1.3] font-['SF_Pro'] mt-1">
								Happy Tenants
							</div>
						</div>
						<div className="text-center">
							<div className="text-[22px] font-bold text-[#000000D9] tracking-[0px] leading-[1.182] font-['SF_Pro']">
								99.9%
							</div>
							<div className="text-[10px] font-normal text-[#00000040] tracking-[0px] leading-[1.3] font-['SF_Pro'] mt-1">
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
