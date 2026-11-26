import {
	ArrowRight,
	CalendarClock,
	Download,
	FileSignature,
	FolderLock,
	Lock,
	ShieldCheck,
	Zap,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageLayout } from "#components/layout/page-layout";
import { HeroSection } from "#components/sections/hero-section";
import { JsonLdScript } from "#components/seo/json-ld-script";
import { BlurFade } from "#components/ui/blur-fade";
import { Button } from "#components/ui/button";
import {
	Item,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemSeparator,
	ItemTitle,
} from "#components/ui/item";
import {
	contactTrackAttributes,
	ctaTrackAttributes,
} from "#lib/analytics/cta-attributes";
import { createBreadcrumbJsonLd } from "#lib/seo/breadcrumbs";
import { createOrganizationPageJsonLd } from "#lib/seo/collection-schema";
import { createPageMetadata } from "#lib/seo/page-metadata";

const stats = [
	{ number: "Vault", label: "Per-entity document storage", Icon: FolderLock },
	{ number: "E-Sign", label: "Lease e-signing", Icon: FileSignature },
	{
		number: "Private",
		label: "Per-landlord data isolation",
		Icon: ShieldCheck,
	},
	{
		number: "14-day",
		label: "Free trial, no credit card",
		Icon: CalendarClock,
	},
];

// ISR — about-page copy is static; 1h revalidate matches the sibling
// marketing pages (/pricing, /features, /compare/[competitor], /faq) so
// edits land without a full redeploy. Closes PERF-02 (Phase 13): every
// ROADMAP-named marketing page now uses static generation + explicit
// cache headers.
export const revalidate = 3600;

export const metadata: Metadata = createPageMetadata({
	title: "About TenantFlow: Property Management Software for Landlords",
	description:
		"TenantFlow is a landlord-only property management platform with a per-entity document vault, lease e-signing, and tax-ready reports.",
	path: "/about",
	ogCard: "about",
});

export default function AboutPage() {
	return (
		<PageLayout>
			<JsonLdScript schema={createBreadcrumbJsonLd("/about")} />
			<JsonLdScript
				schema={createOrganizationPageJsonLd("AboutPage", {
					name: "About TenantFlow",
					path: "/about",
				})}
			/>

			{/* Hero Section */}
			<HeroSection
				title="Property management"
				titleHighlight="built for landlords"
				subtitle="One platform for property records, leases, maintenance, and the document vault. Tenants are records you keep for your own tracking — never users on the platform."
				primaryCta={{
					label: "Start free — no card",
					href: "/pricing",
					trackLocation: "about-hero",
				}}
				secondaryCta={{
					label: "Contact us",
					href: "/contact",
					trackLocation: "about-hero",
				}}
			/>

			{/* Mission Section */}
			<section className="section-spacing">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<BlurFade delay={0.2}>
						{/* The position, not a generic mission (2026-11-24 SEO audit
						    AB3); the filler "Mission-Driven Development" card is gone
						    (AB7). */}
						<div className="mx-auto max-w-3xl space-y-6 text-center">
							<h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight text-foreground">
								Our Mission
							</h2>
							<p className="mb-0 text-xl text-muted-foreground leading-relaxed">
								TenantFlow exists for landlords who manage their own rentals and
								don&apos;t want a tenant portal or a payment processor in the
								middle. It keeps every property, lease, maintenance request and
								document in one place you control.
							</p>
						</div>
					</BlurFade>
				</div>
			</section>

			{/* Values Section */}
			<section className="section-spacing bg-muted/20">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<BlurFade delay={0.3}>
						<div className="text-center mb-16 space-y-4">
							<h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight text-foreground">
								Our Values
							</h2>
							<p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
								What the product holds to, in what it does.
							</p>
						</div>

						<ItemGroup>
							<Item variant="outline">
								<ItemMedia variant="icon">
									<Download />
								</ItemMedia>
								<ItemContent>
									{/* AB2: a value a landlord can check, in place of the
									    stack. Settings' "Download My Data" saves exactly
									    these records (export-user-data). */}
									<ItemTitle>Your data is yours</ItemTitle>
									<ItemDescription className="mb-0">
										Download your properties, units, tenants, leases,
										maintenance requests and expenses as a file from Settings,
										any time.
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
									<ItemDescription className="mb-0">
										Row-level data isolation per landlord, encrypted at rest,
										data export and account deletion requests in Settings.
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
									<ItemDescription className="mb-0">
										Property management has enough moving parts. We focus on
										workflows landlords run every week — leases, maintenance,
										documents, and tax-time exports — not configuration.
									</ItemDescription>
								</ItemContent>
							</Item>
						</ItemGroup>
					</BlurFade>
				</div>
			</section>

			{/* Stats Section */}
			<section className="section-spacing">
				<div className="@container/about-stats max-w-7xl mx-auto px-6 lg:px-8">
					<BlurFade delay={0.5}>
						<div className="text-center mb-16 space-y-4">
							<h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight text-foreground">
								What ships in the box
							</h2>
							<p className="text-xl text-muted-foreground leading-relaxed">
								Every plan includes the document vault. Growth and Max add lease
								e-sign.
							</p>
						</div>

						{/* The columns step on the section's own width, never the
						    viewport's: one until two tiles are 10rem wide, each holding
						    its figure on one line (two at 320 left each 54px: Private
						    ran 7.67px past it, 14-day and E-Sign broke at the hyphen), four
						    from where four are (66.2-39 fix round 4, Part 8d). */}
						<div className="grid grid-cols-1 @min-[22rem]/about-stats:grid-cols-2 @min-[46rem]/about-stats:grid-cols-4 gap-8">
							{stats.map((stat, index) => (
								<BlurFade key={stat.label} delay={0.6 + index * 0.1}>
									<div className="text-center bg-card rounded-2xl p-8 border border-border/50">
										<div className="mb-4 flex justify-center">
											<stat.Icon className="size-8 text-primary" aria-hidden />
										</div>
										<div className="whitespace-nowrap typography-h2 text-primary-text mb-2">
											{stat.number}
										</div>
										<div className="text-muted-foreground">{stat.label}</div>
									</div>
								</BlurFade>
							))}
						</div>
					</BlurFade>
				</div>
			</section>

			{/* CTA Section */}
			<section className="section-spacing bg-muted/20">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<BlurFade delay={1.0}>
						<div className="text-center space-y-8">
							<h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight leading-tight text-foreground">
								Ready to{" "}
								<span className="hero-highlight">
									simplify property management
								</span>
								?
							</h2>
							<p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
								Centralize your portfolio with the document vault, lease e-sign
								on Growth and Max, and tax-ready reports.
							</p>
							<div className="flex flex-col sm:flex-row gap-4 justify-center">
								<Button asChild size="lg" className="group">
									<Link href="/pricing" {...ctaTrackAttributes("about-bottom")}>
										Start free — no card
										<ArrowRight className="size-4 ml-2 transition-transform group-hover:translate-x-1" />
									</Link>
								</Button>
								<Button asChild variant="outline" size="lg">
									<Link
										href="/contact"
										{...contactTrackAttributes("about-bottom")}
									>
										Contact us
									</Link>
								</Button>
							</div>
							<p className="mb-0 text-muted-foreground">
								No setup fees • Per-landlord data isolation • 14-day free trial
								• Cancel anytime
							</p>
						</div>
					</BlurFade>
				</div>
			</section>
		</PageLayout>
	);
}
