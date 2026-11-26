import {
	ArrowRight,
	ClipboardCheck,
	HelpCircle,
	Mail,
	MessageCircle,
	Scale,
	Table,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageLayout } from "#components/layout/page-layout";
import { JsonLdScript } from "#components/seo/json-ld-script";
import { Badge } from "#components/ui/badge";
import { Button } from "#components/ui/button";
import {
	clickTrackAttributes,
	contactTrackAttributes,
} from "#lib/analytics/cta-attributes";
import { createBreadcrumbJsonLd } from "#lib/seo/breadcrumbs";
import { createCollectionPageJsonLd } from "#lib/seo/collection-schema";
import { createPageMetadata } from "#lib/seo/page-metadata";

const RESOURCES_DESCRIPTION =
	"Free printable landlord tools: a seasonal maintenance checklist, a Schedule E tax deduction tracker, and a 50-state security deposit reference card.";

export const metadata: Metadata = createPageMetadata({
	title: "Free Landlord Resources | Templates & Tools",
	description: RESOURCES_DESCRIPTION,
	path: "/resources",
	ogCard: "resources",
});

const mainResources = [
	{
		icon: <HelpCircle className="size-8" />,
		title: "Help Center",
		description:
			"Setup guides for the document vault, leases, maintenance, and billing.",
		href: "/help",
		color: "bg-muted border-border",
		iconColor: "text-muted-foreground",
	},
	// Blog tile removed in lockstep with the nav/footer deprioritization
	// (AUDIT-2 cycle-1). Restore once the first article cohort publishes.
	{
		icon: <MessageCircle className="size-8" />,
		title: "FAQ",
		description:
			"Common questions about TenantFlow — features, plans, security, and migrating in.",
		href: "/faq",
		color: "bg-success/10 border-success/20",
		iconColor: "text-success",
	},
	{
		icon: <Mail className="size-8" />,
		title: "Contact Support",
		description:
			"Email the team. Responses during US business hours, Monday through Friday.",
		href: "/contact",
		color: "bg-warning/10 border-warning/20",
		iconColor: "text-warning dark:text-warning",
	},
];

const downloadResources = [
	{
		icon: <ClipboardCheck className="size-6" />,
		title: "Seasonal Maintenance Checklist",
		description:
			"Season-by-season checklist covering HVAC, plumbing, and exterior inspections.",
		href: "/resources/seasonal-maintenance-checklist",
		badge: "Checklist",
		forWhom:
			"For landlords who handle upkeep themselves. Work through it at the start of each season, or hand it to your handyman.",
		cta: "View the checklist",
	},
	{
		icon: <Table className="size-6" />,
		title: "Tax Deduction Tracker",
		description:
			"Track every deductible expense year-round, organized by IRS Schedule E categories.",
		href: "/resources/landlord-tax-deduction-tracker",
		badge: "Printable",
		forWhom:
			"For landlords who file Schedule E. Fill it in as expenses come in, then hand it to your tax preparer at year end.",
		cta: "Open the tracker",
	},
	{
		icon: <Scale className="size-6" />,
		title: "Security Deposit Reference Card",
		description:
			"Deposit limits, return deadlines, and documentation requirements for all 50 states.",
		href: "/resources/security-deposit-reference-card",
		badge: "Guide",
		forWhom:
			"For landlords setting a deposit or handling a move-out. Check your state's cap before you sign, and its deadline before you return a deposit.",
		cta: "See deposit rules by state",
	},
];

/** Posts on the downloads' topics (2026-11-24 SEO audit RS6). */
const blogLinks = [
	{
		title: "How TenantFlow simplifies tax season for independent landlords",
		href: "/blog/how-tenantflow-simplifies-tax-season-for-independent-landlords",
		pairsWith: "Pairs with the tax deduction tracker",
	},
	{
		title: "The simple way to run move-in and move-out inspections",
		href: "/blog/tenantflow-the-simple-way-to-run-move-in-and-move-out-inspections",
		pairsWith: "Pairs with the deposit card and the maintenance checklist",
	},
];

/** Clicks on a hub card, by the page it opens. */
function resourceOpenAttributes(href: string) {
	return clickTrackAttributes({
		name: "resource_open",
		props: {
			resource: href.split("/").pop() ?? href,
			from: "resources-hub",
		},
	});
}

