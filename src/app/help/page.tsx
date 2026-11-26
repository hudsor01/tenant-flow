import { ArrowRight, CalendarClock, Mail, MessageCircle } from "lucide-react";
import Link from "next/link";
import { PageLayout } from "#components/layout/page-layout";
import { HeroSection } from "#components/sections/hero-section";
import { JsonLdScript } from "#components/seo/json-ld-script";
import { Button } from "#components/ui/button";
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
import { HELP_ARTICLES } from "./help-articles";

export const metadata = createPageMetadata({
	title: "TenantFlow Help Center | Setup & Support",
	description:
		"How-to guides for TenantFlow: import properties, create and e-sign leases, track rent, organize documents. Email support on every plan.",
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
				subtitle="Step-by-step guides below, and email support on every plan, with priority support on Growth and Max."
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

			{/* How-to guides (2026-11-24 SEO audit HC1): each card's link is its
			    heading, with an ::after overlay (HC8). */}
			<section className="section-spacing">
				<div className="max-w-5xl mx-auto px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="typography-h1 mb-4">How-to guides</h2>
						<p className="text-xl text-muted-foreground">
							Step-by-step help for the things landlords do most in TenantFlow
						</p>
					</div>

					<ul className="m-0 grid grid-cols-1 gap-6 pl-0 md:grid-cols-2 [&>li]:mb-0">
						{HELP_ARTICLES.map((article) => (
							<li
								key={article.slug}
								className="group relative flex flex-col rounded-xl border border-border/50 bg-card p-6 shadow-sm transition-all hover:border-primary/40 hover:shadow-md has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring"
							>
								<h3 className="mb-2 text-lg font-semibold text-foreground">
									<Link
										href={`/help/${article.slug}`}
										{...clickTrackAttributes({
											name: "resource_open",
											props: { resource: article.slug, from: "help" },
										})}
										className="text-foreground after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none group-hover:text-primary-text"
									>
										{article.title}
									</Link>
								</h3>
								<p className="mb-0 text-sm text-muted-foreground">
									{article.summary}
								</p>
							</li>
						))}
					</ul>
				</div>
			</section>

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
