import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Box, Flex } from '@radix-ui/themes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { BlogArticleWithDetails } from '@/types/blog'
import DOMPurify from 'dompurify'

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
	// Sanitize content to prevent XSS attacks
	const sanitizedContent = DOMPurify.sanitize(processedContent, {
		ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
		              'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'code', 'pre', 'span', 'div'],
		ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel'],
		ALLOW_DATA_ATTR: false
	})
	
	return (
		<motion.article {...fadeInUp} className="w-full">
			{/* Article Content */}
			<div className="max-w-none">
				<div
					className="article-content"
					dangerouslySetInnerHTML={{ __html: sanitizedContent }}
				/>
			</div>

			<Separator className="my-12" />

			{/* Tags */}
			<Box className="mb-8">
				<h3 className="mb-3 text-lg font-semibold">Tagged with:</h3>
				<Flex wrap="wrap" gap="2">
					{article.tags.map(tag => (
						<Badge
							key={tag.id}
							variant="outline"
							className="px-3 py-1 text-sm"
						>
							{tag.name}
						</Badge>
					))}
				</Flex>
			</Box>

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
						communication features. Join thousands of
						landlords who have already transformed their property
						management.
					</p>
					<Flex direction={{ initial: "column", sm: "row" }} gap="4">
						<Link to="/get-started" style={{ flex: 1 }}>
							<Button variant="premium" size="lg" className="w-full">
								Start Free Trial
							</Button>
						</Link>
						<Link to="/leases" style={{ flex: 1 }}>
							<Button
								variant="outline"
								size="lg"
								className="w-full"
							>
								Try Lease Generator
							</Button>
						</Link>
					</Flex>
				</CardContent>
			</Card>
		</motion.article>
	)
}
