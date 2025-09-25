import Footer from '@/components/layout/footer'
import { Navbar } from '@/components/layout/navbar'
import { ContactForm } from '@/components/marketing/contact-form'
import { ContentSection } from '@/components/marketing/content-section'
import { CtaSection } from '@/components/marketing/cta-section'
import { FeaturesGrid } from '@/components/marketing/features-grid'
import { HeroAuthority } from '@/components/marketing/hero-authority'

import { BlurFade } from '@/components/magicui/blur-fade'
import { Button } from '@/components/ui/button'
import { ArrowRight, Mail, MessageSquare, Phone } from 'lucide-react'

export default function ContactPage() {
	return (
		<main className="min-h-screen bg-background">
			<Navbar />
			<div className="pt-10">
				{/* Hero Section */}
				<HeroAuthority
					title={<>Ready to transform your business?</>}
					subtitle={
						<>
							Join 10,000+ property managers who have transformed their
							operations with TenantFlow. Our experts will show you exactly how
							to reduce costs by 32% and automate 80% of daily tasks.
						</>
					}
					primaryCta={{ label: 'Get ROI Report', href: '#contact-form' }}
					secondaryCta={{ label: 'Schedule Free Call', href: '#options' }}
				/>

				{/* Enhanced Content Section */}
				<ContentSection />

				{/* Contact Options */}
				<section className="py-24 px-6 lg:px-8" id="options">
					<div className="max-w-7xl mx-auto">
						<BlurFade delay={0.2} inView>
							<div className="grid md:grid-cols-3 gap-8">
								{[
									{
										icon: MessageSquare,
										title: 'Free ROI Calculator',
										description:
											'See exactly how much TenantFlow can save your properties in 90 days',
										action: 'Get My ROI Report',
										available: 'Instant results in 2 minutes',
										href: '#contact-form'
									},
									{
										icon: Phone,
										title: 'Expert Consultation',
										description:
											'Speak with a property management automation specialist',
										action: 'Schedule Free Call',
										available: 'Available Mon-Fri, 9AM-6PM PST',
										href: '#contact-form'
									},
									{
										icon: Mail,
										title: 'Custom Demo',
										description:
											'See TenantFlow configured for your specific portfolio',
										action: 'Request Demo',
										available: 'Personalized for your properties',
										href: '#contact-form'
									}
								].map((option, index) => (
									<div
										key={index}
										className="bg-card border border-border rounded-2xl p-8 text-center transition-all duration-300 hover:shadow-lg group shadow-sm"
									>
										<div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-primary/20 to-accent/20 mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
											<option.icon className="w-8 h-8 text-primary" />
										</div>
										<h3 className="text-xl font-semibold text-foreground mb-3">
											{option.title}
										</h3>
										<p className="text-muted-foreground leading-relaxed mb-6">
											{option.description}
										</p>
										<Button
											asChild
											className="mb-4 w-full group bg-primary text-primary-foreground hover:bg-primary/90"
										>
											<a href={option.href}>
												{option.action}
												<ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
											</a>
										</Button>
										<p className="text-sm text-muted-foreground">
											{option.available}
										</p>
									</div>
								))}
							</div>
						</BlurFade>
					</div>
				</section>

				{/* Features Grid */}
				<FeaturesGrid />

				{/* Contact Form */}
				<ContactForm />

				{/* CTA Section */}
				<CtaSection />

				{/* Office Info */}
				<section className="py-24 px-6 lg:px-8">
					<div className="max-w-6xl mx-auto">
						<div className="text-center mb-16">
							<h2 className="text-3xl font-bold mb-4">Visit our offices</h2>
							<p className="text-muted-foreground">
								We have offices around the world. Stop by for a coffee and chat
								about property management.
							</p>
						</div>

						<div className="grid md:grid-cols-3 gap-8">
							{[
								{
									city: 'San Francisco',
									address:
										'123 Market Street\nSuite 500\nSan Francisco, CA 94103',
									phone: '+1 (555) 123-4567',
									email: 'sf@tenantflow.com'
								},
								{
									city: 'New York',
									address: '456 Broadway\nFloor 12\nNew York, NY 10013',
									phone: '+1 (555) 987-6543',
									email: 'ny@tenantflow.com'
								},
								{
									city: 'Austin',
									address: '789 Congress Ave\nBuilding A\nAustin, TX 78701',
									phone: '+1 (555) 456-7890',
									email: 'austin@tenantflow.com'
								}
							].map((office, index) => (
								<div key={index} className="text-center p-6 border rounded-lg">
									<h3 className="text-xl font-semibold mb-4">{office.city}</h3>
									<div className="space-y-3 text-muted-foreground">
										<div>
											<p className="font-medium text-foreground mb-1">
												Address
											</p>
											<p className="whitespace-pre-line text-sm">
												{office.address}
											</p>
										</div>
										<div>
											<p className="font-medium text-foreground mb-1">Phone</p>
											<p className="text-sm">{office.phone}</p>
										</div>
										<div>
											<p className="font-medium text-foreground mb-1">Email</p>
											<p className="text-sm">{office.email}</p>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* FAQ Quick Links */}
				<section className="section-content bg-muted/20">
					<div className="container mx-auto px-4 max-w-4xl text-center">
						<h2 className="text-2xl font-bold mb-4">Need quick answers?</h2>
						<p className="text-muted-foreground mb-8">
							Check out our frequently asked questions or browse our help
							center.
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Button variant="outline" asChild>
								<a href="/faq">View FAQ</a>
							</Button>
							<Button variant="outline" asChild>
								<a href="#contact-form">Help Center</a>
							</Button>
						</div>
					</div>
				</section>
			</div>
			<Footer />
		</main>
	)
}
