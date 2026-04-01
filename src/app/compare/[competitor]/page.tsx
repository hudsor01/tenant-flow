import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
	ArrowRight,
	Check,
	X,
	Minus,
	Plus,
	Shield,
	Star,
	Calendar,
	Users,
} from 'lucide-react'
import { PageLayout } from '#components/layout/page-layout'
import { Button } from '#components/ui/button'
import { SOCIAL_PROOF } from '#config/social-proof'
import { COMPETITORS, VALID_COMPETITORS } from './compare-data'

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

function FeatureIcon({ support }: { support: string }) {
	switch (support) {
		case 'yes':
			return <Check className="size-5 text-green-600" />
		case 'no':
			return <X className="size-5 text-red-400" />
		case 'partial':
			return <Minus className="size-5 text-amber-500" />
		case 'addon':
			return <Plus className="size-5 text-blue-500" />
		default:
			return <Minus className="size-5 text-muted-foreground" />
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

			{/* Pricing Comparison */}
			<section className="section-spacing bg-muted/30">
				<div className="max-w-4xl mx-auto px-6 lg:px-8">
					<h2 className="text-3xl font-bold text-center mb-12">
						Pricing Comparison
					</h2>
					<div className="grid md:grid-cols-2 gap-8">
						{/* TenantFlow */}
						<div className="rounded-2xl border-2 border-primary bg-background p-8">
							<h3 className="text-xl font-bold text-foreground mb-1">
								TenantFlow
							</h3>
							<p className="text-sm text-muted-foreground mb-6">
								Transparent, flat-rate pricing
							</p>
							<div className="space-y-4">
								{data.tenantflowPricing.map(tier => (
									<div
										key={tier.name}
										className="flex items-center justify-between border-b border-border pb-3"
									>
										<div>
											<p className="font-medium text-foreground">
												{tier.name}
											</p>
											{tier.note && (
												<p className="text-sm text-muted-foreground">
													{tier.note}
												</p>
											)}
										</div>
										<p className="text-lg font-bold text-primary">
											{tier.price}
										</p>
									</div>
								))}
							</div>
							<p className="mt-4 text-sm text-muted-foreground">
								14-day free trial, no credit card required
							</p>
						</div>

						{/* Competitor */}
						<div className="rounded-2xl border border-border bg-background p-8">
							<h3 className="text-xl font-bold text-foreground mb-1">
								{data.name}
							</h3>
							<p className="text-sm text-muted-foreground mb-6">
								{data.bestFor}
							</p>
							<div className="space-y-4">
								{data.competitorPricing.map(tier => (
									<div
										key={tier.name}
										className="flex items-center justify-between border-b border-border pb-3"
									>
										<div>
											<p className="font-medium text-foreground">
												{tier.name}
											</p>
											{tier.note && (
												<p className="text-sm text-muted-foreground">
													{tier.note}
												</p>
											)}
										</div>
										<p className="text-lg font-bold text-foreground">
											{tier.price}
										</p>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Feature Comparison Table */}
			<section id="comparison" className="section-spacing scroll-mt-20">
				<div className="max-w-4xl mx-auto px-6 lg:px-8">
					<h2 className="text-3xl font-bold text-center mb-12">
						Feature-by-Feature Comparison
					</h2>
					<div className="overflow-x-auto rounded-xl border border-border">
						<table className="w-full">
							<thead>
								<tr className="border-b border-border bg-muted/50">
									<th className="text-left p-4 font-semibold text-foreground">
										Feature
									</th>
									<th className="text-center p-4 font-semibold text-primary w-40">
										TenantFlow
									</th>
									<th className="text-center p-4 font-semibold text-foreground w-40">
										{data.name}
									</th>
								</tr>
							</thead>
							<tbody>
								{data.features.map((feature, i) => (
									<tr
										key={feature.name}
										className={
											i % 2 === 0
												? 'bg-background'
												: 'bg-muted/20'
										}
									>
										<td className="p-4 font-medium text-foreground">
											{feature.name}
										</td>
										<td className="p-4 text-center">
											<div className="flex flex-col items-center gap-1">
												<FeatureIcon
													support={feature.tenantflow}
												/>
												{feature.tenantflowNote && (
													<span className="text-xs text-muted-foreground">
														{feature.tenantflowNote}
													</span>
												)}
											</div>
										</td>
										<td className="p-4 text-center">
											<div className="flex flex-col items-center gap-1">
												<FeatureIcon
													support={feature.competitor}
												/>
												{feature.competitorNote && (
													<span className="text-xs text-muted-foreground">
														{feature.competitorNote}
													</span>
												)}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</section>

			{/* Why Switch / Competitor Strengths */}
			<section className="section-spacing bg-muted/30">
				<div className="max-w-4xl mx-auto px-6 lg:px-8">
					<div className="grid md:grid-cols-2 gap-12">
						<div>
							<h2 className="text-2xl font-bold text-foreground mb-6">
								Why Switch to TenantFlow
							</h2>
							<ul className="space-y-4">
								{data.whySwitch.map(reason => (
									<li
										key={reason}
										className="flex gap-3 text-muted-foreground"
									>
										<Check className="size-5 text-green-600 mt-0.5 shrink-0" />
										<span>{reason}</span>
									</li>
								))}
							</ul>
						</div>
						<div>
							<h2 className="text-2xl font-bold text-foreground mb-6">
								Where {data.name} Excels
							</h2>
							<ul className="space-y-4">
								{data.competitorStrengths.map(strength => (
									<li
										key={strength}
										className="flex gap-3 text-muted-foreground"
									>
										<Check className="size-5 text-blue-500 mt-0.5 shrink-0" />
										<span>{strength}</span>
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			</section>

			{/* Related Blog Post */}
			<section className="py-12">
				<div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
					<p className="text-sm text-muted-foreground mb-2">
						Want a deeper dive?
					</p>
					<Link
						href={`/blog/tenantflow-vs-${slug}-comparison`}
						className="text-primary hover:text-primary/80 font-medium transition-colors"
					>
						Read our full TenantFlow vs {data.name} comparison
						article
						<ArrowRight className="inline size-4 ml-1" />
					</Link>
				</div>
			</section>

			{/* Bottom CTA */}
			<section className="section-spacing">
				<div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
					<div className="p-10 bg-linear-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl">
						<h2 className="text-3xl font-bold text-foreground mb-4">
							Ready to make the switch?
						</h2>
						<p className="text-lg text-muted-foreground mb-8">
							{`Join ${SOCIAL_PROOF.managerCount} landlords managing properties with TenantFlow. Start your 14-day free trial today.`}
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Button size="lg" className="px-8" asChild>
								<Link href="/pricing">
									Start Free Trial
									<ArrowRight className="size-5 ml-2" />
								</Link>
							</Button>
							<Button size="lg" variant="outline" asChild>
								<Link href="/blog/best-property-management-software-2025-comparison">
									See All Comparisons
								</Link>
							</Button>
						</div>
					</div>
				</div>
			</section>
		</PageLayout>
	)
}
