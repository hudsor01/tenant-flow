import { useState } from 'react'
import { motion } from 'framer-motion'
import { Box, Container, Section } from '@radix-ui/themes'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, User, ArrowRight, Search, Calendar, Tag } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { SEO } from '@/components/seo/SEO'
import { Navigation } from '@/components/layout/Navigation'
import {
	useFeaturedBlogArticles,
	useBlogArticles
} from '@/hooks/useBlogArticleData'
import type { BlogArticleWithDetails } from '@/types/blog'

export default function BlogPage() {
	const [searchQuery, setSearchQuery] = useState('')

	// Fetch data from database
	const { data: featuredArticles = [] } = useFeaturedBlogArticles(1)
	const { data: recentArticlesData, isLoading: recentLoading } =
		useBlogArticles({ featured: false }, { page: 1, limit: 9 })

	// Type the arrays properly to avoid TypeScript errors
	const typedFeaturedArticles: BlogArticleWithDetails[] =
		featuredArticles as BlogArticleWithDetails[]
	const recentArticles: BlogArticleWithDetails[] =
		recentArticlesData?.articles || []

	const fadeInUp = {
		initial: { opacity: 0, y: 20 },
		animate: { opacity: 1, y: 0 },
		transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
	}

	const staggerChildren = {
		animate: {
			transition: {
				staggerChildren: 0.08
			}
		}
	}

	const breadcrumb = [{ name: 'Blog', url: '/blog' }]

	return (
		<>
			<SEO
				title="Property Management Blog - Expert Tips & Legal Guides"
				description="Expert property management advice, legal guides, and industry insights for landlords and property managers. Stay updated with the latest trends and best practices."
				keywords="property management blog, landlord tips, rental property advice, tenant laws, real estate insights"
				type="website"
				canonical={`${window.location.origin}/blog`}
				breadcrumb={breadcrumb}
			/>

			<Box className="min-h-screen bg-gray-50">
				<Navigation context="public" />

				{/* Professional Masculine Header */}
				<Section className="relative py-20 sm:py-24 lg:py-28">
					<Container size="4">
						<Box className="text-center">
							<motion.div
								initial="initial"
								animate="animate"
								variants={staggerChildren}
							>
								<motion.h1
									variants={fadeInUp}
									className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl md:text-5xl lg:text-6xl"
								>
									Property Management{' '}
									<span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent font-extrabold">
										Insights
									</span>
								</motion.h1>

								<motion.p
									variants={fadeInUp}
									className="mt-6 text-lg leading-8 text-gray-600"
								>
									Expert guidance for property managers and
									landlords. Learn best practices, legal
									compliance, and growth strategies.
								</motion.p>

								<motion.div
									variants={fadeInUp}
									className="mt-10 flex items-center justify-center"
								>
									<div className="relative w-full max-w-md">
										<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
											<Search className="h-5 w-5 text-gray-400" />
										</div>
										<input
											type="text"
											placeholder="Search articles..."
											value={searchQuery}
											onChange={e =>
												setSearchQuery(e.target.value)
											}
											className="block w-full rounded-full border border-gray-300 bg-white py-3 pr-4 pl-10 text-gray-900 transition-all duration-200 placeholder:text-gray-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
										/>
									</div>
								</motion.div>
							</motion.div>
						</Box>
					</Container>
				</Section>

				{/* Featured Article Section */}
				{typedFeaturedArticles.length > 0 && (
					<Section className="pb-16">
						<Container size="4">
							<motion.div
								initial={{ opacity: 0, y: 40 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.8, delay: 0.2 }}
							>
								<h2 className="text-gray-900 mb-8 text-2xl font-bold tracking-tight">
									Featured
								</h2>

							{typedFeaturedArticles.map(article => (
								<Link
									key={article.id}
									to="/blog/$slug"
									params={{ slug: article.slug }}
									className="group block"
								>
									<Card className="overflow-hidden border border-gray-200 bg-white hover:border-cyan-400 shadow-lg hover:shadow-xl rounded-xl transition-all duration-300">
										<div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
											<div className="relative aspect-[4/3] overflow-hidden lg:aspect-[3/2]">
												<img
													src={
														article.ogImage ||
														'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop&crop=center&auto=format&q=80'
													}
													alt={article.title}
													className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
												/>
												<div className="absolute top-4 left-4">
													<span className="bg-white/90 text-cyan-600 inline-flex items-center rounded-full border border-cyan-300 px-3 py-1 text-xs font-medium backdrop-blur-sm">
														<Tag className="mr-1 h-3 w-3" />
														{article.category}
													</span>
												</div>
											</div>

											<div className="flex flex-col justify-center p-8 lg:p-12">
												<div className="text-gray-600 mb-4 flex items-center gap-4 text-sm">
													<div className="flex items-center gap-1">
														<User className="h-4 w-4" />
														{article.authorName}
													</div>
													<div className="flex items-center gap-1">
														<Calendar className="h-4 w-4" />
														{article.publishedAt &&
															new Date(
																article.publishedAt
															).toLocaleDateString(
																'en-US',
																{
																	month: 'long',
																	day: 'numeric',
																	year: 'numeric'
																}
															)}
													</div>
													<div className="flex items-center gap-1">
														<Clock className="h-4 w-4" />
														{article.readTime || 5}{' '}
														min read
													</div>
												</div>

												<h3 className="text-gray-900 group-hover:text-cyan-600 mb-4 text-2xl font-bold tracking-tight transition-colors">
													{article.title}
												</h3>

												<p className="text-gray-700 mb-6 leading-7">
													{article.excerpt ||
														article.description}
												</p>

												<div className="text-cyan-600 flex items-center font-medium">
													Read article
													<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
												</div>
											</div>
										</div>
									</Card>
								</Link>
							))}
						</motion.div>
					</Container>
				</Section>
			)}

				{/* Recent Articles Grid */}
				<Section className="pb-24">
					<Container size="4">
						<motion.div
							initial="initial"
							animate="animate"
							variants={staggerChildren}
						>
							<motion.h2
								variants={fadeInUp}
								className="text-gray-900 mb-8 text-2xl font-bold tracking-tight"
							>
								Latest Articles
							</motion.h2>

						{recentLoading ? (
							<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
								{[...Array(6)].map((_, i) => (
									<div key={i} className="animate-pulse">
										<div className="bg-muted mb-4 aspect-[16/10] rounded-lg"></div>
										<div className="bg-muted mb-2 h-4 w-3/4 rounded"></div>
										<div className="bg-muted h-4 w-1/2 rounded"></div>
									</div>
								))}
							</div>
						) : (
							<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
								{recentArticles.map((article, index) => (
									<motion.div
										key={article.id}
										variants={fadeInUp}
										transition={{ delay: index * 0.1 }}
									>
										<Link
											to="/blog/$slug"
											params={{ slug: article.slug }}
											className="group block"
										>
											<article className="relative rounded-xl border border-gray-200 bg-white p-6 transition-all duration-300 hover:shadow-lg hover:border-cyan-400 hover:shadow-xl">
												<div className="mb-4 aspect-[16/10] overflow-hidden rounded-lg">
													<img
														src={
															article.ogImage ||
															'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=500&h=300&fit=crop&crop=center&auto=format&q=80'
														}
														alt={article.title}
														className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
													/>
												</div>

												<div className="text-gray-600 mb-3 flex items-center gap-3 text-xs">
													<span className="inline-flex items-center gap-1 rounded-full border border-cyan-300 bg-cyan-50 px-2 py-1 text-cyan-600">
														<Tag className="h-3 w-3" />
														{article.category}
													</span>
													<span>•</span>
													<span className="flex items-center gap-1">
														<Clock className="h-3 w-3" />
														{article.readTime || 5}{' '}
														min
													</span>
												</div>

												<h3 className="text-gray-900 group-hover:text-cyan-600 mb-2 text-lg leading-tight font-semibold transition-colors">
													{article.title}
												</h3>

												<p className="text-gray-600 mb-4 line-clamp-2 text-sm leading-relaxed">
													{article.excerpt ||
														article.description}
												</p>

												<div className="flex items-center justify-between">
													<div className="text-gray-600 flex items-center gap-2 text-xs">
														<User className="h-3 w-3" />
														{article.authorName}
													</div>

													<time className="text-gray-600 text-xs">
														{article.publishedAt &&
															new Date(
																article.publishedAt
															).toLocaleDateString(
																'en-US',
																{
																	month: 'short',
																	day: 'numeric'
																}
															)}
													</time>
												</div>
											</article>
										</Link>
									</motion.div>
								))}
							</div>
						)}
					</motion.div>
				</Container>
			</Section>

			{/* Newsletter Section */}
			<Section className="pb-24">
				<Container size="4">
					<motion.div
						initial={{ opacity: 0, y: 40 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, delay: 0.4 }}
						className="bg-white border border-gray-200 relative isolate overflow-hidden rounded-3xl px-6 py-24 shadow-2xl sm:px-24"
					>
						<div className="mx-auto max-w-md text-center">
							<h2 className="text-gray-900 text-2xl font-bold tracking-tight">
								Never miss an update
							</h2>
							<p className="text-gray-600 mt-4 text-lg leading-8">
								Get expert property management insights
								delivered to your inbox weekly.
							</p>
							<div className="mt-8 flex flex-col gap-4 sm:flex-row">
								<input
									type="email"
									placeholder="Enter your email"
									className="bg-gray-50 text-gray-900 border-gray-300 placeholder:text-gray-500 focus:border-cyan-500 focus:ring-cyan-500 min-w-0 flex-auto rounded-lg border px-3.5 py-2.5 shadow-sm focus:ring-2"
								/>
								<Button className="flex-none rounded-lg px-8 py-2.5 font-semibold bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 border-0">
									Subscribe
								</Button>
							</div>
							<p className="text-gray-600 mt-4 text-xs">
								No spam. Unsubscribe at any time.
							</p>
						</div>
					</motion.div>
				</Container>
			</Section>
			</Box>
		</>
	)
}
