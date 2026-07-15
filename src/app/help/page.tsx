import { ArrowRight, Mail, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { PageLayout } from "#components/layout/page-layout";
import { HeroSection } from "#components/sections/hero-section";
import { JsonLdScript } from "#components/seo/json-ld-script";
import { Button } from "#components/ui/button";
import { CardLayout } from "#components/ui/card-layout";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemSeparator,
	ItemTitle,
} from "#components/ui/item";
import { createBreadcrumbJsonLd } from "#lib/seo/breadcrumbs";
import { createPageMetadata } from "#lib/seo/page-metadata";
import { cn } from "#lib/utils";

export const metadata = createPageMetadata({
	title: "Help Center | Property Management Support & Guides",
	description:
		"Get help with TenantFlow property management software. Browse setup guides, feature tutorials, and support resources for landlords.",
	path: "/help",
});

export default function HelpPage() {
	return (
		<PageLayout>
			<JsonLdScript schema={createBreadcrumbJsonLd("/help")} />
			{/* Hero Section */}
			<HeroSection
				title="We're here to help"
				titleHighlight="when you need us"
				subtitle="Email support on every plan, with priority and phone support on Growth and Max. Browse the help center below for setup, billing, document vault, and lease e-sign questions."
				primaryCta={{
					label: "See Pricing",
					href: "/pricing",
				}}
				secondaryCta={{ label: "Contact Sales", href: "/contact" }}
				trustSignals="Email support on every plan • Priority and phone support on Growth and Max"
			/>

			{/* Support Options */}
			<section className="section-spacing">
				<div className="max-w-6xl mx-auto px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="typography-h1 mb-4">Pick the channel that fits</h2>
						<p className="text-xl text-muted-foreground">
							Email support on every plan. Phone and priority support on Growth
							and Max.
						</p>
					</div>

					<ItemGroup>
						<Item variant="outline">
							<ItemMedia variant="icon">
								<Mail />
							</ItemMedia>
							<ItemContent>
								<ItemTitle>Email Support</ItemTitle>
								<ItemDescription>Available on every plan</ItemDescription>
								<div className="mt-2">
									<p className="text-muted-foreground">
										support@tenantflow.app
									</p>
								</div>
							</ItemContent>
							<ItemActions>
								<Button className="w-full" variant="outline" asChild>
									<a href="mailto:support@tenantflow.app">Send Email</a>
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
								<ItemDescription>Growth and Max plans</ItemDescription>
								<div className="mt-2">
									<p className="text-muted-foreground">
										Talk to a real person about onboarding, billing, or feature
										questions
									</p>
								</div>
							</ItemContent>
							<ItemActions>
								<Button className="w-full" variant="outline" asChild>
									<Link href="/contact">Schedule Call</Link>
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
										Walk through your portfolio with our team and pick the right
										plan
									</p>
								</div>
							</ItemContent>
							<ItemActions>
								<Button className="w-full" asChild>
									<Link href="/contact">Contact Sales</Link>
								</Button>
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
								title: "Set up the document vault",
								description:
									"Per-entity uploads, custom categories, search, filters, and tax-season zip exports — see everything the vault does",
								badge: "Most Popular",
								badgeColor: "bg-primary/10 text-primary-text",
								href: "/features",
							},
							{
								title: "Send a lease for e-signature",
								description:
									"How lease e-sign integrates with your workflow on the Growth and Max plans, plus monthly volume limits",
								badge: "Lease Workflow",
								badgeColor: "bg-success/10 text-success-text",
								href: "/blog/category/lease-law",
							},
							{
								title: "Run reports for tax season",
								description:
									"Generate CPA-ready financial reports and bulk-download every receipt and tax document by entity",
								badge: "Tax Time",
								badgeColor: "bg-primary/10 text-primary-text",
								href: "/blog/category/tax-prep",
							},
							{
								title: "Manage billing and your account",
								description:
									"Switch plans, update payment methods, and export account data",
								badge: "Account",
								badgeColor: "bg-success/10 text-success-text",
								href: "/faq",
							},
						].map((resource) => (
							<Link
								key={resource.title}
								href={resource.href}
								className="group block h-full"
							>
								<CardLayout
									title={resource.title}
									description={resource.description}
									className="h-full bg-card border border-border/50 shadow-md transition-all group-hover:border-primary/40 group-hover:shadow-lg"
								>
									<div className="flex items-center justify-between">
										<span
											className={cn(
												"inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
												resource.badgeColor,
											)}
										>
											{resource.badge}
										</span>
										<ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
									</div>
								</CardLayout>
							</Link>
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
						Replace spreadsheets, Dropbox, and email with a single landlord-only
						platform. Our team is here to help you migrate and get going.
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Button size="lg" variant="secondary" className="px-8" asChild>
							<Link href="/pricing">
								Start free — no card
								<ArrowRight className="size-5 ml-2" />
							</Link>
						</Button>
						<Button
							size="lg"
							variant="outline"
							className="px-8 text-primary-foreground border-primary-foreground/50 hover:bg-primary-foreground hover:text-primary-text"
							asChild
						>
							<Link href="/contact">Talk to an Expert</Link>
						</Button>
					</div>
				</div>
			</section>
		</PageLayout>
	);
}
