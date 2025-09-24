'use client'

import Footer from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function HomePage() {
	const router = useRouter()

	return (
		<div className="min-h-screen bg-background flex flex-col">
			{/* Navigation */}
			<nav className="fixed top-6 left-1/2 z-50 w-auto -translate-x-1/2 transform rounded-full px-8 py-4 backdrop-blur-xl border border-border shadow-lg bg-background/90">
				<div className="flex items-center justify-between gap-12">
					<Link
						href="/"
						className="flex items-center space-x-3 hover:opacity-80 transition-opacity duration-200"
					>
						<div className="w-8 h-8 rounded-lg overflow-hidden bg-primary border border-border flex items-center justify-center">
							<svg
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								className="w-5 h-5 text-primary-foreground"
							>
								<path
									d="M3 21L21 21M5 21V7L12 3L19 7V21M9 12H15M9 16H15"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</div>
						<span className="text-xl font-bold text-foreground tracking-tight">
							TenantFlow
						</span>
					</Link>

					<div className="hidden md:flex items-center space-x-1">
						<Link
							href="/pricing"
							className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium text-sm rounded-xl hover:bg-accent transition-all duration-200"
						>
							Pricing
						</Link>
						<Link
							href="/faq"
							className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium text-sm rounded-xl hover:bg-accent transition-all duration-200"
						>
							FAQ
						</Link>
					</div>

					<div className="flex items-center space-x-3">
						<Link
							href="/login"
							className="hidden sm:flex px-4 py-2 text-foreground rounded-xl hover:bg-accent transition-all duration-300 font-medium"
						>
							Sign In
						</Link>
						<Link
							href="/login"
							className="flex items-center px-6 py-2.5 bg-primary text-primary-foreground font-medium text-sm rounded-xl hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl"
						>
							Get Started
							<ArrowRight className="ml-2 h-4 w-4" />
						</Link>
					</div>
				</div>
			</nav>

			{/* Hero Section */}
			<section className="relative flex-1 flex flex-col">
				{/* Trust Badge */}
				<div className="pt-32 pb-8 text-center">
					<div className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-primary/25 bg-primary/10">
						<div className="w-2 h-2 bg-[var(--color-success)] rounded-full mr-3 animate-pulse" />
						<span className="text-muted-foreground font-medium text-sm">
							Trusted by 10,000+ property managers
						</span>
					</div>
				</div>

				{/* Hero Container - Full Width */}
				<div className="flex-1 w-full">
					<div className="max-w-7xl mx-auto px-6 lg:px-8">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center min-h-[600px]">
							{/* Left Side - Content */}
							<div className="flex flex-col justify-center space-y-8">
								<div className="space-y-6">
									<h1 className="text-5xl lg:text-7xl font-bold text-foreground tracking-tight leading-[1.1]">
										Stop juggling
										<span className="block text-primary">multiple tools</span>
									</h1>

									<p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
										TenantFlow brings all your property management needs
										together. Streamline operations, automate workflows, and
										scale your business.
									</p>
								</div>

								<div className="flex flex-row gap-4">
									<Button onClick={() => router.push('/login')}>
										Get Started Free
										<ArrowRight className="ml-2 h-4 w-4" />
									</Button>
									<Button
										variant="outline"
										onClick={() => router.push('/pricing')}
									>
										View Pricing
									</Button>
								</div>

								<p className="text-sm text-muted-foreground font-medium">
									No setup fees • Enterprise security • 99.9% uptime SLA
								</p>
							</div>

							{/* Right Side - Image */}
							<div className="relative">
								<div className="relative h-[600px] rounded-3xl overflow-hidden shadow-2xl">
									<Image
										src="https://images.unsplash.com/photo-1558036117-15d82a90b9b1?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3"
										alt="Modern luxury apartment building showcasing TenantFlow property management"
										fill
										className="object-cover"
										priority
										sizes="(max-width: 768px) 100vw, 50vw"
									/>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			<Footer />
		</div>
	)
}
