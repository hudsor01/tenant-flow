import Footer from '@/components/layout/footer'
import { Navbar } from '@/components/layout/navbar'
import { ContactForm } from '@/components/marketing/contact-form'
import { ContentSection } from '@/components/marketing/content-section'
import { CtaSection } from '@/components/marketing/cta-section'
import { FeaturesGrid } from '@/components/marketing/features-grid'
import { PremiumHeroSection } from '@/components/sections/hero-section'

import { BlurFade } from '@/components/magicui/blur-fade'
import { Button } from '@/components/ui/button'
import { containerClasses } from '@/lib/design-system'
import { TYPOGRAPHY_SCALE } from '@repo/shared'
import { ArrowRight, Mail, MessageSquare, Phone } from 'lucide-react'

export default function ContactPage() {
	return (
		<main className="min-h-screen bg-background">
			<Navbar />
			<div className="pt-10">
				{/* Hero Section */}
				<PremiumHeroSection
					announcementText="Trusted by 10,000+ property managers"
					headline="Ready to Transform Your Business?"
					subheadline="Join property managers who have transformed their operations with TenantFlow. Our experts will show you exactly how to reduce costs by 32% and automate 80% of daily tasks."
					primaryCTAText="Get Custom ROI Report"
					primaryCTAHref="#contact-form"
					secondaryCTAText="Schedule Free Call"
					secondaryCTAHref="#options"
				/>

				{/* Enhanced Content Section */}
				<ContentSection />

				{/* Contact Options */}
				<section className="section-hero" id="options">
					<div className={containerClasses('xl')}>
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
										className="card-elevated-authority rounded-2xl card-padding text-center transition-all duration-300 hover:shadow-lg group"
									>
										<div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-primary/20 to-accent/20 mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
											<option.icon className="w-8 h-8 text-primary" />
										</div>
										<h3
											className="font-semibold text-foreground mb-3"
											style={TYPOGRAPHY_SCALE['heading-sm']}
										>
											{option.title}
										</h3>
										<p
											className="text-muted-foreground leading-relaxed mb-6"
											style={TYPOGRAPHY_SCALE['body-sm']}
										>
											{option.description}
										</p>
										<Button
											asChild
											className="mb-4 w-full group btn-gradient-primary"
										>
											<a href={option.href}>
												{option.action}
												<ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
											</a>
										</Button>
										<p
											className="text-muted-foreground"
											style={TYPOGRAPHY_SCALE['body-xs']}
										>
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
			</div>
			<Footer />
		</main>
	)
}
