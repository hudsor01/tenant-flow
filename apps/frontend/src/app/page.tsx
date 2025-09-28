'use client'

import Footer from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { ArrowRight, Building, Users, DollarSign, Settings, Zap, Shield, Clock, BarChart, CheckCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Magic UI Components
import { BentoGrid, BentoCard } from '@/components/magicui/bento-grid'
import ClientFeedback from '@/components/magicui/testimonial'
import FeaturesSectionDemo from '@/components/magicui/features-section-demo-2'
import { NumberTicker } from '@/components/magicui/number-ticker'
import HeroHighlight from '@/components/magicui/hero-highlight'
import ActiveTheme from '@/components/magicui/active-theme'
import Drawer from '@/components/magicui/drawer'
import GridPattern from '@/components/magicui/grid-pattern'
import Pagination from '@/components/magicui/pagination'
import SeoHead from '@/components/magicui/seo-head'
import TimelineAnimation from '@/components/magicui/timeline-animation'
import ThemeSwitcher from '@/components/magicui/theme-switcher'
import ErrorBoundary from '@/components/magicui/error-boundary'
import BorderGlow from '@/components/magicui/border-glow'
import GlowingEffect from '@/components/magicui/glowing-effect'
import MagicCard from '@/components/magicui/magic-card'
import Particles from '@/components/magicui/particles'
import Sparkles from '@/components/magicui/sparkles'
import LoadingSpinner from '@/components/magicui/loading-spinner'
import BlurFade from '@/components/magicui/blur-fade'
import BorderBeam from '@/components/magicui/border-beam'

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

			{/* Magic UI Components Showcase */}

			{/* 1. BentoGrid - Feature Showcase */}
			<section className="py-24 bg-background">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="text-3xl font-bold text-foreground mb-4">Property Management Features</h2>
						<p className="text-muted-foreground">Comprehensive tools for modern landlords</p>
					</div>
					<BentoGrid className="max-w-6xl mx-auto">
						<BentoCard
							name="Property Management"
							className="col-span-3 lg:col-span-1"
							background={<div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20" />}
							Icon={Building}
							description="Manage all your properties from one central dashboard"
							href="/properties"
							cta="Explore Properties"
						/>
						<BentoCard
							name="Tenant Portal"
							className="col-span-3 lg:col-span-1"
							background={<div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-primary/20" />}
							Icon={Users}
							description="Streamline tenant communication and requests"
							href="/tenants"
							cta="View Tenants"
						/>
						<BentoCard
							name="Financial Reports"
							className="col-span-3 lg:col-span-1"
							background={<div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20" />}
							Icon={DollarSign}
							description="Track income, expenses, and profitability"
							href="/reports"
							cta="View Reports"
						/>
					</BentoGrid>
				</div>
			</section>

			{/* 2. ClientFeedback - Premium Testimonials */}
			<ClientFeedback />

			{/* 3. FeaturesSectionDemo - Advanced Features */}
			<section className="py-24 bg-muted/30">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="text-3xl font-bold text-foreground mb-4">Advanced Features</h2>
						<p className="text-muted-foreground">Everything you need to scale your property business</p>
					</div>
					<FeaturesSectionDemo variant="minimal" size="default" />
				</div>
			</section>

			{/* 4. NumberTicker - Stats Section */}
			<section className="py-24 bg-background">
				<div className="max-w-6xl mx-auto px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="text-3xl font-bold text-foreground mb-4">Trusted by Property Managers</h2>
						<p className="text-muted-foreground">See the numbers that matter</p>
					</div>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-8">
						<div className="text-center">
							<NumberTicker
								value={10000}
								suffix="+"
								size="sf-largeTitle"
								variant="primary"
								className="block mb-2"
							/>
							<p className="text-muted-foreground">Active Users</p>
						</div>
						<div className="text-center">
							<NumberTicker
								value={50000}
								suffix="+"
								size="sf-largeTitle"
								variant="success"
								className="block mb-2"
							/>
							<p className="text-muted-foreground">Properties Managed</p>
						</div>
						<div className="text-center">
							<NumberTicker
								value={99.9}
								suffix="%"
								decimalPlaces={1}
								size="sf-largeTitle"
								variant="primary"
								className="block mb-2"
							/>
							<p className="text-muted-foreground">Uptime</p>
						</div>
						<div className="text-center">
							<NumberTicker
								value={15}
								suffix="+ hrs"
								size="sf-largeTitle"
								variant="success"
								className="block mb-2"
							/>
							<p className="text-muted-foreground">Time Saved Weekly</p>
						</div>
					</div>
				</div>
			</section>

			{/* 5. HeroHighlight - Text Effects */}
			<section className="py-24 bg-muted/30">
				<div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
					<HeroHighlight className="text-4xl lg:text-6xl font-bold mb-8">
						Transform Your Property Management with{' '}
						<span className="text-primary">TenantFlow</span>
					</HeroHighlight>
					<p className="text-xl text-muted-foreground">
						Experience the power of modern property management tools
					</p>
				</div>
			</section>

			{/* 6. ActiveTheme - Theme Detection */}
			<section className="py-16 bg-background">
				<div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
					<h3 className="text-2xl font-bold mb-4">Active Theme Detection</h3>
					<ActiveTheme />
				</div>
			</section>

			{/* 7. GridPattern - Background Patterns */}
			<section className="py-24 bg-background relative overflow-hidden">
				<GridPattern className="absolute inset-0 opacity-20" />
				<div className="max-w-4xl mx-auto px-6 lg:px-8 text-center relative z-10">
					<h2 className="text-3xl font-bold text-foreground mb-4">Grid Pattern Background</h2>
					<p className="text-muted-foreground">Elegant background patterns for design enhancement</p>
				</div>
			</section>

			{/* 8. ThemeSwitcher - Dark/Light Mode */}
			<section className="py-16 bg-muted/30">
				<div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
					<h3 className="text-2xl font-bold mb-8">Theme Switcher</h3>
					<ThemeSwitcher />
				</div>
			</section>

			{/* 9. Sparkles - Animation Effects */}
			<section className="py-24 bg-background relative">
				<Sparkles className="absolute inset-0" />
				<div className="max-w-4xl mx-auto px-6 lg:px-8 text-center relative z-10">
					<h2 className="text-3xl font-bold text-foreground mb-4">Magical Sparkles</h2>
					<p className="text-muted-foreground">Beautiful animation effects to enhance user experience</p>
				</div>
			</section>

			{/* 10. MagicCard - Interactive Cards */}
			<section className="py-24 bg-muted/30">
				<div className="max-w-6xl mx-auto px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="text-3xl font-bold text-foreground mb-4">Magic Cards</h2>
						<p className="text-muted-foreground">Interactive card components with hover effects</p>
					</div>
					<div className="grid md:grid-cols-3 gap-8">
						<MagicCard className="p-6">
							<div className="flex items-center mb-4">
								<Building className="w-8 h-8 text-primary mr-3" />
								<h3 className="text-xl font-semibold">Property Analytics</h3>
							</div>
							<p className="text-muted-foreground">Real-time insights into your property performance</p>
						</MagicCard>
						<MagicCard className="p-6">
							<div className="flex items-center mb-4">
								<Users className="w-8 h-8 text-primary mr-3" />
								<h3 className="text-xl font-semibold">Tenant Management</h3>
							</div>
							<p className="text-muted-foreground">Streamlined tenant communication and tracking</p>
						</MagicCard>
						<MagicCard className="p-6">
							<div className="flex items-center mb-4">
								<BarChart className="w-8 h-8 text-primary mr-3" />
								<h3 className="text-xl font-semibold">Financial Reports</h3>
							</div>
							<p className="text-muted-foreground">Comprehensive financial tracking and reporting</p>
						</MagicCard>
					</div>
				</div>
			</section>

			{/* 11. BorderGlow - Glowing Effects */}
			<section className="py-24 bg-background">
				<div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
					<h2 className="text-3xl font-bold text-foreground mb-8">Border Glow Effects</h2>
					<BorderGlow className="p-8 rounded-lg">
						<h3 className="text-xl font-semibold mb-4">Enhanced Visual Appeal</h3>
						<p className="text-muted-foreground">Add elegant glowing borders to highlight important content</p>
					</BorderGlow>
				</div>
			</section>

			{/* 12. GlowingEffect - Advanced Glows */}
			<section className="py-24 bg-muted/30">
				<div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
					<h2 className="text-3xl font-bold text-foreground mb-8">Glowing Effects</h2>
					<GlowingEffect>
						<div className="p-8 rounded-lg bg-card">
							<h3 className="text-xl font-semibold mb-4">Premium Glow</h3>
							<p className="text-muted-foreground">Advanced glowing effects for premium feel</p>
						</div>
					</GlowingEffect>
				</div>
			</section>

			{/* 13. LoadingSpinner - Loading States */}
			<section className="py-24 bg-background">
				<div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
					<h2 className="text-3xl font-bold text-foreground mb-8">Loading Animations</h2>
					<div className="flex justify-center space-x-8">
						<LoadingSpinner size="sm" />
						<LoadingSpinner size="md" />
						<LoadingSpinner size="lg" />
					</div>
				</div>
			</section>

			{/* 14. BlurFade - Transition Effects */}
			<section className="py-24 bg-muted/30">
				<div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
					<BlurFade delay={0.2}>
						<h2 className="text-3xl font-bold text-foreground mb-4">Blur Fade Transitions</h2>
					</BlurFade>
					<BlurFade delay={0.4}>
						<p className="text-muted-foreground">Smooth blur fade animations for content reveals</p>
					</BlurFade>
				</div>
			</section>

			{/* 15. BorderBeam - Animated Borders */}
			<section className="py-24 bg-background">
				<div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
					<h2 className="text-3xl font-bold text-foreground mb-8">Animated Border Beam</h2>
					<div className="relative">
						<BorderBeam className="p-8 rounded-lg border">
							<h3 className="text-xl font-semibold mb-4">Dynamic Borders</h3>
							<p className="text-muted-foreground">Animated border beams for enhanced visual interest</p>
						</BorderBeam>
					</div>
				</div>
			</section>

			{/* 16. Particles - Particle System */}
			<section className="py-24 bg-muted/30 relative overflow-hidden">
				<Particles className="absolute inset-0" />
				<div className="max-w-4xl mx-auto px-6 lg:px-8 text-center relative z-10">
					<h2 className="text-3xl font-bold text-foreground mb-4">Particle Animation</h2>
					<p className="text-muted-foreground">Dynamic particle systems for immersive backgrounds</p>
				</div>
			</section>

			{/* 17. Pagination - Navigation */}
			<section className="py-24 bg-background">
				<div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
					<h2 className="text-3xl font-bold text-foreground mb-8">Pagination Component</h2>
					<Pagination
						currentPage={3}
						totalPages={10}
						onPageChange={(page) => console.log('Page:', page)}
					/>
				</div>
			</section>

			{/* 18. Drawer - Slide Out Panel */}
			<section className="py-24 bg-muted/30">
				<div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
					<h2 className="text-3xl font-bold text-foreground mb-8">Drawer Component</h2>
					<Drawer>
						<Button>Open Drawer</Button>
					</Drawer>
				</div>
			</section>

			{/* 19. TimelineAnimation - Scroll Animations */}
			<section className="py-24 bg-background">
				<div className="max-w-4xl mx-auto px-6 lg:px-8">
					<h2 className="text-3xl font-bold text-foreground text-center mb-16">Timeline Animation</h2>
					<TimelineAnimation
						items={[
							{ title: "Setup Your Account", description: "Quick 5-minute onboarding process" },
							{ title: "Add Your Properties", description: "Import or manually add property details" },
							{ title: "Invite Tenants", description: "Send secure invitations to existing tenants" },
							{ title: "Start Managing", description: "Begin streamlining your property management" }
						]}
					/>
				</div>
			</section>

			{/* 20. ErrorBoundary - Error Handling */}
			<section className="py-24 bg-muted/30">
				<div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
					<h2 className="text-3xl font-bold text-foreground mb-8">Error Boundary</h2>
					<ErrorBoundary>
						<div className="p-8 rounded-lg bg-card">
							<h3 className="text-xl font-semibold mb-4">Protected Content</h3>
							<p className="text-muted-foreground">This content is wrapped in an error boundary for graceful error handling</p>
						</div>
					</ErrorBoundary>
				</div>
			</section>

			{/* 21. SeoHead - SEO Component */}
			<SeoHead
				title="TenantFlow - Property Management Made Simple"
				description="Streamline your property management with TenantFlow's comprehensive platform"
				keywords="property management, landlord software, tenant portal, real estate"
			/>

			<Footer />
		</div>
	)
}
