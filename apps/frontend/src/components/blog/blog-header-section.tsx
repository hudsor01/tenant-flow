import Link from 'next/link'
import { motion } from '@/lib/lazy-motion'
import { Button } from '@/components/ui/button'
import type { BlogArticleWithDetails } from '@repo/shared'

interface BlogHeaderSectionProps {
	article: BlogArticleWithDetails
	fadeInUp: {
		initial: { opacity: number; y: number }
		animate: { opacity: number; y: number }
		transition: { duration: number }
	}
}

/**
 * Modern minimalist blog article header with clean typography and generous whitespace
 * Inspired by Framer, Resend, and Oxide design patterns
 */
export default function BlogHeaderSection({
	article,
	fadeInUp
}: BlogHeaderSectionProps) {
	return (
		<header className="relative pb-16 pt-24 sm:pb-20 sm:pt-32">
			<div className="mx-auto max-w-4xl px-6 lg:px-8">
				<motion.div {...fadeInUp}>
					{/* Back Navigation */}
					<div className="mb-8">
						<Link
							href="/blog"
							className="text-muted-foreground hover:text-foreground inline-flex items-center text-sm transition-colors"
						>
							<i className="i-lucide-arrow-left inline-block mr-2 h-4 w-4"  />
							Back to articles
						</Link>
					</div>

					{/* Category */}
					<div className="mb-6">
						<span className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-3 py-1 text-sm font-medium">
							<i className="i-lucide-tag inline-block mr-1 h-3 w-3"  />
							{article.category}
						</span>
					</div>

					{/* Title */}
					<h1 className="text-foreground mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
						{article.title}
					</h1>

					{/* Description */}
					<p className="text-muted-foreground mb-8 text-xl leading-8">
						{article.description}
					</p>

					{/* Meta Information */}
					<div className="text-muted-foreground border-border flex flex-wrap items-center gap-6 border-t pt-6 text-sm">
						<div className="flex items-center gap-2">
							<i className="i-lucide-user inline-block h-4 w-4"  />
							<span className="font-medium">
								{article.author?.name || article.authorName}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<i className="i-lucide-calendar inline-block h-4 w-4"  />
							<time>
								{article.publishedAt
									? new Date(
											article.publishedAt
										).toLocaleDateString('en-US', {
											year: 'numeric',
											month: 'long',
											day: 'numeric'
										})
									: 'Recent'}
							</time>
						</div>
						<div className="flex items-center gap-2">
							<i className="i-lucide-clock inline-block h-4 w-4"  />
							<span>{article.readTime ?? 5} min read</span>
						</div>
						<Button
							variant="ghost"
							size="sm"
							className="text-muted-foreground hover:text-foreground ml-auto"
						>
							<i className="i-lucide-share-2 inline-block mr-2 h-4 w-4"  />
							Share
						</Button>
					</div>
				</motion.div>
			</div>
		</header>
	)
}
