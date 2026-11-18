import Image from "next/image";
import Link from "next/link";

// Sitewide footer links double as the primary internal-link distributor —
// every marketing surface should appear here at least once so PageRank
// flows through the navbar AND the footer. The audit flagged the prior
// 3-link footer (Terms/Privacy/Help) as the largest internal-linking gap
// on the site.
const FOOTER_SECTIONS: ReadonlyArray<{
	heading: string;
	links: ReadonlyArray<{ label: string; href: string; external?: boolean }>;
}> = [
	{
		heading: "Product",
		links: [
			{ label: "Features", href: "/features" },
			{ label: "Pricing", href: "/pricing" },
			{ label: "Compare", href: "/compare" },
			{ label: "Resources", href: "/resources" },
		],
	},
	{
		heading: "Company",
		// "Blog" link removed pending first article cohort (AUDIT-2,
		// 2026-05-18). See `navbar/types.ts` Resources dropdown for the
		// same rationale: don't promote /blog from sitewide chrome while
		// the page renders an empty-state placeholder.
		links: [
			{ label: "About", href: "/about" },
			{ label: "Contact", href: "/contact" },
		],
	},
	{
		heading: "Resources",
		links: [
			{ label: "Blog", href: "/blog" },
			{ label: "Help Center", href: "/help" },
			{ label: "FAQ", href: "/faq" },
			{ label: "RSS Feed", href: "/feed.xml", external: true },
		],
	},
	{
		heading: "Legal",
		links: [
			{ label: "Terms of Service", href: "/terms" },
			{ label: "Privacy Policy", href: "/privacy" },
			{ label: "Security Policy", href: "/security-policy" },
			{ label: "Sitemap", href: "/sitemap.xml", external: true },
		],
	},
];

export default function Footer() {
	return (
		<footer className="bg-background border-t border-border py-12 mt-16">
			<div className="max-w-7xl mx-auto px-6 lg:px-8">
				<div className="grid grid-cols-2 gap-8 md:grid-cols-4 mb-8">
					{FOOTER_SECTIONS.map((section) => (
						<nav key={section.heading} aria-label={section.heading}>
							<h2 className="text-sm font-semibold text-foreground mb-4">
								{section.heading}
							</h2>
							<ul className="flex flex-col gap-2 pl-0 mt-0 mb-0 [&>li]:mb-0 text-sm text-muted-foreground">
								{section.links.map((link) => (
									<li key={link.href}>
										<Link
											href={link.href}
											{...(link.external
												? {
														target: "_blank",
														rel: "noopener noreferrer",
													}
												: {})}
											className="hover:text-foreground transition-colors"
										>
											{link.label}
										</Link>
									</li>
								))}
							</ul>
						</nav>
					))}
				</div>

				<div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-sm text-muted-foreground">
					<div className="flex items-center gap-2">
						{/* Same treatment as the navbar mark: drawn for a white ground,
						    so dark mode gives it a light tile. */}
						<span className="flex size-6 items-center justify-center rounded dark:bg-foreground">
							<Image
								src="/brand/tenantflow-mark.png"
								alt=""
								width={20}
								height={20}
								className="size-5"
							/>
						</span>
						<span className="font-medium text-foreground">TenantFlow</span>
						<span aria-hidden="true">·</span>
						<span>© 2026 TenantFlow. All rights reserved.</span>
					</div>

					<Link
						href="https://hudsondigitalsolutions.com"
						target="_blank"
						rel="noopener noreferrer"
						className="hover:text-foreground transition-colors"
					>
						Powered by Hudson Digital
					</Link>
				</div>
			</div>
		</footer>
	);
}
