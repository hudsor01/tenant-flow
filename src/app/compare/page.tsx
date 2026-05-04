import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { PageLayout } from '#components/layout/page-layout'
import { JsonLdScript } from '#components/seo/json-ld-script'
import { BlurFade } from '#components/ui/blur-fade'
import { createBreadcrumbJsonLd } from '#lib/seo/breadcrumbs'
import { createPageMetadata } from '#lib/seo/page-metadata'

import { COMPETITORS, VALID_COMPETITORS } from './[competitor]/compare-data'

export const metadata: Metadata = createPageMetadata({
	title: 'Compare TenantFlow to Other Property Management Software',
	description:
		'Side-by-side comparisons of TenantFlow against Buildium, AppFolio, RentRedi, and other landlord-focused property management platforms.',
	path: '/compare'
})

export default function ComparePage() {
	const competitors = VALID_COMPETITORS.map(slug => COMPETITORS[slug]).filter(
		(competitor): competitor is NonNullable<typeof competitor> =>
			competitor !== undefined
	)

	return (
		<PageLayout>
			<JsonLdScript schema={createBreadcrumbJsonLd('/compare')} />

			<section className="section-spacing">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<BlurFade delay={0.1} inView>
						<header className="mb-12 max-w-3xl">
							<h1 className="text-4xl md:text-5xl font-bold tracking-tight">
								TenantFlow vs the alternatives
							</h1>
							<p className="mt-4 text-lg text-muted-foreground">
								Honest, side-by-side comparisons. Pick your current platform to
								see how TenantFlow compares on pricing, features, and the
								landlord-only model.
							</p>
						</header>
					</BlurFade>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
						{competitors.map((competitor, index) => (
							<BlurFade
								key={competitor.slug}
								delay={0.15 + index * 0.05}
								inView
							>
								<Link
									href={`/compare/${competitor.slug}`}
									className="group flex h-full flex-col rounded-lg border bg-card p-6 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									aria-label={`Compare TenantFlow vs ${competitor.name}`}
								>
									<h2 className="text-lg font-semibold group-hover:underline">
										TenantFlow vs {competitor.name}
									</h2>
									<p className="mt-2 text-sm text-muted-foreground">
										{competitor.tagline}
									</p>
									<p className="mt-4 text-sm text-muted-foreground line-clamp-3">
										{competitor.description}
									</p>
									<span className="mt-auto pt-4 inline-flex items-center text-sm font-medium text-primary">
										See comparison
										<ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
									</span>
								</Link>
							</BlurFade>
						))}
					</div>
				</div>
			</section>
		</PageLayout>
	)
}
