import Navbar from '@/components/navbar'
import {
	Handshake,
	Lightbulb,
	Lock,
	Rocket,
	Sprout,
	Target,
	User,
	Zap
} from 'lucide-react'

export default function AboutPage() {
	return (
		<main className="min-h-screen bg-background">
			<Navbar />
			<div className="pt-10">
				{/* Hero Section */}
				<section className="marketing-hero surface-glow">
					<div className="container text-center max-w-4xl">
						<h1 className="text-display text-gradient-innovation mb-6">
							We're building the future of property management
						</h1>
						<p className="text-xl text-muted-foreground">
							TenantFlow was born from the frustration of managing properties
							with outdated tools. We're here to change that with modern,
							intuitive software that actually works.
						</p>
					</div>
				</section>

				{/* Mission Section */}
				<section className="py-16 surface">
					<div className="container max-w-6xl">
						<div className="grid md:grid-cols-2 gap-16 items-center">
							<div className="prose prose-lg prose-slate max-w-none">
								<h2 className="text-3xl font-bold mb-6 text-foreground not-prose">Our Mission</h2>
								<p className="text-lg leading-relaxed text-muted-foreground mb-6">
									To empower property managers with the tools they need to grow
									their business, reduce operational overhead, and provide
									exceptional service to their tenants.
								</p>
								<p className="text-base leading-relaxed text-muted-foreground">
									We believe that property management should be streamlined,
									data-driven, and focused on building lasting relationships
									between managers and tenants.
								</p>
							</div>
							<div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg p-12 text-center">
								<Target className="w-16 h-16 mx-auto mb-4 text-primary" />
								<p className="font-semibold text-lg">
									Mission-Driven Development
								</p>
							</div>
						</div>
					</div>
				</section>

				{/* Values Section */}
				<section className="py-24">
					<div className="container mx-auto px-4 max-w-6xl">
						<div className="text-center mb-16">
							<div className="prose prose-lg prose-slate mx-auto">
								<h2 className="text-3xl font-bold mb-4 text-foreground not-prose">Our Values</h2>
								<p className="text-lg leading-relaxed text-muted-foreground max-w-2xl mx-auto">
									These principles guide everything we do, from product
									development to customer support.
								</p>
							</div>
						</div>

						<div className="grid md:grid-cols-3 gap-8">
							{[
								{
									icon: Rocket,
									title: 'Innovation First',
									description:
										'We constantly push boundaries to bring cutting-edge solutions to property management.'
								},
								{
									icon: Handshake,
									title: 'Customer Success',
									description:
										'Your success is our success. We are committed to helping you achieve your goals.'
								},
								{
									icon: Lock,
									title: 'Security & Privacy',
									description:
										'We protect your data with enterprise-grade security and transparent privacy practices.'
								},
								{
									icon: Zap,
									title: 'Simplicity',
									description:
										'Complex problems deserve simple solutions. We make powerful tools easy to use.'
								},
								{
									icon: Sprout,
									title: 'Sustainable Growth',
									description:
										'We build for the long term, creating lasting value for our customers and community.'
								},
								{
									icon: Lightbulb,
									title: 'Continuous Learning',
									description:
										'We listen, learn, and adapt to meet the evolving needs of property managers.'
								}
							].map((value, index) => (
								<div key={index} className="text-center p-6">
									<value.icon className="w-10 h-10 mx-auto mb-4 text-primary" />
									<h3 className="text-xl font-semibold mb-3">{value.title}</h3>
									<p className="text-muted-foreground">{value.description}</p>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* Stats Section */}
				<section className="py-16 bg-muted/20">
					<div className="container mx-auto px-4 max-w-4xl">
						<div className="text-center mb-12">
							<h2 className="text-3xl font-bold mb-4">
								TenantFlow by the Numbers
							</h2>
							<p className="text-muted-foreground">
								Growing alongside our community of property managers
							</p>
						</div>

						<div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
							{[
								{ number: '10,000+', label: 'Properties Managed' },
								{ number: '2,500+', label: 'Happy Customers' },
								{ number: '50+', label: 'Cities Served' },
								{ number: '99.9%', label: 'Uptime SLA' }
							].map((stat, index) => (
								<div key={index}>
									<div className="text-3xl font-bold text-primary mb-2">
										{stat.number}
									</div>
									<div className="text-muted-foreground">{stat.label}</div>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* Team Section */}
				<section className="py-24">
					<div className="container mx-auto px-4 max-w-6xl">
						<div className="text-center mb-16">
							<h2 className="text-3xl font-bold mb-4">Meet the Team</h2>
							<p className="text-muted-foreground max-w-2xl mx-auto">
								We're a diverse team of engineers, designers, and property
								management experts working together to build something great.
							</p>
						</div>

						<div className="grid md:grid-cols-3 gap-8">
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
								<div key={index} className="text-center">
									<div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
										<User className="w-10 h-10 text-muted-foreground" />
									</div>
									<h3 className="text-xl font-semibold mb-1">{member.name}</h3>
									<p className="text-primary mb-3">{member.role}</p>
									<p className="text-muted-foreground text-sm">{member.bio}</p>
								</div>
							))}
						</div>

						<div className="text-center mt-16">
							<p className="text-muted-foreground mb-4">
								We're hiring! Join our growing team.
							</p>
							<button className="border border-border px-6 py-2 rounded-lg hover:bg-muted/50 transition-colors">
								View Open Positions
							</button>
						</div>
					</div>
				</section>

				{/* CTA Section */}
				<section className="py-24 surface-glow">
					<div className="container text-center">
						<h2 className="text-3xl font-bold mb-4 text-gradient-growth">
							Ready to experience TenantFlow?
						</h2>
						<p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
							Join thousands of property managers who have already transformed
							their operations.
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<button className="button-primary button-lg">
								Start Free Trial
							</button>
							<button className="button-secondary button-lg">
								Schedule Demo
							</button>
						</div>
					</div>
				</section>
			</div>
		</main>
	)
}
