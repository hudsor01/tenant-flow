import { createPageMetadata } from '#lib/seo/page-metadata'
import { PageLayout } from '#components/layout/page-layout'
import { HeroSection } from '#components/sections/hero-section'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { JsonLdScript } from '#components/seo/json-ld-script'
import { createBreadcrumbJsonLd } from '#lib/seo/breadcrumbs'

export const metadata = createPageMetadata({
	title: 'Help Center — Property Management Support & Guides',
	description: 'Get help with TenantFlow property management software. Browse setup guides, feature tutorials, and support resources for property owners and operators.',
	path: '/help',
})

import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemSeparator,
	ItemTitle
} from '#components/ui/item'
import {
	ArrowRight,
	Book,
	Mail,
	MessageCircle,
	Phone
} from 'lucide-react'

export default function HelpPage() {
	return (
		<PageLayout>
			<JsonLdScript schema={createBreadcrumbJsonLd('/help')} />
			{/* Hero Section */}
			<HeroSection
				title="We're here to help"
				titleHighlight="when you need us"
				subtitle="Email support on every plan, with priority and phone support on Growth and Max. Browse the help center below for setup, billing, document vault, and lease e-sign questions."
				primaryCta={{
					label: 'See Pricing',
					href: '/pricing'
				}}
				secondaryCta={{ label: 'Contact Sales', href: '/contact' }}
				trustSignals="Email support on every plan • Priority and phone support on Growth and Max"
				image={{
					src: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=2074&auto=format&fit=crop',
					alt: 'Professional customer support team helping property managers'
				}}
			/>

			{/* Support Options */}
			<section className="section-spacing">
				<div className="max-w-6xl mx-auto px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="typography-h1 mb-4">
							Pick the channel that fits
						</h2>
						<p className="text-xl text-muted-foreground">
							Email support on every plan. Phone and priority support on Growth and Max.
						</p>
					</div>

					<ItemGroup>
						<Item variant="outline">
							<ItemMedia variant="icon">
								<Mail />
							</ItemMedia>
							<ItemContent>
								<ItemTitle>Email Support</ItemTitle>
								<ItemDescription>
									Available on every plan
								</ItemDescription>
								<div className="mt-2">
									<p className="text-muted-foreground">support@tenantflow.app</p>
								</div>
							</ItemContent>
							<ItemActions>
								<Button className="w-full" variant="outline">
									Send Email
								</Button>
							</ItemActions>
						</Item>

						<ItemSeparator />

						<Item variant="outline">
							<ItemMedia variant="icon">
								<Phone />
							</ItemMedia>
							<ItemContent>
								<ItemTitle>Phone Support</ItemTitle>
								<ItemDescription>
									Growth and Max plans
								</ItemDescription>
								<div className="mt-2">
									<p className="text-muted-foreground">
										Talk to a real person about onboarding, billing, or feature questions
									</p>
								</div>
							</ItemContent>
							<ItemActions>
								<Button className="w-full" variant="outline">
									Schedule Call
								</Button>
							</ItemActions>
						</Item>

						<ItemSeparator />

						<Item variant="outline">
							<ItemMedia variant="icon">
								<Book />
							</ItemMedia>
							<ItemContent>
								<ItemTitle>Help Center</ItemTitle>
								<ItemDescription>
									Setup, billing, document vault, lease e-sign
								</ItemDescription>
								<div className="mt-2">
									<p className="text-muted-foreground">
										Step-by-step articles for the most common workflows
									</p>
								</div>
							</ItemContent>
							<ItemActions>
								<Button className="w-full" variant="outline">
									Browse Articles
								</Button>
							</ItemActions>
						</Item>

						<ItemSeparator />

						<Item variant="outline">
							<ItemMedia variant="icon">
								<MessageCircle />
							</ItemMedia>
							<ItemContent>
								<ItemTitle>Contact Sales</ItemTitle>
								<ItemDescription>
									Pre-purchase questions or migration help
								</ItemDescription>
								<div className="mt-2">
									<p className="text-muted-foreground">
										Walk through your portfolio with our team and pick the right plan
									</p>
								</div>
							</ItemContent>
							<ItemActions>
								<Button className="w-full">Contact Sales</Button>
							</ItemActions>
						</Item>
					</ItemGroup>
				</div>
			</section>

			{/* Popular Resources */}
			<section className="section-spacing">
				<div className="max-w-4xl mx-auto px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="typography-h1 mb-4">Popular resources</h2>
						<p className="text-xl text-muted-foreground">
							Quick access to the most requested help topics
						</p>
					</div>

					<div className="grid md:grid-cols-2 gap-6">
						{[
							{
								title: 'Set up the document vault',
								description:
									'Per-entity uploads, custom categories, search, filters, and bulk-zip export — everything the vault does in one walkthrough',
								badge: 'Most Popular',
								badgeColor: 'bg-primary/10 text-primary'
							},
							{
								title: 'Send a lease for e-signature with DocuSeal',
								description:
									'How DocuSeal integrates with your lease workflow on the Growth and Max plans, plus monthly volume limits',
								badge: 'Lease Workflow',
								badgeColor: 'bg-accent/10 text-accent'
							},
							{
								title: 'Run reports for tax season',
								description:
									'Generate CPA-ready financial reports and bulk-download every receipt and tax document by entity',
								badge: 'Tax Time',
								badgeColor: 'bg-primary/10 text-primary'
							},
							{
								title: 'Manage your team and billing',
								description:
									'Invite team members, switch plans, update payment methods, and export account data',
								badge: 'Account',
								badgeColor: 'bg-accent/10 text-accent'
							}
						].map(resource => (
							<CardLayout
								key={resource.title}
								title={resource.title}
								description={resource.description}
								className="bg-card border border-border/50 shadow-md transition-shadow"
							>
								<div className="flex items-start justify-between mb-4">
									<h3 className="font-semibold text-lg leading-tight pr-4">
										{resource.title}
									</h3>
								</div>
								<p className="text-muted-foreground mb-4">
									{resource.description}
								</p>
								<Button variant="outline" className="w-full">
									Read Guide
									<ArrowRight className="size-4 ml-2" />
								</Button>
							</CardLayout>
						))}
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="section-spacing bg-primary">
				<div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
					<h2 className="typography-h1 text-primary-foreground mb-4">
						Ready to centralize your portfolio?
					</h2>
					<p className="text-xl text-primary-foreground/90 mb-8">
						Replace spreadsheets, Dropbox, and email with a single landlord-only platform. Our team is here to help you migrate and get going.
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Button size="lg" variant="secondary" className="px-8">
							Start 14-day transformation
							<ArrowRight className="size-5 ml-2" />
						</Button>
						<Button
							size="lg"
							variant="outline"
							className="px-8 text-primary-foreground border-primary-foreground/50 hover:bg-primary-foreground hover:text-primary"
						>
							Talk to an Expert
						</Button>
					</div>
				</div>
			</section>
		</PageLayout>
	)
}
