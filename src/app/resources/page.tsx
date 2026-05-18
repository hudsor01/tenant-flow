import {
	ArrowRight,
	ClipboardCheck,
	Download,
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
import { createBreadcrumbJsonLd } from "#lib/seo/breadcrumbs";
import { createPageMetadata } from "#lib/seo/page-metadata";

export const metadata: Metadata = createPageMetadata({
	title: "Free Landlord Resources — Templates & Tools",
	description:
		"Free downloadable property management templates: seasonal maintenance checklists, tax deduction trackers, security deposit law guides for landlords.",
	path: "/resources",
});

const mainResources = [
	{
		icon: <HelpCircle className="size-8" />,
		title: "Help Center",
		description:
			"Setup guides for the document vault, leases, maintenance, and team billing.",
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
			"Season-by-season checklist covering HVAC, plumbing, electrical, and exterior inspections.",
		href: "/resources/seasonal-maintenance-checklist",
		badge: "Checklist",
	},
	{
		icon: <Table className="size-6" />,
		title: "Tax Deduction Tracker",
		description:
			"Track every deductible expense year-round, organized by IRS Schedule E categories.",
		href: "/resources/landlord-tax-deduction-tracker",
		badge: "Spreadsheet",
	},
	{
		icon: <Scale className="size-6" />,
		title: "Security Deposit Reference Card",
		description:
			"Deposit limits, return deadlines, and documentation requirements for all 50 states.",
		href: "/resources/security-deposit-reference-card",
		badge: "Guide",
	},
];

export default function ResourcesPage() {
	return (
		<PageLayout>
			<JsonLdScript schema={createBreadcrumbJsonLd("/resources")} />

			{/* Hero Section */}
			<section className="relative pb-16 overflow-hidden">
				<div className="absolute inset-0 bg-background">
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklch,var(--color-primary)_5%,transparent),transparent_50%)]" />
				</div>

				<div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
					<div className="text-center max-w-4xl mx-auto space-y-8">
						<h1 className="text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1] text-foreground">
							Resources for{" "}
							<span className="text-foreground font-semibold">landlords</span>
						</h1>

						<p className="text-muted-foreground leading-relaxed max-w-3xl mx-auto text-xl">
							Setup guides, downloadable checklists, and reference material for
							running your portfolio with TenantFlow.
						</p>
					</div>
				</div>
			</section>

			{/* Main Resources Grid */}
			<section className="section-spacing bg-muted/30">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<div className="text-center mb-12">
						<h2 className="typography-h2 text-foreground mb-3">
							Resource Center
						</h2>
						<p className="text-muted-foreground text-lg">
							Help, FAQ, and direct support
						</p>
					</div>

					<div className="grid md:grid-cols-3 gap-8">
						{mainResources.map((resource) => (
							<Link
								key={resource.title}
								href={resource.href}
								className="group relative"
							>
								<div
									className={`${resource.color} rounded-3xl p-8 border hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 group-hover:scale-[1.02] h-full`}
								>
									<div className="flex items-start gap-6">
										<div
											className={`size-16 rounded-2xl bg-card border border-border flex-center shadow-lg group-hover:scale-110 transition-transform duration-300 ${resource.iconColor}`}
										>
											{resource.icon}
										</div>

										<div className="flex-1">
											<div className="flex items-center gap-3 mb-3">
												<h3 className="font-bold text-foreground text-2xl">
													{resource.title}
												</h3>
											</div>
											<p className="text-muted-foreground mb-6 leading-relaxed">
												{resource.description}
											</p>

											<div className="flex items-center text-primary font-medium group-hover:translate-x-1 transition-transform">
												Explore
												<ArrowRight className="ml-2 size-4" />
											</div>
										</div>
									</div>
								</div>
							</Link>
						))}
					</div>
				</div>
			</section>

			{/* Free Downloads */}
			<section className="section-spacing">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<div className="text-center mb-12">
						<h2 className="typography-h2 text-foreground mb-3">
							Free Downloads
						</h2>
						<p className="text-muted-foreground text-lg">
							Printable tools and reference guides for landlords
						</p>
					</div>

					<div className="grid md:grid-cols-3 gap-6">
						{downloadResources.map((resource) => (
							<Link
								key={resource.title}
								href={resource.href}
								className="group rounded-2xl border border-border bg-card p-6 hover:shadow-lg hover:border-primary/50 transition-all duration-300"
							>
								<div className="flex items-center gap-3 mb-4">
									<div className="size-10 rounded-xl bg-primary/10 flex-center text-primary">
										{resource.icon}
									</div>
									<Badge variant="secondary">{resource.badge}</Badge>
								</div>
								<h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
									{resource.title}
								</h3>
								<p className="text-sm text-muted-foreground mb-4">
									{resource.description}
								</p>
								<span className="inline-flex items-center text-sm text-primary font-medium group-hover:translate-x-1 transition-transform">
									<Download className="size-4 mr-1.5" />
									View &amp; Print
								</span>
							</Link>
						))}
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="section-content relative overflow-hidden">
				<div className="absolute inset-0 bg-background">
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,color-mix(in_oklch,var(--color-primary)_10%,transparent),transparent_70%)]" />
				</div>

				<div className="max-w-6xl mx-auto px-6 lg:px-8 relative z-10">
					<div className="text-center space-y-8">
						<h2 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-foreground">
							Still have questions?{" "}
							<span className="text-foreground font-semibold">
								Reach the team
							</span>
						</h2>

						<p className="text-muted-foreground leading-relaxed max-w-3xl mx-auto text-xl">
							Email us with anything we missed. We respond during US business
							hours, Monday through Friday.
						</p>

						<div className="flex flex-col sm:flex-row gap-6 justify-center">
							<Button
								size="lg"
								className="gradient-background hover:opacity-90 shadow-2xl shadow-primary/25 typography-large px-8 py-4"
								asChild
							>
								<Link href="/contact">
									Contact Support
									<ArrowRight className="size-5 ml-3" />
								</Link>
							</Button>
							<Button
								variant="outline"
								size="lg"
								className="border-2 border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 typography-large px-8 py-4"
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
