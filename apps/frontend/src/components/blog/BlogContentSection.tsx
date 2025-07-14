import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { BlogArticleWithDetails } from '@/types/blog'

interface BlogContentSectionProps {
	article: BlogArticleWithDetails
	processedContent: string
	fadeInUp: {
		initial: { opacity: number; y: number }
		animate: { opacity: number; y: number }
		transition: { duration: number }
	}
}

/**
 * Blog article main content section with article body, tags, and call-to-action
 * Renders processed HTML content with styling and promotional components
 */
export default function BlogContentSection({
	article,
	processedContent,
	fadeInUp
}: BlogContentSectionProps) {
	return (
		<motion.article {...fadeInUp} className="w-full">
			{/* Article Content */}
			<div className="max-w-none">
				<div
					className="article-content"
					dangerouslySetInnerHTML={{ __html: processedContent }}
				/>
			</div>

			<Separator className="my-12" />

			{/* Tags */}
			<div className="mb-8">
				<h3 className="mb-3 text-lg font-semibold">Tagged with:</h3>
				<div className="flex flex-wrap gap-2">
					{article.tags.map(tag => (
						<Badge
							key={tag.id}
							variant="outline"
							className="px-3 py-1 text-sm"
						>
							{tag.name}
						</Badge>
					))}
				</div>
			</div>

			{/* Call-to-Action */}
			<Card className="from-primary/10 via-primary/5 to-accent/10 border-primary/20 bg-gradient-to-br">
				<CardHeader className="pb-4">
					<CardTitle className="text-2xl">
						Ready to Streamline Your Property Management?
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground mb-6 text-lg leading-relaxed">
						TenantFlow helps you implement these best practices with
						automated workflows, legal compliance tools, and
						professional communication features. Join thousands of
						landlords who have already transformed their property
						management.
					</p>
					<div className="flex flex-col gap-4 sm:flex-row">
						<Link to="/get-started" className="flex-1">
							<Button size="lg" className="w-full">
								Start Free Trial
							</Button>
						</Link>
						<Link to="/leases" className="flex-1">
							<Button
								variant="outline"
								size="lg"
								className="w-full"
							>
								Try Lease Generator
							</Button>
						</Link>
					</div>
				</CardContent>
			</Card>
		</motion.article>
	)
}
