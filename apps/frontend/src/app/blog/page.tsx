import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  Calendar, 
  Clock, 
  ArrowRight,
  User,
  Sparkles
} from 'lucide-react'

const blogPosts = [
  {
    id: 1,
    title: '10 Essential Property Management Tips for New Landlords',
    excerpt: 'Starting your property management journey? Here are the key strategies that successful landlords use to maximize returns and keep tenants happy.',
    author: 'Sarah Johnson',
    date: '2024-01-15',
    readTime: '8 min read',
    category: 'Property Management',
    image: '/api/placeholder/400/250',
    featured: true
  },
  {
    id: 2,
    title: 'How to Handle Maintenance Requests Efficiently',
    excerpt: 'Learn the best practices for managing maintenance requests, from tenant communication to vendor coordination.',
    author: 'Mike Chen',
    date: '2024-01-10',
    readTime: '6 min read',
    category: 'Maintenance',
    image: '/api/placeholder/400/250'
  },
  {
    id: 3,
    title: 'Tenant Screening: Red Flags to Watch For',
    excerpt: 'Protect your investment by learning how to identify potential problem tenants during the screening process.',
    author: 'Lisa Rodriguez',
    date: '2024-01-05',
    readTime: '7 min read',
    category: 'Tenant Management',
    image: '/api/placeholder/400/250'
  },
  {
    id: 4,
    title: 'Understanding Rental Market Trends in 2024',
    excerpt: 'Stay ahead of the curve with insights into current rental market conditions and what they mean for property owners.',
    author: 'David Kim',
    date: '2024-01-01',
    readTime: '10 min read',
    category: 'Market Analysis',
    image: '/api/placeholder/400/250'
  }
]

const categories = [
  'Property Management',
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
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 group">
            <Building2 className="h-8 w-8 text-blue-600 transition-transform group-hover:scale-110" />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              TenantFlow
            </span>
          </Link>
          <Button asChild>
            <Link href="/auth/signup">Get Started Free</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-12 px-4 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="container mx-auto text-center">
          <Badge className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <Sparkles className="w-4 h-4 mr-2" />
            Property Management Insights
          </Badge>
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            TenantFlow Blog
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Expert tips, industry insights, and best practices for property managers and landlords
          </p>
        </div>
      </section>

      {/* Featured Post */}
      {featuredPost && (
        <section className="py-16 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Featured Article</h2>
            </div>
            <Card className="overflow-hidden shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <div className="md:flex">
                <div className="md:w-1/2">
                  <div className="h-64 md:h-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center">
                    <Building2 className="h-20 w-20 text-white opacity-50" />
                  </div>
                </div>
                <div className="md:w-1/2 p-8">
                  <Badge className="mb-4 bg-blue-100 text-blue-800">
                    {featuredPost.category}
                  </Badge>
                  <h3 className="text-2xl font-bold mb-4 text-gray-900">
                    {featuredPost.title}
                  </h3>
                  <p className="text-gray-600 mb-6 text-lg">
                    {featuredPost.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {featuredPost.author}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(featuredPost.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {featuredPost.readTime}
                      </div>
                    </div>
                    <Button className="group">
                      Read More
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>
      )}

      {/* Blog Posts Grid */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3">
              <h2 className="text-3xl font-bold mb-8">Latest Articles</h2>
              <div className="grid md:grid-cols-2 gap-8">
                {regularPosts.map((post) => (
                  <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                    <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                      <Building2 className="h-12 w-12 text-gray-400" />
                    </div>
                    <CardContent className="p-6">
                      <Badge className="mb-3 bg-gray-100 text-gray-700 text-xs">
                        {post.category}
                      </Badge>
                      <h3 className="text-lg font-semibold mb-3 text-gray-900 line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 mb-4 text-sm line-clamp-3">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                        <span>{post.author}</span>
                        <div className="flex items-center space-x-2">
                          <span>{new Date(post.date).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{post.readTime}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="w-full group">
                        Read Article
                        <ArrowRight className="ml-2 h-3 w-3 transition-transform group-hover:translate-x-1" />
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
                  <h3 className="font-semibold mb-4">Categories</h3>
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 hover:text-blue-600 cursor-pointer transition-colors">
                          {category}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {Math.floor(Math.random() * 10) + 1}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Newsletter Signup */}
                <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50">
                  <h3 className="font-semibold mb-3">Stay Updated</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Get the latest property management tips delivered to your inbox.
                  </p>
                  <Button className="w-full" size="sm">
                    Subscribe to Newsletter
                  </Button>
                </Card>

                {/* Recent Posts */}
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Recent Posts</h3>
                  <div className="space-y-4">
                    {blogPosts.slice(0, 3).map((post) => (
                      <div key={post.id} className="border-b pb-3 last:border-b-0">
                        <h4 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2 hover:text-blue-600 cursor-pointer">
                          {post.title}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {new Date(post.date).toLocaleDateString()}
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
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Streamline Your Property Management?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Put these insights into action with TenantFlow
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              <Link href="/auth/signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
            >
              <Link href="/features">
                Explore Features
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-900 text-gray-400">
        <div className="container mx-auto text-center">
          <p>&copy; 2024 TenantFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}