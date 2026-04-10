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
import { SOCIAL_PROOF } from '#config/social-proof'
import { RelatedArticles } from '#components/blog/related-articles'
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

	const baseUrl =
		process.env.NEXT_PUBLIC_APP_URL ||
		(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3050')

	return {
		title: `TenantFlow vs ${data.name}: Feature & Pricing Comparison | TenantFlow`,
		description: data.metaDescription,
		alternates: { canonical: `${baseUrl}/compare/${slug}` },
		openGraph: {
			title: `TenantFlow vs ${data.name} Comparison`,
			description: data.metaDescription,
			url: `${baseUrl}/compare/${slug}`,
			type: 'website',
		},
		twitter: {
			card: 'summary_large_image',
			title: `TenantFlow vs ${data.name} Comparison`,
			description: data.metaDescription,
		},
	}
}

export default async function ComparePage({ params }: PageProps) {
	const { competitor: slug } = await params
	const data = COMPETITORS[slug]

	if (!data) notFound()

	const baseUrl =
		process.env.NEXT_PUBLIC_APP_URL ||
		(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3050')

	const comparisonSchema = {
		'@context': 'https://schema.org',
		'@type': 'WebPage',
		name: `TenantFlow vs ${data.name} Comparison`,
		description: data.metaDescription,
		url: `${baseUrl}/compare/${slug}`,
		breadcrumb: {
			'@type': 'BreadcrumbList',
			itemListElement: [
				{
					'@type': 'ListItem',
					position: 1,
					name: 'Home',
					item: baseUrl,
				},
				{
					'@type': 'ListItem',
					position: 2,
					name: `TenantFlow vs ${data.name}`,
					item: `${baseUrl}/compare/${slug}`,
				},
			],
		},
	}

	return (
		<PageLayout>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(comparisonSchema).replace(
						/</g,
						'\\u003c'
					),
				}}
			/>

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
								{SOCIAL_PROOF.managerCount}
							</p>
							<p className="text-sm text-muted-foreground">
								TenantFlow Landlords
							</p>
						</div>
					</div>
				</div>
			</section>

			<PricingComparison data={data} />
			<FeatureTable data={data} />
			<WhySwitchSection data={data} />
			<RelatedArticles slugs={[data.blogSlug]} title="Read the Full Comparison" />
			<BottomCta data={data} />
		</PageLayout>
	)
}
