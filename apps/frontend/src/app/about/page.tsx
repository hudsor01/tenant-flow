'use client'

import Footer from '#components/layout/footer'
import { HeroSection } from '#components/sections/hero-section'
import { BlurFade } from '#components/ui/blur-fade'
import { Button } from '#components/ui/button'

import {
	Item,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemSeparator,
	ItemTitle
} from '#components/ui/item'
import {
	ArrowRight,
	Bolt,
	Building2,
	Handshake,
	LifeBuoy,
	Lightbulb,
	Lock,
	Mail,
	Rocket,
	Sprout,
	Target,
	User,
	Users,
	Zap
} from 'lucide-react'
import Link from 'next/link'
import { GridPattern } from '../../components/ui/grid-pattern'

const stats = [
	{ number: '10,000+', label: 'Properties Managed', Icon: Building2 },
	{ number: '500+', label: 'Property Managers', Icon: Users },
	{ number: '99.9%', label: 'Platform Uptime', Icon: Bolt },
	{ number: '24/7', label: 'Customer Support', Icon: LifeBuoy }
]

export default function AboutPage() {
	return (
		<div className="relative min-h-screen flex flex-col">
			{/* Full page grid background */}
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

			<main className="flex-1">
				{/* Hero Section */}
				<HeroSection
					trustBadge="Trusted by 10,000+ property managers"
					title="Simplifying property management"
					titleHighlight="for thousands of professionals"
					subtitle="We're on a mission to transform how property managers work, grow, and succeed. Our platform empowers professionals to streamline operations and scale their business with confidence."
					primaryCta={{ label: 'Start Free Trial', href: '/signup' }}
					secondaryCta={{ label: 'Talk to Sales', href: '/contact' }}
					trustSignals="10,000+ properties managed • 500+ managers • 99.9% uptime"
					image={{
						src: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop',
						alt: 'Professional team collaborating on property management solutions'
					}}
				/>

				{/* Mission Section */}
				<section className="section-hero">
					<div className="max-w-7xl mx-auto px-6 lg:px-8">
						<BlurFade delay={0.2} inView>
							<div className="grid lg:grid-cols-2 gap-16 items-center">
								<div className="space-y-6">
									<h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
										Our Mission
									</h2>
									<div className="space-y-4">
										<p className="text-xl text-muted-foreground leading-relaxed">
											To empower property managers with the tools they need to
											grow their business, reduce operational overhead, and
											provide exceptional service to their tenants.
										</p>
										<p className="text-base text-muted-foreground leading-relaxed">
											We believe property management should be streamlined,
											data-driven, and focused on building lasting relationships
											between managers and tenants.
										</p>
									</div>
								</div>
								<div className="bg-card rounded-2xl p-8 text-center border border-border/50 shadow-md">
									<Target className="size-20 mx-auto mb-6 text-primary" />
									<h3 className="text-2xl font-semibold text-foreground">
										Mission-Driven Development
									</h3>
									<p className="text-muted-foreground mt-3">
										Every feature built with property managers in mind
									</p>
								</div>
							</div>
						</BlurFade>
					</div>
				</section>

				{/* Values Section */}
				<section className="section-hero bg-muted/20">
					<div className="max-w-7xl mx-auto px-6 lg:px-8">
						<BlurFade delay={0.3} inView>
							<div className="text-center mb-16 space-y-4">
								<h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
									Our Values
								</h2>
								<p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
									These principles guide everything we do, from product
									development to customer support.
								</p>
							</div>

							<ItemGroup>
								<Item variant="outline">
									<ItemMedia variant="icon">
										<Rocket />
									</ItemMedia>
									<ItemContent>
										<ItemTitle>Innovation First</ItemTitle>
										<ItemDescription>
											We constantly push boundaries to bring cutting-edge
											solutions to property management.
										</ItemDescription>
									</ItemContent>
								</Item>

								<ItemSeparator />

								<Item variant="outline">
									<ItemMedia variant="icon">
										<Handshake />
									</ItemMedia>
									<ItemContent>
										<ItemTitle>Customer Success</ItemTitle>
										<ItemDescription>
											Your success is our success. We are committed to helping
											you achieve your goals.
										</ItemDescription>
									</ItemContent>
								</Item>

								<ItemSeparator />

								<Item variant="outline">
									<ItemMedia variant="icon">
										<Lock />
									</ItemMedia>
									<ItemContent>
										<ItemTitle>Security & Privacy</ItemTitle>
										<ItemDescription>
											We protect your data with enterprise-grade security and
											transparent privacy practices.
										</ItemDescription>
									</ItemContent>
								</Item>

								<ItemSeparator />

								<Item variant="outline">
									<ItemMedia variant="icon">
										<Zap />
									</ItemMedia>
									<ItemContent>
										<ItemTitle>Simplicity</ItemTitle>
										<ItemDescription>
											Complex problems deserve simple solutions. We make
											powerful tools easy to use.
										</ItemDescription>
									</ItemContent>
								</Item>

								<ItemSeparator />

								<Item variant="outline">
									<ItemMedia variant="icon">
										<Sprout />
									</ItemMedia>
									<ItemContent>
										<ItemTitle>Sustainable Growth</ItemTitle>
										<ItemDescription>
											We build for the long term, creating lasting value for our
											customers and community.
										</ItemDescription>
									</ItemContent>
								</Item>

								<ItemSeparator />

								<Item variant="outline">
									<ItemMedia variant="icon">
										<Lightbulb />
									</ItemMedia>
									<ItemContent>
										<ItemTitle>Continuous Learning</ItemTitle>
										<ItemDescription>
											We listen, learn, and adapt to meet the evolving needs of
											property managers.
										</ItemDescription>
									</ItemContent>
								</Item>
							</ItemGroup>
						</BlurFade>
					</div>
				</section>

				{/* Stats Section */}
				<section className="section-hero">
					<div className="max-w-6xl mx-auto px-6 lg:px-8">
						<BlurFade delay={0.5} inView>
							<div className="text-center mb-16 space-y-4">
								<h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
									TenantFlow by the Numbers
								</h2>
								<p className="text-xl text-muted-foreground leading-relaxed">
									Growing alongside our community of property managers
								</p>
							</div>

							<div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
								{stats.map((stat, index) => (
									<BlurFade key={index} delay={0.6 + index * 0.1} inView>
										<div className="text-center bg-card rounded-2xl p-8 border border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
											<div className="mb-4 flex justify-center">
												<stat.Icon
													className="size-8 text-primary"
													aria-hidden
												/>
											</div>
											<div className="text-3xl font-bold text-primary mb-2">
												{stat.number}
											</div>
											<div className="text-sm text-muted-foreground">
												{stat.label}
											</div>
										</div>
									</BlurFade>
								))}
							</div>
						</BlurFade>
					</div>
				</section>

				{/* Team Section */}
				<section className="section-hero bg-muted/20">
					<div className="max-w-7xl mx-auto px-6 lg:px-8">
						<BlurFade delay={0.7} inView>
							<div className="text-center mb-16 space-y-4">
								<h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
									Meet the Team
								</h2>
								<p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
									We&apos;re a diverse team of engineers, designers, and
									property management experts working together to build
									something great.
								</p>
							</div>

							<div className="grid md:grid-cols-3 gap-8 mb-16">
								{[
									{
										name: 'Alex Chen',
										role: 'CEO & Founder',
										bio: 'Former property manager turned tech entrepreneur. 10+ years in real estate.'
									},
									{
										name: 'Sarah Johnson',
										role: 'CTO',
										bio: 'Software architect with expertise in scalable systems and security.'
									},
									{
										name: 'Mike Rodriguez',
										role: 'Head of Product',
										bio: 'Product strategist focused on user experience and customer success.'
									}
								].map((member, index) => (
									<BlurFade key={index} delay={0.8 + index * 0.1} inView>
										<div className="text-center bg-card rounded-2xl p-8 border border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
											<div className="size-24 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
												<User className="size-12 text-primary" />
											</div>
											<h3 className="text-lg font-semibold text-foreground mb-2">
												{member.name}
											</h3>
											<p className="text-primary font-medium mb-4">
												{member.role}
											</p>
											<p className="text-sm text-muted-foreground leading-relaxed">
												{member.bio}
											</p>
										</div>
									</BlurFade>
								))}
							</div>

							<div className="text-center">
								<BlurFade delay={1.1} inView>
									<div className="bg-card rounded-2xl p-8 border border-border/50 max-w-md mx-auto">
										<p className="text-base text-muted-foreground mb-6">
											We&apos;re hiring! Join our growing team.
										</p>
										<Button asChild size="lg" className="w-full">
											<Link href="/careers">
												<Mail className="size-4 mr-2" />
												View Open Positions
											</Link>
										</Button>
									</div>
								</BlurFade>
							</div>
						</BlurFade>
					</div>
				</section>

				{/* CTA Section */}
				<section className="section-hero bg-muted/20">
					<div className="max-w-6xl mx-auto px-6 lg:px-8">
						<BlurFade delay={1.2} inView>
							<div className="text-center space-y-8">
								<h2 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-foreground">
									Ready to{' '}
									<span className="text-primary">
										simplify property management
									</span>
									?
								</h2>
								<p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
									Join thousands of property managers who&apos;ve streamlined
									their operations and scaled their business with
									TenantFlow&apos;s enterprise platform.
								</p>
								<div className="flex flex-col sm:flex-row gap-4 justify-center">
									<Button asChild size="lg" className="group">
										<Link href="/signup">
											Start Free Trial
											<ArrowRight className="size-4 ml-2 transition-transform group-hover:translate-x-1" />
										</Link>
									</Button>
									<Button asChild variant="outline" size="lg">
										<Link href="/contact">Talk to Sales</Link>
									</Button>
								</div>
								<p className="text-sm text-muted-foreground">
									No setup fees • Enterprise security • 99.9% uptime SLA •
									Cancel anytime
								</p>
							</div>
						</BlurFade>
					</div>
				</section>
			</main>

			<Footer />
		</div>
	)
}
