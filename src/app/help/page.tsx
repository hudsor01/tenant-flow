import { ArrowRight, CalendarClock, Mail, MessageCircle } from "lucide-react";
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
import {
	clickTrackAttributes,
	contactTrackAttributes,
	ctaTrackAttributes,
} from "#lib/analytics/cta-attributes";
import { createBreadcrumbJsonLd } from "#lib/seo/breadcrumbs";
import { createPageMetadata } from "#lib/seo/page-metadata";
import { cn } from "#lib/utils";

export const metadata = createPageMetadata({
	title: "TenantFlow Help Center | Setup & Support",
	description:
		"Get help with TenantFlow: email support on every plan, priority support on Growth and Max, and answers to common questions from landlords.",
	path: "/help",
	ogCard: "help",
});

export default function HelpPage() {
	return (
		<PageLayout>
			<JsonLdScript schema={createBreadcrumbJsonLd("/help")} />
			{/* Hero Section */}
			<HeroSection
				title="TenantFlow"
				titleHighlight="Help Center"
				subtitle="We're here when you need us: email support on every plan, with priority support on Growth and Max."
				primaryCta={{
					label: "See Pricing",
					href: "/pricing",
				}}
				secondaryCta={{
					label: "Contact us",
					href: "/contact",
					trackLocation: "help-hero",
				}}
				trustSignals="Email support on every plan • Priority support on Growth and Max"
			/>

			{/* Support Options */}
			<section className="section-spacing">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="typography-h1 mb-4">Pick the channel that fits</h2>
						<p className="text-xl text-muted-foreground">
							Email support on every plan, with priority support on Growth and
							Max.
						</p>
					</div>

					<ItemGroup>
						<Item variant="outline">
							<ItemMedia variant="icon">
								<Mail />
							</ItemMedia>
							<ItemContent>
								<ItemTitle>Email Support</ItemTitle>
								<ItemDescription className="mb-0">
									Available on every plan
								</ItemDescription>
								<div className="mt-2">
									<p className="mb-0 text-muted-foreground">
										support@tenantflow.app
									</p>
								</div>
							</ItemContent>
							<ItemActions>
								<Button className="w-full" variant="outline" asChild>
									<a
										href="mailto:support@tenantflow.app"
										{...clickTrackAttributes({
											name: "support_email_click",
											props: { location: "help" },
										})}
									>
										Send Email
									</a>
								</Button>
							</ItemActions>
						</Item>

						<ItemSeparator />

						<Item variant="outline">
							<ItemMedia variant="icon">
								<CalendarClock />
							</ItemMedia>
							<ItemContent>
								<ItemTitle>Demo or Call</ItemTitle>
								<ItemDescription className="mb-0">
									Before or after you sign up
								</ItemDescription>
								<div className="mt-2">
									<p className="mb-0 text-muted-foreground">
										Share a few times that work and we&apos;ll email you to
										confirm one
									</p>
								</div>
							</ItemContent>
							<ItemActions>
								<Button className="w-full" variant="outline" asChild>
									<Link
										href="/contact?topic=call"
										{...contactTrackAttributes("help-call")}
									>
										Request a call
									</Link>
								</Button>
							</ItemActions>
						</Item>

						<ItemSeparator />

						<Item variant="outline">
							<ItemMedia variant="icon">
								<MessageCircle />
							</ItemMedia>
							<ItemContent>
								<ItemTitle>Questions before you buy</ItemTitle>
								<ItemDescription className="mb-0">
									Which plan fits, or help moving your records in
								</ItemDescription>
								<div className="mt-2">
									<p className="mb-0 text-muted-foreground">
										Tell us about your portfolio and we&apos;ll recommend a plan
									</p>
								</div>
							</ItemContent>
							<ItemActions>
								<Button className="w-full" asChild>
									<Link
										href="/contact"
										{...contactTrackAttributes("help-sales")}
									>
										Contact us
									</Link>
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

					<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
								href: "/features",
							},
							{
								title: "Run reports for tax season",
								description:
									"Generate CPA-ready financial reports and bulk-download every receipt and tax document by entity",
								badge: "Tax Time",
								badgeColor: "bg-primary/10 text-primary-text",
								href: "/features",
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
					<p className="text-xl text-primary-foreground mb-8">
						Replace spreadsheets, Dropbox, and email with a single landlord-only
						platform. We&apos;ll help you check your CSV import.
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Button
							size="lg"
							variant="secondary"
							className="px-8 focus-visible:ring-primary-foreground/80"
							asChild
						>
							<Link href="/pricing" {...ctaTrackAttributes("help-bottom")}>
								Start free — no card
								<ArrowRight className="size-5 ml-2" />
							</Link>
						</Button>
						<Button
							size="lg"
							variant="outline"
							className="px-8 bg-transparent text-primary-foreground border-primary-foreground/50 hover:bg-primary-foreground hover:text-primary-text dark:bg-transparent dark:border-primary-foreground/50 dark:hover:bg-primary-foreground dark:hover:text-primary-text focus-visible:border-primary-foreground focus-visible:ring-primary-foreground/80"
							asChild
						>
							<Link href="/contact" {...contactTrackAttributes("help-bottom")}>
								Contact us
							</Link>
						</Button>
					</div>
				</div>
			</section>
		</PageLayout>
	);
}
