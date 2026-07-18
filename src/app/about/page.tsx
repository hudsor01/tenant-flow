import {
	ArrowRight,
	CalendarClock,
	FileSignature,
	FolderLock,
	Handshake,
	Lightbulb,
	Lock,
	Rocket,
	ShieldCheck,
	Sprout,
	Target,
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
import { createBreadcrumbJsonLd } from "#lib/seo/breadcrumbs";
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
	title: "About | Our Mission",
	description:
		"TenantFlow is a landlord-only property management platform with a per-entity document vault, lease e-signing, and tax-ready reports.",
	path: "/about",
});

export default function AboutPage() {
	return (
		<PageLayout>
			<JsonLdScript schema={createBreadcrumbJsonLd("/about")} />

			{/* Hero Section */}
			<HeroSection
				title="Property management"
				titleHighlight="built for landlords"
				subtitle="One platform for property records, leases, maintenance, and the document vault. Tenants are records you keep for your own tracking — never users on the platform."
				primaryCta={{ label: "Start free — no card", href: "/pricing" }}
				secondaryCta={{ label: "Contact Sales", href: "/contact" }}
				brandArt
			/>

			{/* Mission Section */}
			<section className="section-spacing">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<BlurFade delay={0.2} inView>
						<div className="grid xl:grid-cols-2 gap-16 items-center">
							<div className="space-y-6">
								<h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
									Our Mission
								</h2>
								<div className="space-y-4">
									<p className="text-xl text-muted-foreground leading-relaxed">
										To empower landlords with the tools they need to grow their
										business, reduce operational overhead, and stay organized
										across their entire portfolio.
									</p>
									<p className="text-base text-muted-foreground leading-relaxed">
										We believe property management should be streamlined,
										data-driven, and give landlords a reliable system of record
										for every property they own.
									</p>
								</div>
							</div>
							<div className="bg-card rounded-2xl p-8 text-center border border-border/50 shadow-md">
								<Target className="size-20 mx-auto mb-6 text-primary" />
								<h3 className="typography-h3 text-foreground">
									Mission-Driven Development
								</h3>
								<p className="text-muted-foreground mt-3">
									Every feature built with landlords in mind
								</p>
							</div>
						</div>
					</BlurFade>
				</div>
			</section>

			{/* Values Section */}
			<section className="section-spacing bg-muted/20">
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
									<ItemTitle>Built on a modern stack</ItemTitle>
									<ItemDescription>
										TenantFlow runs on modern, well-documented infrastructure
										and stays current with security and platform updates.
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
										Your success is our success. We are committed to helping you
										achieve your goals.
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
										Row-level data isolation per landlord, encrypted at rest,
										GDPR-compliant deletion flow.
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
										Property management has enough moving parts. We focus on
										workflows landlords run every week — leases, maintenance,
										documents, and tax-time exports — not configuration.
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
										landlords.
									</ItemDescription>
								</ItemContent>
							</Item>
						</ItemGroup>
					</BlurFade>
				</div>
			</section>

			{/* Stats Section */}
			<section className="section-spacing">
				<div className="max-w-6xl mx-auto px-6 lg:px-8">
					<BlurFade delay={0.5} inView>
						<div className="text-center mb-16 space-y-4">
							<h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
								What ships in the box
							</h2>
							<p className="text-xl text-muted-foreground leading-relaxed">
								Every plan starts with the document vault and lease e-sign on
								Growth and Max.
							</p>
						</div>

						<div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
							{stats.map((stat, index) => (
								<BlurFade key={stat.label} delay={0.6 + index * 0.1} inView>
									<div className="text-center bg-card rounded-2xl p-8 border border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
										<div className="mb-4 flex justify-center">
											<stat.Icon className="size-8 text-primary" aria-hidden />
										</div>
										<div className="typography-h2 text-primary mb-2">
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
				<div className="max-w-6xl mx-auto px-6 lg:px-8">
					<BlurFade delay={1.0} inView>
						<div className="text-center space-y-8">
							<h2 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-foreground">
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
									<Link href="/pricing">
										Start free — no card
										<ArrowRight className="size-4 ml-2 transition-transform group-hover:translate-x-1" />
									</Link>
								</Button>
								<Button asChild variant="outline" size="lg">
									<Link href="/contact">Contact Sales</Link>
								</Button>
							</div>
							<p className="text-muted-foreground">
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
