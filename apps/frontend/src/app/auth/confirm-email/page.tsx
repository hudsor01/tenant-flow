'use client'

import { Button } from '@/components/ui/button'
import { GridPattern } from '@/components/magicui/grid-pattern'
import { CheckCircle2, Mail, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function ConfirmEmailPage() {
	return (
		<div className="relative min-h-screen flex flex-col lg:flex-row">
			{/* Full page grid background */}
			<GridPattern className="fixed inset-0 -z-10" />

			{/* Left Side - Image Section (Hidden on mobile) */}
			<div className="relative hidden lg:flex lg:w-1/2 min-h-screen bg-background overflow-hidden">
				{/* Background Image */}
				<div className="absolute inset-0 transform scale-105 transition-transform duration-700">
					<Image
						src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=2073&auto=format&fit=crop"
						alt="Modern apartment building"
						fill
						sizes="100vw"
						className="object-cover transition-all duration-500"
						priority
						placeholder="blur"
						blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzAwIiBoZWlnaHQ9IjQ3NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiLz4="
					/>
				</div>
				{/* Overlay */}
				<div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/20 to-black/30" />

				{/* Content Panel */}
				<div className="absolute inset-0 flex items-center justify-center">
					<div className="relative max-w-lg mx-auto px-8">
						{/* Semi-transparent panel */}
						<div className="absolute inset-0 rounded-3xl bg-card/85 backdrop-blur-sm border border-border/20 shadow-2xl" />

						<div className="relative text-center space-y-6 py-12 px-8 z-20">
							{/* Logo */}
							<div className="w-16 h-16 mx-auto mb-8 relative group">
								<div className="absolute inset-0 bg-gradient-to-r from-primary/50 to-primary/60 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500" />
								<div className="relative w-full h-full bg-primary rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
									<svg
										viewBox="0 0 24 24"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
										className="w-8 h-8 text-primary-foreground"
									>
										<path
											d="M3 21L21 21M5 21V7L12 3L19 7V21M9 12H15M9 16H15"
											stroke="currentColor"
											strokeWidth="1.5"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>
								</div>
							</div>

							<h2 className="text-foreground font-bold text-3xl">
								You&apos;re Almost There!
							</h2>

							<p className="text-muted-foreground text-lg leading-relaxed">
								Just one more step to unlock your property management dashboard
								and start saving $2,400+ per property annually.
							</p>

							{/* Stats */}
							<div className="grid grid-cols-3 gap-6 pt-6">
								<div className="text-center group">
									<div className="text-foreground font-bold text-2xl mb-1">
										$2.4K+
									</div>
									<div className="text-muted-foreground text-sm leading-tight font-medium">
										Saved Per
										<br />
										Property
									</div>
								</div>
								<div className="text-center group">
									<div className="text-foreground font-bold text-2xl mb-1">
										90 sec
									</div>
									<div className="text-muted-foreground text-sm leading-tight font-medium">
										Setup
										<br />
										Time
									</div>
								</div>
								<div className="text-center group">
									<div className="text-foreground font-bold text-2xl mb-1">
										98.7%
									</div>
									<div className="text-muted-foreground text-sm leading-tight font-medium">
										Success
										<br />
										Rate
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Right Side - Content Section */}
			<div className="flex-1 lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-background min-h-screen">
				<div className="w-full max-w-md space-y-8">
					{/* Logo (Mobile only) */}
					<div className="lg:hidden flex justify-center mb-8">
						<div className="flex items-center space-x-3">
							<div className="w-10 h-10 rounded-xl overflow-hidden bg-primary border border-border flex items-center justify-center shadow-lg">
								<svg
									viewBox="0 0 24 24"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
									className="w-6 h-6 text-primary-foreground"
								>
									<path
										d="M3 21L21 21M5 21V7L12 3L19 7V21M9 12H15M9 16H15"
										stroke="currentColor"
										strokeWidth="1.5"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</div>
							<span className="text-2xl font-bold text-foreground tracking-tight">
								TenantFlow
							</span>
						</div>
					</div>

					{/* Header */}
					<div className="space-y-4">
						{/* Icon */}
						<div className="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border border-primary/20 shadow-lg">
							<Mail className="w-10 h-10 text-primary" />
						</div>

						<div className="text-center space-y-2">
							<h1 className="text-4xl font-bold text-foreground tracking-tight">
								Check Your Email
							</h1>
							<p className="text-lg text-muted-foreground leading-relaxed">
								We&apos;ve sent a confirmation link to your email address
							</p>
						</div>
					</div>

					{/* Instructions Card */}
					<div className="bg-muted/30 border border-border rounded-2xl p-6 space-y-4">
						<h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
							<CheckCircle2 className="w-5 h-5 text-primary" />
							What&apos;s next?
						</h3>
						<ol className="space-y-4">
							<li className="flex items-start gap-3">
								<span className="flex-shrink-0 w-7 h-7 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm font-bold">
									1
								</span>
								<div className="pt-0.5">
									<p className="text-foreground font-medium">
										Check your email inbox
									</p>
									<p className="text-sm text-muted-foreground">
										Don&apos;t forget to check your spam folder
									</p>
								</div>
							</li>
							<li className="flex items-start gap-3">
								<span className="flex-shrink-0 w-7 h-7 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm font-bold">
									2
								</span>
								<div className="pt-0.5">
									<p className="text-foreground font-medium">
										Click the confirmation link
									</p>
									<p className="text-sm text-muted-foreground">
										The link expires in 24 hours
									</p>
								</div>
							</li>
							<li className="flex items-start gap-3">
								<span className="flex-shrink-0 w-7 h-7 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm font-bold">
									3
								</span>
								<div className="pt-0.5">
									<p className="text-foreground font-medium">
										Start managing properties
									</p>
									<p className="text-sm text-muted-foreground">
										You&apos;ll be redirected to your dashboard
									</p>
								</div>
							</li>
						</ol>
					</div>

					{/* Actions */}
					<div className="space-y-4">
						<p className="text-sm text-muted-foreground text-center">
							Didn&apos;t receive the email?
						</p>

						<div className="flex flex-col sm:flex-row gap-3">
							<Button
								variant="outline"
								size="lg"
								className="flex-1"
								onClick={() => window.location.reload()}
							>
								Resend Email
							</Button>

							<Button variant="default" size="lg" className="flex-1" asChild>
								<Link href="/login">
									Back to Sign In
									<ArrowRight className="ml-2 h-4 w-4" />
								</Link>
							</Button>
						</div>
					</div>

					{/* Support */}
					<div className="pt-6 border-t border-border">
						<p className="text-sm text-muted-foreground text-center">
							Need help?{' '}
							<Link
								href="mailto:support@tenantflow.app"
								className="text-primary hover:underline font-medium"
							>
								Contact Support
							</Link>
						</p>
					</div>

					{/* Trust Signals */}
					<div className="flex items-center justify-center gap-8 text-xs text-muted-foreground pt-4">
						<div className="flex items-center gap-2">
							<CheckCircle2 className="w-4 h-4" />
							<span>Bank-level Security</span>
						</div>
						<div className="flex items-center gap-2">
							<CheckCircle2 className="w-4 h-4" />
							<span>99.9% Uptime</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
