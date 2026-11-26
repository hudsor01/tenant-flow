import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageLayout } from "#components/layout/page-layout";
import { LastReviewed } from "#components/resources/last-reviewed";
import { JsonLdScript } from "#components/seo/json-ld-script";
import { Button } from "#components/ui/button";
import { contactTrackAttributes } from "#lib/analytics/cta-attributes";
import { createHelpArticleJsonLd } from "#lib/seo/article-schema";
import { createBreadcrumbJsonLd } from "#lib/seo/breadcrumbs";
import { createPageMetadata } from "#lib/seo/page-metadata";
import { HELP_ARTICLES, helpArticle } from "../help-articles";

// Every article is in help-articles.ts: an unknown slug 404s.
export const dynamicParams = false;

interface PageProps {
	params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
	return HELP_ARTICLES.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const article = helpArticle((await params).slug);
	if (!article) return {};
	return createPageMetadata({
		title: article.metaTitle,
		description: article.description,
		path: `/help/${article.slug}`,
		ogCard: "help",
	});
}

export default async function HelpArticlePage({ params }: PageProps) {
	const article = helpArticle((await params).slug);
	if (!article) notFound();

	return (
		<PageLayout>
			<JsonLdScript
				schema={createBreadcrumbJsonLd(`/help/${article.slug}`, {
					[article.slug]: article.title,
				})}
			/>
			<JsonLdScript
				schema={createHelpArticleJsonLd({
					title: article.title,
					slug: article.slug,
					description: article.description,
					datePublished: article.publishedAt,
					dateModified: article.reviewedAt,
				})}
			/>

			<article className="max-w-3xl mx-auto px-6 lg:px-8 section-spacing">
				<Link
					href="/help"
					className="mb-8 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
				>
					<ArrowLeft className="size-4 mr-2" aria-hidden="true" />
					Back to the Help Center
				</Link>

				<header className="mb-10">
					<p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary-text">
						Help Center
					</p>
					<h1 className="mb-4 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
						{article.title}
					</h1>
					<p className="mb-0 text-lg leading-relaxed text-muted-foreground">
						{article.intro}
					</p>
					{article.plans && (
						<p className="mt-4 mb-0 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
							{article.plans}
						</p>
					)}
					<LastReviewed reviewedAt={article.reviewedAt} />
				</header>

				<div className="flex flex-col gap-10">
					{article.sections.map((section) => (
						<section key={section.heading}>
							<h2 className="mb-4 text-xl font-semibold text-foreground">
								{section.heading}
							</h2>
							{section.paragraphs?.map((paragraph) => (
								<p
									key={paragraph}
									className="mb-3 leading-relaxed text-muted-foreground last:mb-0"
								>
									{paragraph}
								</p>
							))}
							{section.steps && (
								<ol className="m-0 flex list-decimal flex-col gap-2 pl-6 text-muted-foreground marker:text-foreground [&>li]:mb-0">
									{section.steps.map((step) => (
										<li key={step} className="pl-1 leading-relaxed">
											{step}
										</li>
									))}
								</ol>
							)}
							{section.after?.map((paragraph) => (
								<p
									key={paragraph}
									className="mt-3 mb-0 leading-relaxed text-muted-foreground"
								>
									{paragraph}
								</p>
							))}
						</section>
					))}
				</div>

				{article.related.length > 0 && (
					<section className="mt-12 border-t border-border pt-8">
						<h2 className="mb-4 text-lg font-semibold text-foreground">
							Related
						</h2>
						<ul className="m-0 flex flex-col gap-2 pl-0 [&>li]:mb-0">
							{article.related.map((link) => (
								<li key={link.href}>
									<Link
										href={link.href}
										className="text-primary-text underline underline-offset-4 hover:no-underline"
									>
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</section>
				)}

				<div className="mt-12 rounded-xl border border-border bg-card p-6 text-center">
					<p className="mb-4 text-muted-foreground">
						Still stuck? Email support answers during US business hours, Monday
						through Friday.
					</p>
					<Button asChild variant="outline">
						<Link
							href="/contact"
							{...contactTrackAttributes(`help-article-${article.slug}`)}
						>
							Contact us
						</Link>
					</Button>
				</div>
			</article>
		</PageLayout>
	);
}
