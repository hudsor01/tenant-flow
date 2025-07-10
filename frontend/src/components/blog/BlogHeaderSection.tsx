import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, User, ArrowLeft, Share2, ChevronRight } from 'lucide-react'
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
 * Blog article header section with breadcrumbs, title, metadata, and share button
 * Displays article category, title, author info, read time, and publication date
 */
export default function BlogHeaderSection({
	article,
	fadeInUp
}: BlogHeaderSectionProps) {
	return (
		<div className="from-background via-background to-primary/5 border-b bg-gradient-to-r">
			<div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
				<motion.div {...fadeInUp}>
					{/* Breadcrumbs */}
					<nav className="text-muted-foreground mb-6 flex items-center space-x-2 text-sm">
						<Link
							to="/"
							className="hover:text-foreground transition-colors"
						>
							Home
						</Link>
						<ChevronRight className="h-4 w-4" />
						<Link
							to="/blog"
							className="hover:text-foreground transition-colors"
						>
							Blog
						</Link>
						<ChevronRight className="h-4 w-4" />
						<span className="text-foreground font-medium">
							{article.category}
						</span>
					</nav>

					{/* Back button */}
					<div className="mb-6">
						<Link to="/blog">
							<Button
								variant="ghost"
								size="sm"
								className="text-muted-foreground hover:text-foreground gap-2"
							>
								<ArrowLeft className="h-4 w-4" />
								Back to Blog
							</Button>
						</Link>
					</div>

					{/* Category Badge */}
					<Badge variant="secondary" className="mb-4 px-3 py-1">
						{article.category}
					</Badge>

					{/* Article Title */}
					<h1 className="mb-6 max-w-4xl text-4xl leading-tight font-bold tracking-tight md:text-5xl lg:text-6xl">
						{article.title}
					</h1>

					{/* Article Description */}
					<p className="text-muted-foreground mb-8 max-w-3xl text-xl leading-relaxed">
						{article.description}
					</p>

					{/* Metadata and Share */}
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="text-muted-foreground flex flex-wrap items-center gap-6 text-sm">
							<span className="flex items-center gap-2">
								<User className="h-4 w-4" />
								<span className="font-medium">
									{article.author?.name || article.authorName}
								</span>
							</span>
							<span className="flex items-center gap-2">
								<Clock className="h-4 w-4" />
								{article.readTime ? `${article.readTime} min read` : 'Quick read'}
							</span>
							<span className="font-medium">
								{article.publishedAt ? formatArticleDate(article.publishedAt) : 'Draft'}
							</span>
						</div>
						<Button
							variant="outline"
							size="sm"
							className="self-start sm:self-auto"
						>
							<Share2 className="mr-2 h-4 w-4" />
							Share Article
						</Button>
					</div>
				</motion.div>
			</div>
		</div>
	)
}
