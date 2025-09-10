import Navbar from '@/components/navbar'
import {
	BarChart3,
	Building2,
	FileText,
	Monitor,
	Newspaper
} from 'lucide-react'
import Link from 'next/link'

export default function BlogPage() {
	return (
		<main className="min-h-screen bg-background">
			<Navbar />
			<div className="pt-10">
				{/* Hero Section */}
				<section className="marketing-hero">
					<div className="container text-center">
						<h1 className="text-display text-gradient-energy mb-6">
							Property Management Insights
						</h1>
						<p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-12">
							Expert advice, industry trends, and best practices for modern
							property managers.
						</p>
					</div>
				</section>

				{/* Featured Article */}
				<section className="py-12">
					<div className="container mx-auto px-4 max-w-6xl">
						<div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-8 md:p-12">
							<div className="grid md:grid-cols-2 gap-8 items-center">
								<div>
									<span className="text-sm font-medium text-primary">
										Featured Article
									</span>
									<h2 className="text-3xl font-bold mt-2 mb-4">
										The Future of Property Management Technology
									</h2>
									<p className="text-muted-foreground mb-6">
										Discover how AI and automation are transforming the property
										management industry and what it means for your business.
									</p>
									<Link
										href="/blog/future-of-property-management"
										className="inline-flex items-center text-primary hover:underline font-medium"
									>
										Read Article →
									</Link>
								</div>
								<div className="bg-white/50 rounded-lg h-48 flex items-center justify-center">
									<div className="text-center">
										<Building2 className="w-16 h-16 mx-auto mb-2 text-primary" />
										<p className="font-medium text-muted-foreground">
											Featured Image
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* Blog Categories */}
				<section className="py-12">
					<div className="container mx-auto px-4 max-w-6xl">
						<div className="text-center mb-12">
							<h2 className="text-3xl font-bold mb-4">Explore Topics</h2>
							<p className="text-muted-foreground">
								Browse articles by category
							</p>
						</div>

						<div className="grid md:grid-cols-4 gap-6">
							{[
								{ name: 'Technology', count: 12, icon: Monitor },
								{ name: 'Best Practices', count: 18, icon: FileText },
								{ name: 'Industry News', count: 8, icon: Newspaper },
								{ name: 'Case Studies', count: 6, icon: BarChart3 }
							].map((category, index) => (
								<Link
									key={index}
									href={`/blog/category/${category.name.toLowerCase().replace(' ', '-')}`}
									className="p-6 border rounded-lg hover:shadow-md transition-shadow text-center group"
								>
									<category.icon className="w-8 h-8 mx-auto mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
									<h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
										{category.name}
									</h3>
									<p className="text-sm text-muted-foreground">
										{category.count} articles
									</p>
								</Link>
							))}
						</div>
					</div>
				</section>

				{/* Recent Articles */}
				<section className="py-12 bg-muted/20">
					<div className="container mx-auto px-4 max-w-6xl">
						<div className="text-center mb-12">
							<h2 className="text-3xl font-bold mb-4">Latest Articles</h2>
							<p className="text-muted-foreground">
								Stay updated with our latest insights
							</p>
						</div>

						<div className="grid md:grid-cols-3 gap-8">
							{[
								{
									title: '10 Tips for Better Tenant Screening',
									excerpt:
										'Learn how to identify the best tenants and reduce vacancy rates with these proven screening techniques.',
									category: 'Best Practices',
									readTime: '5 min read',
									date: 'Mar 15, 2024'
								},
								{
									title: 'Automating Rent Collection in 2024',
									excerpt:
										'Discover the latest tools and strategies for streamlining your rent collection process.',
									category: 'Technology',
									readTime: '7 min read',
									date: 'Mar 10, 2024'
								},
								{
									title: 'Market Trends: What Property Managers Need to Know',
									excerpt:
										'Stay ahead of market changes with our analysis of current real estate trends.',
									category: 'Industry News',
									readTime: '4 min read',
									date: 'Mar 5, 2024'
								}
							].map((article, index) => (
								<Link
									key={index}
									href={`/blog/${article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
									className="bg-card border rounded-lg p-6 hover:shadow-md transition-shadow group"
								>
									<div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
										<span className="text-primary">{article.category}</span>
										<span>•</span>
										<span>{article.readTime}</span>
									</div>
									<h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
										{article.title}
									</h3>
									<p className="text-muted-foreground mb-4">
										{article.excerpt}
									</p>
									<div className="text-sm text-muted-foreground">
										{article.date}
									</div>
								</Link>
							))}
						</div>

						<div className="text-center mt-12">
							<Link
								href="/blog/all"
								className="border border-border px-6 py-2 rounded-lg hover:bg-muted/50 transition-colors"
							>
								View All Articles
							</Link>
						</div>
					</div>
				</section>

				{/* Newsletter Signup */}
				<section className="py-24">
					<div className="container mx-auto px-4 text-center max-w-2xl">
						<h2 className="text-3xl font-bold mb-4">Stay in the loop</h2>
						<p className="text-muted-foreground mb-8">
							Get the latest property management insights delivered to your
							inbox weekly.
						</p>
						<div className="flex gap-4 max-w-md mx-auto">
							<input
								type="email"
								placeholder="Enter your email"
								className="flex-1 px-4 py-2 border rounded-lg"
							/>
							<button className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors">
								Subscribe
							</button>
						</div>
					</div>
				</section>
			</div>
		</main>
	)
}
