import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Clock, User, ArrowLeft, Share2, Calendar, Tag } from 'lucide-react'
import type { BlogArticleWithDetails } from '@/types/blog'
import { formatArticleDate } from '@/hooks/useBlogArticleData'

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
		<header className="relative pt-24 pb-16 sm:pt-32 sm:pb-20">
			<div className="mx-auto max-w-4xl px-6 lg:px-8">
				<motion.div {...fadeInUp}>
					{/* Back Navigation */}
					<div className="mb-8">
						<Link 
							to="/blog"
							className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back to articles
						</Link>
					</div>

					{/* Category */}
					<div className="mb-6">
						<span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
							<Tag className="mr-1 h-3 w-3" />
							{article.category}
						</span>
					</div>

					{/* Title */}
					<h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl mb-6">
						{article.title}
					</h1>

					{/* Description */}
					<p className="text-xl text-muted-foreground leading-8 mb-8">
						{article.description}
					</p>

					{/* Meta Information */}
					<div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground border-t border-border pt-6">
						<div className="flex items-center gap-2">
							<User className="h-4 w-4" />
							<span className="font-medium">{article.author?.name || article.authorName}</span>
						</div>
						<div className="flex items-center gap-2">
							<Calendar className="h-4 w-4" />
							<time>
								{article.publishedAt ? formatArticleDate(article.publishedAt) : 'Recent'}
							</time>
						</div>
						<div className="flex items-center gap-2">
							<Clock className="h-4 w-4" />
							<span>{article.readTime || 5} min read</span>
						</div>
						<Button
							variant="ghost" 
							size="sm"
							className="ml-auto text-muted-foreground hover:text-foreground"
						>
							<Share2 className="mr-2 h-4 w-4" />
							Share
						</Button>
					</div>
				</motion.div>
			</div>
		</header>
	)
}
