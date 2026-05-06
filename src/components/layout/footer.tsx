import Link from 'next/link'
import { Home } from 'lucide-react'

// Sitewide footer links double as the primary internal-link distributor —
// every marketing surface should appear here at least once so PageRank
// flows through the navbar AND the footer. The audit flagged the prior
// 3-link footer (Terms/Privacy/Help) as the largest internal-linking gap
// on the site.
const FOOTER_SECTIONS: ReadonlyArray<{
	heading: string
	links: ReadonlyArray<{ label: string; href: string; external?: boolean }>
}> = [
	{
		heading: 'Product',
		links: [
			{ label: 'Features', href: '/features' },
			{ label: 'Pricing', href: '/pricing' },
			{ label: 'Compare', href: '/compare' },
			{ label: 'Resources', href: '/resources' },
		],
	},
	{
		heading: 'Company',
		links: [
			{ label: 'About', href: '/about' },
			{ label: 'Blog', href: '/blog' },
			{ label: 'Contact', href: '/contact' },
			{ label: 'Support', href: '/support' },
		],
	},
	{
		heading: 'Resources',
		links: [
			{ label: 'Help Center', href: '/help' },
			{ label: 'FAQ', href: '/faq' },
			{ label: 'RSS Feed', href: '/feed.xml', external: true },
		],
	},
	{
		heading: 'Legal',
		links: [
			{ label: 'Terms of Service', href: '/terms' },
			{ label: 'Privacy Policy', href: '/privacy' },
			{ label: 'Security Policy', href: '/security-policy' },
		],
	},
]

export default function Footer() {
	return (
		<footer className="bg-background border-t border-border py-12 mt-16">
			<div className="max-w-7xl mx-auto px-6 lg:px-8">
				<div className="grid grid-cols-2 gap-8 md:grid-cols-4 mb-8">
					{FOOTER_SECTIONS.map(section => (
						<nav key={section.heading} aria-label={section.heading}>
							<h2 className="text-sm font-semibold text-foreground mb-4">
								{section.heading}
							</h2>
							<ul className="space-y-2 text-sm text-muted-foreground">
								{section.links.map(link => (
									<li key={link.href}>
										<Link
											href={link.href}
											{...(link.external
												? {
														target: '_blank',
														rel: 'noopener noreferrer',
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
						<div
							className="flex items-center justify-center rounded bg-primary"
							style={{ width: '1.25rem', height: '1.25rem' }}
						>
							<Home
								className="text-primary-foreground"
								style={{ width: '0.75rem', height: '0.75rem' }}
								aria-hidden="true"
							/>
						</div>
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
	)
}
