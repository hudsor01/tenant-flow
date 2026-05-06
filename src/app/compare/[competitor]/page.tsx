import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
	ArrowRight,
	Shield,
	Star,
	Calendar,
	Users,
} from 'lucide-react'
import { PageLayout } from '#components/layout/page-layout'
import { Button } from '#components/ui/button'
import { RelatedArticles } from '#components/blog/related-articles'
import { JsonLdScript } from '#components/seo/json-ld-script'
import { createBreadcrumbJsonLd } from '#lib/seo/breadcrumbs'
import { getSiteUrl } from '#lib/generate-metadata'
import { COMPETITORS, VALID_COMPETITORS } from './compare-data'
import {
	PricingComparison,
	FeatureTable,
	WhySwitchSection,
	BottomCta,
} from './compare-sections'

interface PageProps {
	params: Promise<{ competitor: string }>
}

export function generateStaticParams() {
	return VALID_COMPETITORS.map(competitor => ({ competitor }))
}

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { competitor: slug } = await params
	const data = COMPETITORS[slug]
	if (!data) return {}

	const baseUrl = getSiteUrl()

	return {
		// `title.absolute` opts out of the parent template, otherwise
		// rendered as "...Comparison | TenantFlow | TenantFlow".
		title: {
			absolute: `TenantFlow vs ${data.name}: Feature & Pricing Comparison`,
		},
		description: data.metaDescription,
		alternates: { canonical: `${baseUrl}/compare/${slug}` },
		openGraph: {
			title: `TenantFlow vs ${data.name}`,
			description: data.metaDescription,
			url: `${baseUrl}/compare/${slug}`,
			// `type: 'article'` would require og:article:published_time,
			// og:article:author, og:article:section per OGP. The page is
			// a static comparison landing surface — it's not a published
			// article — so `website` is the honest type. Setting
			// `siteName` explicitly so it doesn't depend on parent merge.
			type: 'website',
			siteName: 'TenantFlow',
		},
		twitter: {
			card: 'summary_large_image',
			site: '@tenantflow',
			creator: '@tenantflow',
			title: `TenantFlow vs ${data.name}`,
			description: data.metaDescription,
		},
	}
}

export default async function ComparePage({ params }: PageProps) {
	const { competitor: slug } = await params
	const data = COMPETITORS[slug]

	if (!data) notFound()

	// Single SoftwareApplication schema for THIS page's primary entity
	// (TenantFlow). The competitor isn't our product — emitting a second
	// SoftwareApplication for them on the same URL split rich-result
	// eligibility and gave Google two competing primary entities. The
	// comparison itself is captured by the BreadcrumbList + the on-page
	// content. Root layout already emits sitewide Organization +
	// SoftwareApplication, so don't duplicate that here either.
	const breadcrumbSchema = createBreadcrumbJsonLd(
		`/compare/${slug}`,
		{ [slug]: `TenantFlow vs ${data.name}` }
	)

	// Find sibling competitors so the related-comparison block has cross-links.
	const otherCompetitors = VALID_COMPETITORS.filter(c => c !== slug).map(c => ({
		slug: c,
		name: COMPETITORS[c]?.name ?? c,
	}))

	return (
		<PageLayout>
			<JsonLdScript schema={breadcrumbSchema} />

			{/* Hero */}
			<section className="section-spacing">
				<div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
					<p className="text-sm font-semibold uppercase tracking-wider text-primary mb-4">
						{data.tagline}
					</p>
					<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
						TenantFlow vs {data.name}
					</h1>
					<p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-8">
						{data.heroSubtitle}
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Button size="lg" className="px-8" asChild>
							<Link href="/pricing">
								Start Free Trial
								<ArrowRight className="size-5 ml-2" />
							</Link>
						</Button>
						<Button size="lg" variant="outline" asChild>
							<Link href="#comparison">See Full Comparison</Link>
						</Button>
					</div>
				</div>
			</section>

			{/* Quick Stats */}
			<section className="pb-16">
				<div className="max-w-4xl mx-auto px-6 lg:px-8">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
						<div className="text-center p-6 rounded-xl border border-border bg-background">
							<Shield className="size-6 text-primary mx-auto mb-2" />
							<p className="text-2xl font-bold text-foreground">
								{data.capterra}
							</p>
							<p className="text-sm text-muted-foreground">
								{data.name} Capterra
							</p>
						</div>
						<div className="text-center p-6 rounded-xl border border-border bg-background">
							<Star className="size-6 text-primary mx-auto mb-2" />
							<p className="text-2xl font-bold text-foreground">
								{data.g2}
							</p>
							<p className="text-sm text-muted-foreground">
								{data.name} G2
							</p>
						</div>
						<div className="text-center p-6 rounded-xl border border-border bg-background">
							<Calendar className="size-6 text-primary mx-auto mb-2" />
							<p className="text-2xl font-bold text-foreground">
								{data.founded}
							</p>
							<p className="text-sm text-muted-foreground">
								{data.name} Founded
							</p>
						</div>
						<div className="text-center p-6 rounded-xl border border-border bg-background">
							<Users className="size-6 text-primary mx-auto mb-2" />
							<p className="text-2xl font-bold text-foreground">
								Landlord-only
							</p>
							<p className="text-sm text-muted-foreground">
								TenantFlow positioning
							</p>
						</div>
					</div>
				</div>
			</section>

			<PricingComparison data={data} />
			<FeatureTable data={data} />
			<WhySwitchSection data={data} />

			{otherCompetitors.length > 0 && (
				<section className="section-spacing border-t border-border">
					<div className="max-w-4xl mx-auto px-6 lg:px-8">
						<h2 className="text-2xl font-bold text-foreground mb-2">
							Compare TenantFlow to other tools
						</h2>
						<p className="text-muted-foreground mb-6">
							Evaluating more than one option? See how TenantFlow stacks up
							against the alternatives landlords most often consider.
						</p>
						<ul className="grid gap-3 sm:grid-cols-2">
							{otherCompetitors.map(({ slug: otherSlug, name }) => (
								<li key={otherSlug}>
									<Link
										href={`/compare/${otherSlug}`}
										className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 hover:border-primary"
									>
										<span className="font-medium">
											TenantFlow vs {name}
										</span>
										<ArrowRight className="size-4 text-muted-foreground" />
									</Link>
								</li>
							))}
						</ul>
					</div>
				</section>
			)}

			<RelatedArticles slugs={[data.blogSlug]} title="Read the Full Comparison" />
			<BottomCta data={data} />
		</PageLayout>
	)
}
