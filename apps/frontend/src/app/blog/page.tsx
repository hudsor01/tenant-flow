import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const blogPosts = [
	{
		id: 1,
		title: '10 Essential Property_ Management Tips for New Landlords',
		excerpt:
			'Starting your property management journey? Here are the key strategies that successful landlords use to maximize returns and keep tenants happy.',
		author: 'Sarah Johnson',
		date: '2024-01-15',
		readTime: '8 min read',
		category: 'Property_ Management',
		image: '/api/placeholder/400/250',
		featured: true
	},
	{
		id: 2,
		title: 'How to Handle Maintenance Requests Efficiently',
		excerpt:
			'Learn the best practices for managing maintenance requests, from tenant communication to vendor coordination.',
		author: 'Mike Chen',
		date: '2024-01-10',
		readTime: '6 min read',
		category: 'Maintenance',
		image: '/api/placeholder/400/250'
	},
	{
		id: 3,
		title: 'Tenant Screening: Red Flags to Watch For',
		excerpt:
			'Protect your investment by learning how to identify potential problem tenants during the screening process.',
		author: 'Lisa Rodriguez',
		date: '2024-01-05',
		readTime: '7 min read',
		category: 'Tenant Management',
		image: '/api/placeholder/400/250'
	},
	{
		id: 4,
		title: 'Understanding Rental Market Trends in 2024',
		excerpt:
			'Stay ahead of the curve with insights into current rental market conditions and what they mean for property owners.',
		author: 'David Kim',
		date: '2024-01-01',
		readTime: '10 min read',
		category: 'Market Analysis',
		image: '/api/placeholder/400/250'
	}
]

const categories = [
	'Property_ Management',
	'Tenant Management',
	'Maintenance',
	'Financial Planning',
	'Legal & Compliance',
	'Market Analysis'
]

