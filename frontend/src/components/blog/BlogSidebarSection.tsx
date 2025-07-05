import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, FileText } from 'lucide-react'
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
 * Blog article sidebar with table of contents, related articles, and newsletter signup
 * Provides supplementary navigation and engagement opportunities
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
		<motion.aside {...fadeInUp} className="space-y-6">
			{/* Table of Contents */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<BookOpen className="h-5 w-5" />
						In This Article
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2 text-sm">
						<div className="text-muted-foreground">
							This article covers the essential steps for
							effective tenant screening, legal compliance, and
							best practices for property owners.
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Related Articles */}
			<Card>
				<CardHeader>
					<CardTitle>Related Articles</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
{relatedArticles.map((article) => (
<div key={article.slug} className="flex items-start gap-3">
<FileText className="text-primary mt-1 h-4 w-4" />
<div>
<Link
to={`/blog/${article.slug}`}
className="hover:text-primary text-sm font-medium"
>
{article.title}
</Link>
<p className="text-muted-foreground text-xs">
{article.category}
</p>
</div>
</div>
))}
				</CardContent>
			</Card>

			{/* Newsletter Signup */}
			<Card className="bg-primary text-primary-foreground">
				<CardHeader>
					<CardTitle>Stay Updated</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-primary-foreground/80 mb-4 text-sm">
						Get the latest property management tips and legal
						updates delivered to your inbox.
					</p>
					<Button variant="secondary" className="w-full">
						Subscribe to Newsletter
					</Button>
				</CardContent>
			</Card>
		</motion.aside>
	)
}