export default function ResourcesPage() {
	return (
		<PageLayout>
			<JsonLdScript schema={createBreadcrumbJsonLd("/resources")} />
			<JsonLdScript
				schema={createCollectionPageJsonLd({
					name: "Free Landlord Resources",
					path: "/resources",
					description: RESOURCES_DESCRIPTION,
					pages: downloadResources.map((resource) => ({
						name: resource.title,
						path: resource.href,
					})),
				})}
			/>

			{/* Hero Section */}
			<section className="relative section-spacing overflow-hidden">
				<div className="absolute inset-0 bg-background">
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklch,var(--color-primary)_5%,transparent),transparent_50%)]" />
				</div>

				<div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
					<div className="text-center max-w-4xl mx-auto space-y-8">
						{/* SEO audit RS5: the H1 names what the page offers. */}
						<h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-display text-foreground">
							Free landlord checklists and reference{" "}
							<span className="hero-highlight">guides</span>
						</h1>

						<p className="mb-0 text-muted-foreground leading-relaxed max-w-3xl mx-auto text-xl">
							Printable tools for running your rentals: a seasonal maintenance
							checklist, a Schedule E tax deduction tracker, and a 50-state
							security deposit chart.
						</p>
					</div>
				</div>
			</section>

			{/* Free Downloads, first: they are what the page is for (RS6). */}
			<section className="section-spacing">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight text-foreground mb-4">
							Free Downloads
						</h2>
						<p className="text-muted-foreground text-lg">
							Printable tools and reference guides for landlords
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						{downloadResources.map((resource) => (
							// The link is the heading, so its name is the title alone
							// (SEO audit RS3); its ::after covers the card.
							<article
								key={resource.title}
								className="group relative flex flex-col rounded-2xl border border-border bg-card p-6 hover:shadow-lg hover:border-primary/50 transition-all duration-300 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring"
							>
								<div className="flex items-center gap-3 mb-4">
									<div className="size-10 rounded-xl bg-primary/10 flex-center text-primary">
										{resource.icon}
									</div>
									<Badge variant="secondary">{resource.badge}</Badge>
								</div>
								<h3 className="font-semibold text-foreground mb-2">
									<Link
										href={resource.href}
										{...resourceOpenAttributes(resource.href)}
										className="text-foreground after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none group-hover:text-primary-text transition-colors"
									>
										{resource.title}
									</Link>
								</h3>
								<p className="text-sm text-muted-foreground mb-3">
									{resource.description}
								</p>
								<p className="text-sm text-muted-foreground mb-4">
									{resource.forWhom}
								</p>
								<span
									className="mt-auto inline-flex items-center text-sm text-primary-text font-medium group-hover:translate-x-1 transition-transform"
									aria-hidden="true"
								>
									{resource.cta}
									<ArrowRight className="size-4 ml-1.5" />
								</span>
							</article>
						))}
					</div>

					<div className="mt-16">
						<h2 className="text-2xl font-bold tracking-tight text-foreground mb-6">
							From the blog
						</h2>
						<ul className="m-0 grid grid-cols-1 gap-4 pl-0 md:grid-cols-2 [&>li]:mb-0">
							{blogLinks.map((post) => (
								<li
									key={post.href}
									className="rounded-xl border border-border bg-card p-5"
								>
									<Link
										href={post.href}
										className="font-medium text-primary-text underline underline-offset-4 hover:no-underline"
									>
										{post.title}
									</Link>
									<p className="mt-1 mb-0 text-sm text-muted-foreground">
										{post.pairsWith}
									</p>
								</li>
							))}
						</ul>
						<p className="mt-4 mb-0 text-sm">
							<Link
								href="/blog"
								className="text-primary-text underline underline-offset-4 hover:no-underline"
							>
								All articles for landlords
							</Link>
						</p>
					</div>
				</div>
			</section>

			{/* Help, FAQ and support, below the downloads (RS6). */}
			<section className="section-spacing bg-muted/30">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight text-foreground mb-4">
							Resource Center
						</h2>
						<p className="text-muted-foreground text-lg">
							Help, FAQ, and direct support
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						{mainResources.map((resource) => (
							<article
								key={resource.title}
								className={`group relative ${resource.color} rounded-3xl p-8 border hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 hover:scale-[1.02] has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring`}
							>
								<div className="flex items-start gap-6">
									<div
										className={`size-16 rounded-2xl bg-card border border-border flex-center shadow-lg group-hover:scale-110 transition-transform duration-300 ${resource.iconColor}`}
									>
										{resource.icon}
									</div>

									<div className="flex-1">
										<h3 className="font-bold text-foreground text-2xl mb-3">
											<Link
												href={resource.href}
												{...resourceOpenAttributes(resource.href)}
												className="text-foreground after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none"
											>
												{resource.title}
											</Link>
										</h3>
										<p className="text-muted-foreground mb-6 leading-relaxed">
											{resource.description}
										</p>

										<span
											className="flex items-center text-primary-text font-medium group-hover:translate-x-1 transition-transform"
											aria-hidden="true"
										>
											Explore
											<ArrowRight className="ml-2 size-4" />
										</span>
									</div>
								</div>
							</article>
						))}
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="section-spacing relative overflow-hidden">
				<div className="absolute inset-0 bg-background">
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,color-mix(in_oklch,var(--color-primary)_10%,transparent),transparent_70%)]" />
				</div>

				<div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
					<div className="text-center space-y-8">
						<h2 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-foreground">
							Still have questions?{" "}
							<span className="hero-highlight">Reach the team</span>
						</h2>

						<p className="text-muted-foreground leading-relaxed max-w-3xl mx-auto text-xl">
							Email us with anything we missed. We respond during US business
							hours, Monday through Friday.
						</p>

						<div className="flex flex-col sm:flex-row gap-6 justify-center">
							<Button
								size="lg"
								className="shadow-2xl shadow-primary/25 typography-large px-8 py-4"
								asChild
							>
								<Link
									href="/contact"
									{...contactTrackAttributes("resources-bottom")}
								>
									Contact Support
									<ArrowRight className="size-5 ml-3" />
								</Link>
							</Button>
							<Button
								variant="outline"
								size="lg"
								className="border-2 border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 dark:border-muted-foreground/30 dark:hover:bg-primary/5 typography-large px-8 py-4"
								asChild
							>
								<Link href="/help">Browse Help Center</Link>
							</Button>
						</div>
					</div>
				</div>
			</section>
		</PageLayout>
	);
}