export default function BlogPage() {
	const featuredPost = blogPosts.find(post => post.featured)
	const regularPosts = blogPosts.filter(post => !post.featured)

	return (
		<div className="min-h-screen bg-white">
			{/* Navigation */}
			<nav className="border-b bg-white/95 backdrop-blur-sm">
				<div className="container mx-auto flex h-16 items-center justify-between px-4">
					<Link
						href="/"
						className="group flex items-center space-x-2"
					>
						<i className="i-lucide-building-2 inline-block text-primary h-8 w-8 transition-transform group-hover:scale-110"  />
						<span className="from-primary bg-gradient-to-r to-purple-600 bg-clip-text text-xl font-bold text-transparent">
							TenantFlow
						</span>
					</Link>
					<Button asChild>
						<Link href="/auth/signup">Get Started Free</Link>
					</Button>
				</div>
			</nav>

			{/* Hero Section */}
			<section className="bg-gradient-to-br from-blue-50 to-purple-50 px-4 pb-12 pt-24">
				<div className="container mx-auto text-center">
					<Badge className="from-primary mb-6 bg-gradient-to-r to-purple-600 text-white">
						<i className="i-lucide-sparkles inline-block mr-2 h-4 w-4"  />
						Property_ Management Insights
					</Badge>
					<h1 className="mb-6 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-5xl font-bold text-transparent">
						TenantFlow Blog
					</h1>
					<p className="mx-auto max-w-3xl text-xl text-gray-600">
						Expert tips, industry insights, and best practices for
						property managers and landlords
					</p>
				</div>
			</section>

			{/* Featured Post */}
			{featuredPost && (
				<section className="px-4 py-16">
					<div className="container mx-auto">
						<div className="mb-12 text-center">
							<h2 className="mb-4 text-3xl font-bold">
								Featured Article
							</h2>
						</div>
						<Card className="overflow-hidden shadow-xl transition-shadow duration-300 hover:shadow-2xl">
							<div className="md:flex">
								<div className="md:w-1/2">
									<div className="flex h-64 items-center justify-center bg-gradient-to-br from-blue-400 to-purple-400 md:h-full">
										<i className="i-lucide-building-2 inline-block h-20 w-20 text-white opacity-50"  />
									</div>
								</div>
								<div className="p-8 md:w-1/2">
									<Badge className="mb-4 bg-blue-100 text-blue-800">
										{featuredPost.category}
									</Badge>
									<h3 className="mb-4 text-2xl font-bold text-gray-900">
										{featuredPost.title}
									</h3>
									<p className="mb-6 text-lg text-gray-600">
										{featuredPost.excerpt}
									</p>
									<div className="flex items-center justify-between">
										<div className="flex items-center space-x-4 text-sm text-gray-500">
											<div className="flex items-center">
												<i className="i-lucide-user inline-block mr-1 h-4 w-4"  />
												{featuredPost.author}
											</div>
											<div className="flex items-center">
												<i className="i-lucide-calendar inline-block mr-1 h-4 w-4"  />
												{new Date(
													featuredPost.date
												).toLocaleDateString()}
											</div>
											<div className="flex items-center">
												<i className="i-lucide-clock inline-block mr-1 h-4 w-4"  />
												{featuredPost.readTime}
											</div>
										</div>
										<Button className="group">
											Read More
											<i className="i-lucide-arrow-right inline-block ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"  />
										</Button>
									</div>
								</div>
							</div>
						</Card>
					</div>
				</section>
			)}

			{/* Blog Posts Grid */}
			<section className="bg-gray-50 px-4 py-16">
				<div className="container mx-auto">
					<div className="grid gap-8 lg:grid-cols-4">
						{/* Main Content */}
						<div className="lg:col-span-3">
							<h2 className="mb-8 text-3xl font-bold">
								Latest Articles
							</h2>
							<div className="grid gap-8 md:grid-cols-2">
								{regularPosts.map(post => (
									<Card
										key={post.id}
										className="overflow-hidden transition-shadow duration-300 hover:shadow-lg"
									>
										<div className="flex h-48 items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
											<i className="i-lucide-building-2 inline-block h-12 w-12 text-gray-400"  />
										</div>
										<CardContent className="p-6">
											<Badge className="mb-3 bg-gray-100 text-xs text-gray-700">
												{post.category}
											</Badge>
											<h3 className="mb-3 line-clamp-2 text-lg font-semibold text-gray-900">
												{post.title}
											</h3>
											<p className="mb-4 line-clamp-3 text-sm text-gray-600">
												{post.excerpt}
											</p>
											<div className="mb-4 flex items-center justify-between text-xs text-gray-500">
												<span>{post.author}</span>
												<div className="flex items-center space-x-2">
													<span>
														{new Date(
															post.date
														).toLocaleDateString()}
													</span>
													<span>•</span>
													<span>{post.readTime}</span>
												</div>
											</div>
											<Button
												variant="outline"
												size="sm"
												className="group w-full"
											>
												Read Article
												<i className="i-lucide-arrow-right inline-block ml-2 h-3 w-3 transition-transform group-hover:translate-x-1"  />
											</Button>
										</CardContent>
									</Card>
								))}
							</div>
						</div>

						{/* Sidebar */}
						<div className="lg:col-span-1">
							<div className="space-y-8">
								{/* Categories */}
								<Card className="p-6">
									<h3 className="mb-4 font-semibold">
										Categories
									</h3>
									<div className="space-y-2">
										{categories.map(category => (
											<div
												key={category}
												className="flex items-center justify-between"
											>
												<span className="hover:text-primary cursor-pointer text-sm text-gray-600 transition-colors">
													{category}
												</span>
												<Badge
													variant="outline"
													className="text-xs"
												>
													{Math.floor(
														Math.random() * 10
													) + 1}
												</Badge>
											</div>
										))}
									</div>
								</Card>

								{/* Newsletter Signup */}
								<Card className="bg-gradient-to-br from-blue-50 to-purple-50 p-6">
									<h3 className="mb-3 font-semibold">
										Stay Updated
									</h3>
									<p className="mb-4 text-sm text-gray-600">
										Get the latest property management tips
										delivered to your inbox.
									</p>
									<Button className="w-full" size="sm">
										Subscribe to Newsletter
									</Button>
								</Card>

								{/* Recent Posts */}
								<Card className="p-6">
									<h3 className="mb-4 font-semibold">
										Recent Posts
									</h3>
									<div className="space-y-4">
										{blogPosts.slice(0, 3).map(post => (
											<div
												key={post.id}
												className="border-b pb-3 last:border-b-0"
											>
												<h4 className="hover:text-primary mb-1 line-clamp-2 cursor-pointer text-sm font-medium text-gray-900">
													{post.title}
												</h4>
												<p className="text-xs text-gray-500">
													{new Date(
														post.date
													).toLocaleDateString()}
												</p>
											</div>
										))}
									</div>
								</Card>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="from-primary bg-gradient-to-r to-purple-600 px-4 py-20 text-white">
				<div className="container mx-auto text-center">
					<h2 className="mb-4 text-4xl font-bold">
						Ready to Streamline Your Property_ Management?
					</h2>
					<p className="mb-8 text-xl text-blue-100">
						Put these insights into action with TenantFlow
					</p>
					<div className="flex flex-col justify-center gap-4 sm:flex-row">
						<Link href="/auth/signup">
							<Button
								size="lg"
								className="text-primary inline-flex items-center bg-white hover:bg-gray-100"
							>
								Start Free Trial
								<i className="i-lucide-arrow-right inline-block ml-2 h-5 w-5"  />
							</Button>
						</Link>
						<Link href="/features">
							<Button
								size="lg"
								variant="outline"
								className="border-white text-white hover:bg-white/10"
							>
								Explore Features
							</Button>
						</Link>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="bg-gray-900 px-4 py-8 text-gray-400">
				<div className="container mx-auto text-center">
					<p>&copy; 2024 TenantFlow. All rights reserved.</p>
				</div>
			</footer>
		</div>
	)
}
