'use client'

import { ArrowLeft, Sparkles } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { LoginForm } from 'src/components/auth/login-form'
import { AnimatedGradientText } from 'src/components/magicui/animated-gradient-text'
import { BlurFade } from 'src/components/magicui/blur-fade'
import { BorderBeam } from 'src/components/magicui/border-beam'
import { Particles } from 'src/components/magicui/particles'
import { Button } from 'src/components/ui/button'

export default function RegisterPage() {
	return (
		<div className="min-h-screen surface-glow overflow-hidden">
			{/* Background Effects */}
			<div className="fixed inset-0 bg-grid-small-black/[0.02] dark:bg-grid-small-white/[0.02] pointer-events-none" />
			<Particles
				className="fixed inset-0 pointer-events-none"
				quantity={30}
				ease={80}
				color="hsl(var(--primary))"
				refresh
			/>

			<div className="relative z-10 min-h-screen grid lg:grid-cols-2">
				{/* Left Side - Form */}
				<div className="flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
					<div className="mx-auto w-full max-w-md space-y-8">
						{/* Back Button */}
						<BlurFade delay={0.1} inView>
							<Link href="/">
								<Button variant="ghost" className="mb-8 -ms-3">
									<ArrowLeft className="w-4 h-4 me-2" />
									Back to Home
								</Button>
							</Link>
						</BlurFade>

						{/* Header */}
						<BlurFade delay={0.2} inView>
							<div className="text-center lg:text-left">
								<AnimatedGradientText className="inline-flex items-center justify-center mb-4">
									<Sparkles className="w-4 h-4 me-2" />
									<span className="text-gradient-authority">
										Join TenantFlow Today
									</span>
								</AnimatedGradientText>

								<h1 className="text-4xl font-heading font-bold tracking-tight text-gradient-authority mb-4">
									Create Your Account
								</h1>

								<p className="text-lg text-muted-foreground">
									Start managing properties like a pro.
									<span className="block mt-1 font-medium text-foreground">
										14-day free trial, no credit card required.
									</span>
								</p>
							</div>
						</BlurFade>

						{/* Form */}
						<BlurFade delay={0.3} inView>
							<div className="relative">
								<div className="card-elevated-authority card-padding rounded-2xl">
									<BorderBeam size={200} duration={12} delay={9} />
									<LoginForm mode="signup" />
								</div>
							</div>
						</BlurFade>

						{/* Sign In Link */}
						<BlurFade delay={0.4} inView>
							<div className="text-center">
								<p className="text-muted-foreground">
									Already have an account?{' '}
									<Link
										href="/auth/login"
										className="font-medium text-primary hover:text-primary/80 transition-colors"
									>
										Sign in here
									</Link>
								</p>
							</div>
						</BlurFade>
					</div>
				</div>

				{/* Right Side - High-Res Image */}
				<BlurFade delay={0.5} inView>
					<div className="hidden lg:block relative">
						<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/10 to-muted/20" />

						{/* Dashboard Preview */}
						<div className="relative h-full flex items-center justify-center p-12">
							<div className="relative max-w-2xl w-full">
								<div className="card-elevated-authority p-6 rounded-3xl border-2 group hover:scale-105 transition-transform duration-700">
									<BorderBeam size={300} duration={15} delay={12} />

									<div className="aspect-[4/3] rounded-2xl overflow-hidden relative">
										<Image
											src="/assets/dashboard-clean-demo.png"
											alt="TenantFlow Dashboard Preview"
											fill
											className="object-cover object-top"
										/>

										{/* Overlay Features */}
										<div className="absolute inset-0 bg-gradient-to-t from-foreground/20 via-transparent to-transparent" />

										{/* Feature Badges - Professional Authority Styling */}
										<div className="absolute top-6 left-6">
											<div className="bg-accent text-accent-foreground backdrop-blur-sm px-4 py-2 rounded-xl font-semibold">
												Real-time Analytics
											</div>
										</div>

										<div className="absolute top-6 right-6">
											<div className="bg-primary text-primary-foreground backdrop-blur-sm px-4 py-2 rounded-xl font-semibold">
												AI-Powered Insights
											</div>
										</div>

										<div className="absolute bottom-6 left-6">
											<div className="bg-muted text-muted-foreground backdrop-blur-sm px-4 py-2 rounded-xl font-semibold">
												Automated Workflows
											</div>
										</div>

										<div className="absolute bottom-6 right-6">
											<div className="bg-accent text-accent-foreground backdrop-blur-sm px-4 py-2 rounded-xl font-semibold">
												Smart Reporting
											</div>
										</div>
									</div>
								</div>

								{/* Trust Indicators - Professional Authority */}
								<div className="mt-8 text-center space-y-4">
									<div className="flex justify-center gap-4">
										<div className="bg-accent text-accent-foreground px-4 py-2 rounded-xl font-semibold">
											SOC 2 Compliant
										</div>
										<div className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-semibold">
											GDPR Ready
										</div>
										<div className="bg-muted text-muted-foreground px-4 py-2 rounded-xl font-semibold">
											Enterprise Security
										</div>
									</div>

									<p className="text-muted-foreground">
										Trusted by{' '}
										<span className="font-bold text-gradient-authority">
											10,000+
										</span>{' '}
										property managers
									</p>
								</div>
							</div>
						</div>
					</div>
				</BlurFade>
			</div>
		</div>
	)
}
