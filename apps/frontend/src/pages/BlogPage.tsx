import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, User, ArrowRight, Search, Calendar, Tag, Star, TrendingUp } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { SEO } from '@/components/seo/SEO'
import { Navigation } from '@/components/layout/Navigation'
import {
	useFeaturedBlogArticles,
	useBlogArticles
} from '@/hooks/useBlogArticleData'
import type { BlogArticleWithDetails } from '@tenantflow/shared/types/blog'

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

			<div className="min-h-screen bg-white">
				<Navigation context="public" />

				{/* Hero Section */}
				<section className="relative bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 text-white overflow-hidden">
					{/* Background Pattern */}
					<div className="absolute inset-0">
						<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>
						<div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.05%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%221%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
					</div>
					
					<div className="relative">
						<div className="container mx-auto px-6 py-20 lg:py-32">
							<motion.div 
								className="max-w-5xl mx-auto text-center"
								initial={{ opacity: 0, y: 30 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
							>
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.6, delay: 0.2 }}
								>
									<Badge 
										variant="secondary" 
										className="mb-8 bg-blue-500/10 text-blue-200 border-blue-500/20 px-6 py-2 text-sm font-medium backdrop-blur-sm"
									>
										<TrendingUp className="w-4 h-4 mr-2" />
										Expert Property Management Insights
									</Badge>
								</motion.div>
								
								<motion.h1 
									className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-8 leading-[1.1] tracking-tight"
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.8, delay: 0.3 }}
								>
									Property Management{' '}
									<span className="bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent">
										Insights
									</span>
								</motion.h1>
								
								<motion.p 
									className="text-xl lg:text-2xl text-blue-100/90 mb-12 max-w-4xl mx-auto leading-relaxed font-light"
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.8, delay: 0.4 }}
								>
									Expert guidance for property managers and landlords. Learn best practices, legal compliance, and growth strategies.
								</motion.p>
								
								<motion.div 
									className="flex items-center justify-center"
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.8, delay: 0.5 }}
								>
									<div className="relative w-full max-w-lg">
										<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
											<Search className="h-5 w-5 text-gray-400" />
										</div>
										<input
											type="text"
											placeholder="Search articles..."
											value={searchQuery}
											onChange={e => setSearchQuery(e.target.value)}
											className="block w-full rounded-full border border-white/20 bg-white/10 backdrop-blur-sm py-4 pr-4 pl-12 text-white transition-all duration-200 placeholder:text-white/70 focus:border-white/40 focus:bg-white/20 focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-blue-900"
										/>
									</div>
								</motion.div>
							</motion.div>
						</div>
						
						{/* Enhanced Bottom Gradient */}
						<div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-50 via-gray-50/80 to-transparent"></div>
					</div>
				</section>

				{/* Featured Article Section */}
				{typedFeaturedArticles.length > 0 && (
					<section className="py-24 bg-gradient-to-b from-gray-50 to-white">
						<div className="container mx-auto px-6">
							<motion.div
								initial={{ opacity: 0, y: 30 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true, margin: "-100px" }}
								transition={{ duration: 0.8 }}
								className="text-center mb-20"
							>
								<h2 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
									Featured{' '}
									<span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
										Article
									</span>
								</h2>
								<p className="text-xl lg:text-2xl text-gray-600 max-w-4xl mx-auto font-light leading-relaxed">
									Our most popular and insightful content, handpicked for you.
								</p>
							</motion.div>

							{typedFeaturedArticles.map((article, index) => (
								<motion.div
									key={article.id}
									initial={{ opacity: 0, y: 30 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true }}
									transition={{ duration: 0.8, delay: index * 0.1 }}
								>
									<Link
										to="/blog/$slug"
										params={{ slug: article.slug }}
										className="group block"
									>
										<Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white/80 backdrop-blur-sm hover:bg-white hover:-translate-y-2 overflow-hidden">
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
													<div className="absolute top-6 left-6">
														<Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 px-4 py-2 text-sm font-medium">
															<Star className="mr-2 h-4 w-4" />
															Featured
														</Badge>
													</div>
													<div className="absolute bottom-6 left-6">
														<Badge variant="secondary" className="bg-white/90 text-blue-600 border-blue-300 px-3 py-1 text-xs font-medium backdrop-blur-sm">
															<Tag className="mr-1 h-3 w-3" />
															{article.category}
														</Badge>
													</div>
												</div>

												<CardContent className="flex flex-col justify-center p-8 lg:p-12">
													<div className="text-gray-600 mb-6 flex flex-wrap items-center gap-4 text-sm">
														<div className="flex items-center gap-2">
															<User className="h-4 w-4" />
															{article.authorName}
														</div>
														<div className="flex items-center gap-2">
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
														<div className="flex items-center gap-2">
															<Clock className="h-4 w-4" />
															{article.readTime || 5} min read
														</div>
													</div>

													<h3 className="text-gray-900 group-hover:text-blue-600 mb-4 text-2xl lg:text-3xl font-bold tracking-tight transition-colors duration-300 leading-tight">
														{article.title}
													</h3>

													<p className="text-gray-600 mb-8 leading-relaxed text-lg">
														{article.excerpt || article.description}
													</p>

													<div className="text-blue-600 flex items-center font-semibold group-hover:text-blue-700 transition-colors duration-300">
														Read Full Article
														<ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
													</div>
												</CardContent>
											</div>
										</Card>
									</Link>
								</motion.div>
							))}
						</div>
					</section>
				)}

				{/* Recent Articles Grid */}
				<section className="py-24 bg-white">
					<div className="container mx-auto px-6">
						<motion.div
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: "-100px" }}
							transition={{ duration: 0.8 }}
							className="text-center mb-20"
						>
							<h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
								Latest{' '}
								<span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
									Articles
								</span>
							</h2>
							<p className="text-xl text-gray-600 max-w-3xl mx-auto font-light leading-relaxed">
								Stay informed with our latest insights and expert guidance.
							</p>
						</motion.div>

						{recentLoading ? (
							<div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
								{[...Array(6)].map((_, i) => (
									<motion.div 
										key={i} 
										className="animate-pulse"
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ duration: 0.6, delay: i * 0.1 }}
									>
										<div className="bg-gradient-to-br from-gray-100 to-gray-200 mb-6 aspect-[16/10] rounded-2xl"></div>
										<div className="bg-gradient-to-r from-gray-200 to-gray-300 mb-3 h-6 w-3/4 rounded-lg"></div>
										<div className="bg-gradient-to-r from-gray-200 to-gray-300 h-4 w-1/2 rounded-lg"></div>
									</motion.div>
								))}
							</div>
						) : (
							<motion.div 
								className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto"
								initial={{ opacity: 0 }}
								whileInView={{ opacity: 1 }}
								viewport={{ once: true }}
								transition={{ duration: 0.8, staggerChildren: 0.1 }}
							>
								{recentArticles.map((article, index) => (
									<motion.div
										key={article.id}
										initial={{ opacity: 0, y: 30 }}
										whileInView={{ opacity: 1, y: 0 }}
										viewport={{ once: true }}
										transition={{ duration: 0.8, delay: index * 0.1 }}
									>
										<Link
											to="/blog/$slug"
											params={{ slug: article.slug }}
											className="group block h-full"
										>
											<Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white/80 backdrop-blur-sm hover:bg-white hover:-translate-y-2 overflow-hidden h-full flex flex-col">
												<div className="relative aspect-[16/10] overflow-hidden">
													<img
														src={
															article.ogImage ||
															'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&h=400&fit=crop&crop=center&auto=format&q=80'
														}
														alt={article.title}
														className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
													/>
													<div className="absolute top-4 left-4">
														<Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 px-3 py-1 text-xs font-medium">
															<Tag className="mr-1 h-3 w-3" />
															{article.category}
														</Badge>
													</div>
													<div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
												</div>

												<CardContent className="p-6 flex-1 flex flex-col">
													<div className="text-gray-600 mb-4 flex items-center gap-3 text-sm">
														<div className="flex items-center gap-1">
															<Clock className="h-4 w-4" />
															{article.readTime || 5} min read
														</div>
														<span>•</span>
														<div className="flex items-center gap-1">
															<User className="h-4 w-4" />
															{article.authorName}
														</div>
													</div>

													<h3 className="text-gray-900 group-hover:text-blue-600 mb-3 text-xl font-bold leading-tight transition-colors duration-300 flex-shrink-0">
														{article.title}
													</h3>

													<p className="text-gray-600 mb-6 line-clamp-3 text-base leading-relaxed flex-1">
														{article.excerpt || article.description}
													</p>

													<div className="flex items-center justify-between pt-4 border-t border-gray-100">
														<time className="text-gray-500 text-sm">
															{article.publishedAt &&
																new Date(article.publishedAt).toLocaleDateString('en-US', {
																	month: 'long',
																	day: 'numeric',
																	year: 'numeric'
																})}
														</time>
														<div className="text-blue-600 flex items-center text-sm font-semibold group-hover:text-blue-700 transition-colors duration-300">
															Read Article
															<ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
														</div>
													</div>
												</CardContent>
											</Card>
										</Link>
									</motion.div>
								))}
							</motion.div>
						)}
					</div>
				</section>

			{/* Newsletter Section */}
			<section className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
				<div className="container mx-auto px-6">
					<motion.div
						initial={{ opacity: 0, y: 40 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.8 }}
						className="relative isolate overflow-hidden"
					>
						<div className="relative bg-white border border-gray-200/50 rounded-3xl px-8 py-20 lg:px-24 lg:py-32 shadow-2xl backdrop-blur-sm">
							{/* Background Pattern */}
							<div className="absolute inset-0 overflow-hidden rounded-3xl">
								<div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/50"></div>
								<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-blue-100/30 to-transparent rounded-full blur-3xl"></div>
								<div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-indigo-100/20 to-transparent rounded-full blur-3xl"></div>
							</div>
							
							<div className="relative mx-auto max-w-2xl text-center">
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true }}
									transition={{ duration: 0.6, delay: 0.2 }}
								>
									<Badge 
										variant="secondary" 
										className="mb-8 bg-blue-100 text-blue-700 border-blue-200 px-6 py-2 text-sm font-medium"
									>
										<TrendingUp className="w-4 h-4 mr-2" />
										Weekly Insights
									</Badge>
								</motion.div>
								
								<motion.h2 
									className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight"
									initial={{ opacity: 0, y: 20 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true }}
									transition={{ duration: 0.6, delay: 0.3 }}
								>
									Never Miss an{' '}
									<span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
										Update
									</span>
								</motion.h2>
								
								<motion.p 
									className="text-xl text-gray-600 mb-12 leading-relaxed font-light"
									initial={{ opacity: 0, y: 20 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true }}
									transition={{ duration: 0.6, delay: 0.4 }}
								>
									Get expert property management insights, legal updates, and industry trends delivered straight to your inbox.
								</motion.p>
								
								<motion.div 
									className="flex flex-col gap-4 sm:flex-row sm:gap-4 max-w-lg mx-auto"
									initial={{ opacity: 0, y: 20 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true }}
									transition={{ duration: 0.6, delay: 0.5 }}
								>
									<input
										type="email"
										placeholder="Enter your email address"
										className="flex-1 rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm px-6 py-4 text-gray-900 placeholder:text-gray-500 shadow-sm transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white"
									/>
									<Button className="rounded-2xl px-8 py-4 font-semibold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
										Subscribe
									</Button>
								</motion.div>
								
								<motion.p 
									className="text-gray-500 mt-6 text-sm"
									initial={{ opacity: 0 }}
									whileInView={{ opacity: 1 }}
									viewport={{ once: true }}
									transition={{ duration: 0.6, delay: 0.6 }}
								>
									Join 2,500+ property managers • No spam • Unsubscribe anytime
								</motion.p>
							</div>
						</div>
					</motion.div>
				</div>
			</section>
			</div>
		</>
	)
}
