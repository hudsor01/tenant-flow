import Link from 'next/link'
import { motion } from '@/lib/lazy-motion'
import { Button } from '@/components/ui/button'
// Removed blog-stubs imports - using placeholder data for unused component
interface BlogArticle {
	slug: string
	title: string
	category: string
}

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
	currentSlug: _currentSlug,
	fadeInUp
}: BlogSidebarSectionProps) {
	// Placeholder data for unused component - blog functionality removed
	const relatedArticles: BlogArticle[] = []

	return (
		<motion.aside {...fadeInUp} className="space-y-12">
			{/* Related Articles */}
			{relatedArticles.length > 0 && (
				<div>
					<h3 className="text-foreground mb-6 text-lg font-semibold">
						Related Articles
					</h3>
					<div className="space-y-6">
						{relatedArticles.map((article: BlogArticle) => (
							<article key={article.slug}>
								<Link
									href={`/blog/${article.slug}`}
									className="group block"
								>
									<h4 className="text-foreground group-hover:text-primary mb-2 text-sm font-medium leading-snug transition-colors">
										{article.title}
									</h4>
									<p className="text-muted-foreground mb-2 text-xs">
										{article.category}
									</p>
									<div className="text-primary flex items-center text-xs transition-all group-hover:gap-2">
										Read article
										<i className="i-lucide-arrowupright h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100"  />
									</div>
								</Link>
							</article>
						))}
					</div>
				</div>
			)}

			{/* Newsletter Signup */}
			<div className="bg-muted/50 rounded-2xl p-6">
				<h3 className="text-foreground mb-3 text-lg font-semibold">
					Stay Updated
				</h3>
				<p className="text-muted-foreground mb-6 text-sm leading-relaxed">
					Get expert property management insights delivered to your
					inbox weekly.
				</p>
				<div className="space-y-3">
					<input
						type="email"
						placeholder="Enter your email"
						className="bg-background text-foreground ring-border placeholder:text-muted-foreground focus:ring-primary w-full rounded-lg border-0 px-3 py-2 text-sm shadow-sm ring-1 ring-inset focus:ring-2"
					/>
					<Button className="w-full text-sm font-semibold">
						Subscribe
					</Button>
				</div>
				<p className="text-muted-foreground mt-3 text-xs">
					No spam. Unsubscribe at any time.
				</p>
			</div>
		</motion.aside>
	)
}
