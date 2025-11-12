'use client'

import Footer from '#components/layout/footer'
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { GridPattern } from '#components/ui/grid-pattern'
import {
	ArrowRight,
	BookOpen,
	Clock,
	FileText,
	GraduationCap,
	HelpCircle,
	Mail,
	MessageCircle,
	PlayCircle,
	Sparkles,
	Video
} from 'lucide-react'
import Link from 'next/link'

export default function ResourcesPage() {
	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://tenantflow.app'

	// Breadcrumb Schema
	const breadcrumbSchema = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{
				'@type': 'ListItem',
				position: 1,
				name: 'Home',
				item: baseUrl
			},
			{
				'@type': 'ListItem',
				position: 2,
				name: 'Resources'
			}
		]
	}

	const mainResources = [
		{
			icon: <HelpCircle className="size-8" />,
			title: 'Help Center',
			description:
				'Comprehensive guides and tutorials to master property management',
			href: '/help',
			color: 'bg-muted border-border',
			iconColor: 'text-muted-foreground',
			stats: '50+ articles'
		},
		{
			icon: <BookOpen className="size-8" />,
			title: 'Blog',
			description:
				'Expert insights, industry trends, and best practices for owners',
			href: '/blog',
			color: 'bg-primary/10 border-primary/20',
			iconColor: 'text-primary',
			stats: 'Weekly updates'
		},
		{
			icon: <MessageCircle className="size-8" />,
			title: 'FAQ',
			description:
				'Quick answers to the most common questions about TenantFlow',
			href: '/faq',
			color: 'bg-success/10 border-success/20',
			iconColor: 'text-success',
			stats: '30+ questions'
		},
		{
			icon: <Mail className="size-8" />,
			title: 'Contact Support',
			description: 'Get personalized help from our dedicated support team',
			href: '/contact',
			color: 'bg-orange-500/10 border-orange-500/20',
			iconColor: 'text-orange-600 dark:text-orange-400',
			stats: '24-48h response'
		}
	]

	const quickLinks = [
		{
			icon: <GraduationCap className="size-5" />,
			title: 'Getting Started Guide',
			description: 'New to TenantFlow? Start here',
			href: '/help/getting-started',
			badge: 'Popular'
		},
		{
			icon: <Video className="size-5" />,
			title: 'Video Tutorials',
			description: 'Watch step-by-step walkthroughs',
			href: '/help/videos',
			badge: 'New'
		},
		{
			icon: <FileText className="size-5" />,
			title: 'Documentation',
			description: 'Complete API & feature reference',
			href: '/help/docs',
			badge: null
		},
		{
			icon: <PlayCircle className="size-5" />,
			title: 'Feature Updates',
			description: "See what's new in TenantFlow",
			href: '/blog/updates',
			badge: null
		}
	]

	const popularTopics = [
		'Setting up properties',
		'Adding tenants',
		'Collecting rent',
		'Maintenance requests',
		'Lease management',
		'Financial reports'
	]

	return (
		<div className="relative min-h-screen flex flex-col">
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(breadcrumbSchema).replace(/</g, '\\u003c')
				}}
			/>
			<GridPattern className="fixed inset-0 -z-10" />

			{/* Navigation */}
			<nav className="fixed top-6 left-1/2 z-50 w-auto translate-x-[-50%] transform rounded-full px-8 py-4 backdrop-blur-xl border border-border shadow-lg bg-background/90">
				<div className="flex items-center justify-between gap-12">
					<Link
						href="/"
						className="flex items-center space-x-3 hover:opacity-80 transition-opacity duration-200"
					>
						<div className="size-11 rounded-lg overflow-hidden bg-primary border border-border flex items-center justify-center">
							<svg
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								className="size-5 text-primary-foreground"
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
							href="/features"
							className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium text-sm rounded-xl hover:bg-accent transition-all duration-200"
						>
							Features
						</Link>
						<Link
							href="/pricing"
							className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium text-sm rounded-xl hover:bg-accent transition-all duration-200"
						>
							Pricing
						</Link>
						<Link
							href="/about"
							className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium text-sm rounded-xl hover:bg-accent transition-all duration-200"
						>
							About
						</Link>
						<Link
							href="/blog"
							className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium text-sm rounded-xl hover:bg-accent transition-all duration-200"
						>
							Blog
						</Link>
						<Link
							href="/faq"
							className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium text-sm rounded-xl hover:bg-accent transition-all duration-200"
						>
							FAQ
						</Link>
						<Link
							href="/contact"
							className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium text-sm rounded-xl hover:bg-accent transition-all duration-200"
						>
							Contact
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
							href="/signup"
							className="flex items-center px-6 py-2.5 bg-primary text-primary-foreground font-medium text-sm rounded-xl hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl"
						>
							Get Started
							<ArrowRight className="ml-2 size-4" />
						</Link>
					</div>
				</div>
			</nav>

			{/* Hero Section */}
			<section className="relative page-content pb-16 overflow-hidden">
				<div className="absolute inset-0 bg-background">
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklch,var(--primary)_5%,transparent),transparent_50%)]" />
				</div>

				<div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
					<div className="text-center max-w-4xl mx-auto space-y-8">
						<Badge
							variant="secondary"
							className="px-4 py-2 text-sm font-medium bg-primary/5 text-primary border-primary/20"
						>
							<Sparkles className="size-4 mr-2" />
							Learning Resources
						</Badge>

						<h1 className="text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1] text-foreground">
							Everything you need to{' '}
							<span className="text-foreground font-semibold">succeed</span>
						</h1>

						<p className="text-muted-foreground leading-relaxed max-w-3xl mx-auto text-xl">
							Comprehensive guides, tutorials, and support to help you master
							property management with TenantFlow
						</p>
					</div>
				</div>
			</section>

			{/* Quick Links Section */}
			<section className="py-12">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<div className="text-center mb-12">
						<h2 className="text-3xl font-bold text-foreground mb-3">
							Quick Start
						</h2>
						<p className="text-muted-foreground text-lg">
							Jump right into what you need
						</p>
					</div>

					<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
						{quickLinks.map(link => (
							<Link
								key={link.title}
								href={link.href}
								className="group relative bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:border-primary/50 transition-all duration-300"
							>
								{link.badge && (
									<Badge
										variant="secondary"
										className="absolute top-4 right-4 text-xs bg-primary/10 text-primary border-primary/20"
									>
										{link.badge}
									</Badge>
								)}
								<div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-primary group-hover:scale-110 transition-transform duration-300">
									{link.icon}
								</div>
								<h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
									{link.title}
								</h3>
								<p className="text-sm text-muted-foreground">
									{link.description}
								</p>
							</Link>
						))}
					</div>
				</div>
			</section>

			{/* Main Resources Grid */}
			<section className="py-16 bg-muted/30">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<div className="text-center mb-12">
						<h2 className="text-3xl font-bold text-foreground mb-3">
							Resource Center
						</h2>
						<p className="text-muted-foreground text-lg">
							Explore our complete library of resources
						</p>
					</div>

					<div className="grid md:grid-cols-2 gap-8">
						{mainResources.map(resource => (
							<Link
								key={resource.title}
								href={resource.href}
								className="group relative"
							>
								<div
									className={`${resource.color} rounded-3xl p-8 border hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 group-hover:scale-[1.02] h-full`}
								>
									<div className="flex items-start gap-6">
										<div
											className={`size-16 rounded-2xl bg-card border border-border flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 ${resource.iconColor}`}
										>
											{resource.icon}
										</div>

										<div className="flex-1">
											<div className="flex items-center gap-3 mb-3">
												<h3 className="font-bold text-foreground text-2xl">
													{resource.title}
												</h3>
												<Badge
													variant="outline"
													className="text-xs border-border"
												>
													<Clock className="size-3 mr-1" />
													{resource.stats}
												</Badge>
											</div>
											<p className="text-muted-foreground mb-6 leading-relaxed">
												{resource.description}
											</p>

											<div className="flex items-center text-primary font-medium group-hover:translate-x-1 transition-transform">
												Explore
												<ArrowRight className="ml-2 size-4" />
											</div>
										</div>
									</div>
								</div>
							</Link>
						))}
					</div>
				</div>
			</section>

			{/* Popular Topics */}
			<section className="py-16">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<div className="text-center mb-12">
						<h2 className="text-3xl font-bold text-foreground mb-3">
							Popular Topics
						</h2>
						<p className="text-muted-foreground text-lg">
							Most searched help topics
						</p>
					</div>

					<div className="flex flex-wrap justify-center gap-3">
						{popularTopics.map(topic => (
							<Link
								key={topic}
								href={`/help?search=${encodeURIComponent(topic)}`}
								className="px-6 py-3 rounded-full bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 text-foreground font-medium"
							>
								{topic}
							</Link>
						))}
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="section-content relative overflow-hidden">
				<div className="absolute inset-0 bg-background">
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_70%)]" />
				</div>

				<div className="max-w-6xl mx-auto px-6 lg:px-8 relative z-10">
					<div className="text-center space-y-8">
						<h2 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-foreground">
							Still have questions?{' '}
							<span className="text-foreground font-semibold">We're here to help</span>
						</h2>

						<p className="text-muted-foreground leading-relaxed max-w-3xl mx-auto text-xl">
							Our dedicated support team is ready to assist you with any
							questions about TenantFlow
						</p>

						<div className="flex flex-col sm:flex-row gap-6 justify-center">
							<Button
								size="lg"
								className="gradient-background hover:opacity-90 shadow-2xl shadow-primary/25 text-lg font-semibold px-8 py-4"
								asChild
							>
								<Link href="/contact">
									Contact Support
									<ArrowRight className="size-5 ml-3" />
								</Link>
							</Button>
							<Button
								variant="outline"
								size="lg"
								className="border-2 border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 text-lg font-semibold px-8 py-4"
								asChild
							>
								<Link href="/help">Browse Help Center</Link>
							</Button>
						</div>

						{/* Trust Indicators */}
						<div className="flex flex-wrap items-center justify-center gap-8 pt-8 text-sm text-muted-foreground">
							<div className="flex items-center gap-2">
								<Clock className="size-4" />
								<span>24-48h response time</span>
							</div>
							<div className="flex items-center gap-2">
								<MessageCircle className="size-4" />
								<span>Live chat available</span>
							</div>
							<div className="flex items-center gap-2">
								<Sparkles className="size-4" />
								<span>Expert support team</span>
							</div>
						</div>
					</div>
				</div>
			</section>

			<Footer />
		</div>
	)
}
