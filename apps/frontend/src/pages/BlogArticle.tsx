import React from 'react'
import { useParams, Navigate, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { SEO } from '@/components/seo/SEO'
import { useBlogArticleData } from '@/hooks/useBlogArticleData'
import { useBlogSEO } from '@/hooks/useBlogSEO'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, User, ArrowLeft, Share2, BookOpen, ChevronRight, Heart } from 'lucide-react'
import { formatArticleDate } from '@/hooks/useBlogArticleData'

/**
 * Modern Ghost-inspired blog article page component
 * Features beautiful hero section, spacious layout, and clean typography
 */
export default function BlogArticle() {
	const { slug } = useParams({ from: "/blog/$slug" })

	// Get article data and validation
	const { article, isValidSlug, processedContent, isLoading } =
		useBlogArticleData({ slug })

	// Get SEO configuration
	const { seoConfig } = useBlogSEO({ 
		article: article || null, 
		slug: slug || ''
	})

	// Animation variants
	const fadeInUp = {
		initial: { opacity: 0, y: 30 },
		animate: { opacity: 1, y: 0 },
		transition: { duration: 0.6, ease: "easeOut" }
	}

	const staggerChildren = {
		animate: {
			transition: {
				staggerChildren: 0.1
			}
		}
	}

	// Loading state
	if (isLoading) {
		return (
			<div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
				<motion.div 
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					className="text-center"
				>
					<div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-600 text-lg">Loading article...</p>
				</motion.div>
			</div>
		)
	}

	// Handle invalid slugs
	if (!isValidSlug) {
		return <Navigate to="/blog" replace />
	}

	return (
		<>
			<SEO {...seoConfig} />

			{/* Hero Section */}
			<section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
				{/* Background Image */}
				<div className="absolute inset-0 z-0">
					<img 
						src={article?.ogImage || "/blog_01.png"} 
						alt={article?.title}
						className="w-full h-full object-cover opacity-30"
					/>
					<div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 via-gray-800/70 to-gray-900/80"></div>
				</div>

				{/* Content */}
				<div className="relative z-10 max-w-6xl mx-auto px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
					<motion.div
						variants={staggerChildren}
						initial="initial"
						animate="animate"
						className="text-center"
					>
						{/* Breadcrumbs */}
						<motion.nav variants={fadeInUp} className="mb-8">
							<div className="flex items-center justify-center space-x-2 text-sm text-gray-300">
								<Link to="/" className="hover:text-white transition-colors">
									Home
								</Link>
								<ChevronRight className="h-4 w-4" />
								<Link to="/blog" className="hover:text-white transition-colors">
									Blog
								</Link>
								<ChevronRight className="h-4 w-4" />
								<span className="text-white">{article?.category}</span>
							</div>
						</motion.nav>

						{/* Category Badge */}
						<motion.div variants={fadeInUp} className="mb-6">
							<Badge className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium">
								{article?.category}
							</Badge>
						</motion.div>

						{/* Title */}
						<motion.h1 
							variants={fadeInUp}
							className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold leading-[1.1] mb-6 tracking-tight max-w-5xl mx-auto"
						>
							{article?.title}
						</motion.h1>

						{/* Description */}
						<motion.p 
							variants={fadeInUp}
							className="text-lg sm:text-xl text-gray-200 leading-relaxed mb-8 max-w-4xl mx-auto px-4"
						>
							{article?.description}
						</motion.p>

						{/* Meta Info */}
						<motion.div 
							variants={fadeInUp}
							className="flex flex-wrap items-center justify-center gap-6 text-gray-300"
						>
							<div className="flex items-center gap-2">
								<User className="h-5 w-5" />
								<span className="font-medium">{article?.author?.name || article?.authorName}</span>
							</div>
							<div className="flex items-center gap-2">
								<Clock className="h-5 w-5" />
								<span>{article?.readTime} min read</span>
							</div>
							<div className="flex items-center gap-2">
								<span>{article?.publishedAt ? formatArticleDate(article.publishedAt) : 'Recent'}</span>
							</div>
						</motion.div>

						{/* Back Button */}
						<motion.div variants={fadeInUp} className="mt-8">
							<Link to="/blog">
								<Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
									<ArrowLeft className="h-4 w-4 mr-2" />
									Back to Blog
								</Button>
							</Link>
						</motion.div>
					</motion.div>
				</div>
			</section>

			{/* Main Content */}
			<section className="bg-white">
				<div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
					<motion.div
						initial={{ opacity: 0, y: 40 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, delay: 0.2 }}
						className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-8 lg:gap-12"
					>
						{/* Article Content */}
						<div className="lg:col-span-2 xl:col-span-3">
							<div className="prose prose-lg prose-gray max-w-none">
								<div
									className="article-content"
									dangerouslySetInnerHTML={{ __html: processedContent }}
								/>
							</div>

							<Separator className="my-12" />

							{/* Tags */}
							<div className="mb-12">
								<h3 className="text-lg font-semibold mb-4 text-gray-900">Tagged with</h3>
								<div className="flex flex-wrap gap-2">
									{article?.tags?.map(tag => (
										<Badge
											key={tag.id}
											variant="outline"
											className="px-3 py-1 text-sm hover:bg-gray-100 transition-colors"
										>
											{tag.name}
										</Badge>
									))}
								</div>
							</div>

							{/* Call to Action */}
							<Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
								<CardHeader>
									<CardTitle className="text-2xl text-gray-900">
										Ready to Streamline Your Property Management?
									</CardTitle>
								</CardHeader>
								<CardContent>
									<p className="text-gray-600 mb-6 text-lg leading-relaxed">
										TenantFlow helps you implement these best practices with automated workflows, 
										legal compliance tools, and professional communication features.
									</p>
									<div className="flex flex-col sm:flex-row gap-4">
										<Link to="/pricing" className="flex-1">
											<Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700">
												Start Free Trial
											</Button>
										</Link>
										<Link to="/lease-generator" className="flex-1">
											<Button variant="outline" size="lg" className="w-full">
												Try Lease Generator
											</Button>
										</Link>
									</div>
								</CardContent>
							</Card>
						</div>

						{/* Sidebar */}
						<div className="lg:col-span-1">
							<div className="sticky top-8 space-y-6 lg:pl-4">
								{/* Table of Contents */}
								<Card className="shadow-sm">
									<CardHeader>
										<CardTitle className="flex items-center gap-2 text-lg">
											<BookOpen className="h-5 w-5 text-blue-600" />
											In This Article
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="text-sm text-gray-600 leading-relaxed">
											Complete guide to managing multiple properties in Dallas-Fort Worth 
											with proven strategies and software recommendations.
										</div>
									</CardContent>
								</Card>

								{/* Newsletter */}
								<Card className="bg-gray-900 text-white shadow-lg">
									<CardHeader>
										<CardTitle className="text-lg">Stay Updated</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="text-gray-300 mb-4 text-sm leading-relaxed">
											Get the latest property management insights delivered to your inbox.
										</p>
										<Button className="w-full bg-blue-600 hover:bg-blue-700">
											Subscribe
										</Button>
									</CardContent>
								</Card>

								{/* Share */}
								<Card className="shadow-sm">
									<CardContent className="pt-6">
										<Button variant="outline" className="w-full">
											<Share2 className="h-4 w-4 mr-2" />
											Share Article
										</Button>
									</CardContent>
								</Card>
							</div>
						</div>
					</motion.div>
				</div>
			</section>
		</>
	)
}
