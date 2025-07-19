import React from 'react'
import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowUpRight } from 'lucide-react'
import { useRelatedBlogArticles, useBlogArticle } from '@/hooks/useBlogArticleData'

interface BlogSidebarSectionProps {
	currentSlug: string
	fadeInUp: {
		initial: { opacity: number; y: number }
		animate: { opacity: number; y: number }
		transition: { duration: number }
	}
}

/**
 * Modern minimalist blog sidebar with related articles and newsletter signup
 * Clean design with generous whitespace
 */
export default function BlogSidebarSection({
	currentSlug,
	fadeInUp
}: BlogSidebarSectionProps) {
	// Get current article data to extract category and ID for related articles
	const { data: currentArticle } = useBlogArticle(currentSlug)
	const { data: relatedArticles = [] } = useRelatedBlogArticles(
		currentArticle?.id || '',
		currentArticle?.category || '',
		3
	)

	return (
		<motion.aside {...fadeInUp} className="space-y-12">
			{/* Related Articles */}
			{relatedArticles.length > 0 && (
				<div>
					<h3 className="text-lg font-semibold text-foreground mb-6">
						Related Articles
					</h3>
					<div className="space-y-6">
						{relatedArticles.map((article) => (
							<article key={article.slug}>
								<Link
									to="/blog/$slug"
									params={{ slug: article.slug }}
									className="group block"
								>
									<h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors mb-2 leading-snug">
										{article.title}
									</h4>
									<p className="text-xs text-muted-foreground mb-2">
										{article.category}
									</p>
									<div className="flex items-center text-xs text-primary group-hover:gap-2 transition-all">
										Read article
										<ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
									</div>
								</Link>
							</article>
						))}
					</div>
				</div>
			)}

			{/* Newsletter Signup */}
			<div className="rounded-2xl bg-muted/50 p-6">
				<h3 className="text-lg font-semibold text-foreground mb-3">
					Stay Updated
				</h3>
				<p className="text-sm text-muted-foreground mb-6 leading-relaxed">
					Get expert property management insights delivered to your inbox weekly.
				</p>
				<div className="space-y-3">
					<input
						type="email"
						placeholder="Enter your email"
						className="w-full rounded-lg border-0 bg-background px-3 py-2 text-sm text-foreground shadow-sm ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
					/>
					<Button className="w-full text-sm font-semibold">
						Subscribe
					</Button>
				</div>
				<p className="mt-3 text-xs text-muted-foreground">
					No spam. Unsubscribe at any time.
				</p>
			</div>
		</motion.aside>
	)
}
