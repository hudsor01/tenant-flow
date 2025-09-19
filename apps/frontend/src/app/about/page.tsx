import { containerClasses } from '@/lib/design-system'
import { TYPOGRAPHY_SCALE } from '@repo/shared'
import {
	ArrowRight,
	Handshake,
	Lightbulb,
	Lock,
	Mail,
	Rocket,
	Sprout,
	Target,
	User,
	Zap
} from 'lucide-react'
import Link from 'next/link'
import { BlurFade } from 'src/components/magicui/blur-fade'
import { HeroAuthority } from 'src/components/marketing/hero-authority'
import { Navbar } from 'src/components/navbar'
import { Button } from 'src/components/ui/button'

export default function AboutPage() {
	return (
		<main className="min-h-screen bg-background">
			<Navbar />

			{/* Hero Section */}
			<HeroAuthority
				title={
					<>Simplifying property management for thousands of professionals</>
				}
				subtitle={
					<>
						We're on a mission to transform how property managers work, grow,
						and succeed. Our platform empowers professionals to streamline
						operations and scale their business with confidence.
					</>
				}
				primaryCta={{ label: 'Start Free Trial', href: '/auth/sign-up' }}
				secondaryCta={{ label: 'Talk to Sales', href: '/contact' }}
			/>

			{/* Mission Section */}
			<section className="section-hero">
				<div className={containerClasses('xl')}>
					<BlurFade delay={0.2} inView>
						<div className="grid lg:grid-cols-2 gap-16 items-center">
							<div className="space-y-6">
								<h2
									className="text-foreground font-bold tracking-tight"
									style={TYPOGRAPHY_SCALE['heading-xl']}
								>
									Our Mission
								</h2>
								<div className="space-y-4">
									<p
										className="text-muted-foreground leading-relaxed"
										style={TYPOGRAPHY_SCALE['body-lg']}
									>
										To empower property managers with the tools they need to
										grow their business, reduce operational overhead, and
										provide exceptional service to their tenants.
									</p>
									<p
										className="text-muted-foreground leading-relaxed"
										style={TYPOGRAPHY_SCALE['body-md']}
									>
										We believe property management should be streamlined,
										data-driven, and focused on building lasting relationships
										between managers and tenants.
									</p>
								</div>
							</div>
							<div className="card-elevated-authority rounded-2xl card-padding text-center">
								<Target className="w-20 h-20 mx-auto mb-6 text-primary" />
								<h3
									className="font-semibold text-foreground"
									style={TYPOGRAPHY_SCALE['heading-md']}
								>
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
				<div className={containerClasses('xl')}>
					<BlurFade delay={0.3} inView>
						<div className="text-center mb-16 space-y-4">
							<h2
								className="text-foreground font-bold tracking-tight"
								style={TYPOGRAPHY_SCALE['heading-xl']}
							>
								Our Values
							</h2>
							<p
								className="text-muted-foreground leading-relaxed max-w-2xl mx-auto"
								style={TYPOGRAPHY_SCALE['body-lg']}
							>
								These principles guide everything we do, from product
								development to customer support.
							</p>
						</div>

						<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
							{[
								{
									icon: Rocket,
									title: 'Innovation First',
									description:
										'We constantly push boundaries to bring cutting-edge solutions to property management.',
									color: 'from-primary to-primary/80'
								},
								{
									icon: Handshake,
									title: 'Customer Success',
									description:
										'Your success is our success. We are committed to helping you achieve your goals.',
									color: 'from-primary to-accent'
								},
								{
									icon: Lock,
									title: 'Security & Privacy',
									description:
										'We protect your data with enterprise-grade security and transparent privacy practices.',
									color: 'from-primary to-primary/80'
								},
								{
									icon: Zap,
									title: 'Simplicity',
									description:
										'Complex problems deserve simple solutions. We make powerful tools easy to use.',
									color: 'from-primary/80 to-primary'
								},
								{
									icon: Sprout,
									title: 'Sustainable Growth',
									description:
										'We build for the long term, creating lasting value for our customers and community.',
									color: 'from-accent to-primary'
								},
								{
									icon: Lightbulb,
									title: 'Continuous Learning',
									description:
										'We listen, learn, and adapt to meet the evolving needs of property managers.',
									color: 'from-primary to-accent'
								}
							].map((value, index) => (
								<BlurFade key={index} delay={0.4 + index * 0.1} inView>
									<div className="bg-card rounded-2xl card-padding text-center border border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-lg group">
										<div
											className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${value.color} mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}
										>
											<value.icon className="w-8 h-8 text-white" />
										</div>
										<h3
											className="font-semibold text-foreground mb-3"
											style={TYPOGRAPHY_SCALE['heading-sm']}
										>
											{value.title}
										</h3>
										<p
											className="text-muted-foreground leading-relaxed"
											style={TYPOGRAPHY_SCALE['body-sm']}
										>
											{value.description}
										</p>
									</div>
								</BlurFade>
							))}
						</div>
					</BlurFade>
				</div>
			</section>

			{/* Stats Section */}
			<section className="section-hero">
				<div className={containerClasses('lg')}>
					<BlurFade delay={0.5} inView>
						<div className="text-center mb-16 space-y-4">
							<h2
								className="text-foreground font-bold tracking-tight"
								style={TYPOGRAPHY_SCALE['heading-xl']}
							>
								TenantFlow by the Numbers
							</h2>
							<p
								className="text-muted-foreground leading-relaxed"
								style={TYPOGRAPHY_SCALE['body-lg']}
							>
								Growing alongside our community of property managers
							</p>
						</div>

						<div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
							{[
								{ number: '10,000+', label: 'Properties Managed', icon: '🏢' },
								{ number: '500+', label: 'Property Managers', icon: '👥' },
								{ number: '99.9%', label: 'Platform Uptime', icon: '⚡' },
								{ number: '24/7', label: 'Customer Support', icon: '🛟' }
							].map((stat, index) => (
								<BlurFade key={index} delay={0.6 + index * 0.1} inView>
									<div className="text-center bg-card rounded-2xl card-padding border border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
										<div className="text-3xl mb-4">{stat.icon}</div>
										<div
											className="font-bold text-primary mb-2"
											style={TYPOGRAPHY_SCALE['heading-lg']}
										>
											{stat.number}
										</div>
										<div
											className="text-muted-foreground"
											style={TYPOGRAPHY_SCALE['body-sm']}
										>
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
				<div className={containerClasses('xl')}>
					<BlurFade delay={0.7} inView>
						<div className="text-center mb-16 space-y-4">
							<h2
								className="text-foreground font-bold tracking-tight"
								style={TYPOGRAPHY_SCALE['heading-xl']}
							>
								Meet the Team
							</h2>
							<p
								className="text-muted-foreground leading-relaxed max-w-2xl mx-auto"
								style={TYPOGRAPHY_SCALE['body-lg']}
							>
								We're a diverse team of engineers, designers, and property
								management experts working together to build something great.
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
									<div className="text-center bg-card rounded-2xl card-padding border border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
										<div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
											<User className="w-12 h-12 text-primary" />
										</div>
										<h3
											className="font-semibold text-foreground mb-2"
											style={TYPOGRAPHY_SCALE['heading-sm']}
										>
											{member.name}
										</h3>
										<p className="text-primary font-medium mb-4">
											{member.role}
										</p>
										<p
											className="text-muted-foreground leading-relaxed"
											style={TYPOGRAPHY_SCALE['body-sm']}
										>
											{member.bio}
										</p>
									</div>
								</BlurFade>
							))}
						</div>

						<div className="text-center">
							<BlurFade delay={1.1} inView>
								<div className="bg-card rounded-2xl card-padding border border-border/50 max-w-md mx-auto">
									<p
										className="text-muted-foreground mb-6"
										style={TYPOGRAPHY_SCALE['body-md']}
									>
										We're hiring! Join our growing team.
									</p>
									<Button asChild size="lg" className="w-full">
										<Link href="/careers">
											<Mail className="w-4 h-4 mr-2" />
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
			<section className="section-hero bg-gradient-to-br from-primary/5 via-background to-accent/5">
				<div className={containerClasses('lg')}>
					<BlurFade delay={1.2} inView>
						<div className="text-center space-y-8">
							<h2
								className="font-bold tracking-tight leading-tight"
								style={TYPOGRAPHY_SCALE['heading-xl']}
							>
								Ready to{' '}
								<span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
									simplify property management
								</span>
								?
							</h2>
							<p
								className="text-muted-foreground leading-relaxed max-w-2xl mx-auto"
								style={TYPOGRAPHY_SCALE['body-lg']}
							>
								Join thousands of property managers who've streamlined their
								operations and scaled their business with TenantFlow's
								enterprise platform.
							</p>
							<div className="flex flex-col sm:flex-row gap-4 justify-center">
								<Button asChild size="lg" className="group">
									<Link href="/auth/sign-up">
										Start Free Trial
										<ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
									</Link>
								</Button>
								<Button asChild variant="outline" size="lg">
									<Link href="/contact">Talk to Sales</Link>
								</Button>
							</div>
							<p
								className="text-muted-foreground"
								style={TYPOGRAPHY_SCALE['body-sm']}
							>
								No setup fees • Enterprise security • 99.9% uptime SLA • Cancel
								anytime
							</p>
						</div>
					</BlurFade>
				</div>
			</section>
		</main>
	)
}
