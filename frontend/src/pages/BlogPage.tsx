import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  User, 
  ArrowRight, 
  TrendingUp,
  Shield,
  DollarSign,
  Home,
  BookOpen,
  Coffee,
  Search,
  ChevronDown,
  Wrench,
  FileText,
  Calculator
} from 'lucide-react';
import { SEO } from '@/components/seo/SEO';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Blog article data - in a real app, this would come from a CMS
const blogArticles = [
  {
    id: 'future-property-management-automation-2025',
    title: 'TenantFlow Complete Guide: How We Help Property Managers Save 20+ Hours Per Week',
    description: 'Discover exactly how TenantFlow eliminates the time-consuming tasks that keep property managers busy. Real examples, time calculations, and step-by-step workflows included.',
    excerpt: 'If you\'re spending more than 20 hours a week on property management tasks, you\'re doing too much manual work. I\'ve seen property managers cut their weekly workload from 40 hours to just 15 hours using the right tools. Here\'s exactly how TenantFlow makes that possible.',
    author: 'TenantFlow Team',
    publishedAt: '2025-06-27',
    readTime: '15 min',
    category: 'Software Guide',
    tags: ['TenantFlow', 'Property Management Software', 'Time Savings', 'Efficiency'],
    image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=450&fit=crop&crop=center&auto=format&q=80',
    imageAlt: 'Modern laptop displaying property management dashboard with analytics and rental portfolio overview',
    featured: true
  },
  {
    id: 'property-management-software-comparison-2025',
    title: 'Property Management Software Comparison 2025: Complete Guide',
    description: 'Compare the top property management software platforms for landlords and property managers. Features, pricing, and which solution is right for your portfolio.',
    excerpt: 'Detailed comparison of TenantFlow, Buildium, AppFolio, and other top property management platforms. Includes pricing analysis, feature comparison, and recommendations by portfolio size.',
    author: 'TenantFlow Team',
    publishedAt: '2025-01-20',
    readTime: '15 min',
    category: 'Technology',
    tags: ['Property Management Software', 'Landlord Tools', 'Real Estate Technology'],
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=450&fit=crop&crop=center&auto=format&q=80',
    imageAlt: 'Modern office building and residential properties representing property management software comparison',
    featured: true
  },
  {
    id: 'california-landlord-guide-2025',
    title: 'California Landlord Guide: Legal Requirements 2025',
    description: 'Complete guide to California landlord-tenant laws, including security deposit limits, habitability requirements, and eviction procedures.',
    excerpt: 'Navigate California\'s complex rental laws with confidence. Learn about the latest legal requirements, tenant rights, and landlord obligations for 2025.',
    author: 'TenantFlow Legal Team',
    publishedAt: '2025-01-15',
    readTime: '12 min',
    category: 'Legal',
    tags: ['California', 'Landlord Laws', 'Legal Requirements'],
    image: 'https://images.unsplash.com/photo-1560184897-ae75f418493e?w=800&h=450&fit=crop&crop=center&auto=format&q=80',
    imageAlt: 'California residential properties and legal documents representing landlord tenant law requirements',
    featured: true
  },
  {
    id: 'tenant-screening-process',
    title: 'How to Screen Tenants: 10-Step Process for Property Owners',
    description: 'Learn the complete tenant screening process, from application to background checks, to find reliable tenants and protect your investment.',
    excerpt: 'A comprehensive tenant screening process is crucial for finding reliable tenants. Follow our proven 10-step system used by successful landlords.',
    author: 'Sarah Mitchell',
    publishedAt: '2025-01-10',
    readTime: '8 min',
    category: 'Property Management',
    tags: ['Tenant Screening', 'Property Management', 'Rental Process'],
    image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=450&fit=crop&crop=center&auto=format&q=80',
    imageAlt: 'Property inspection and tenant screening documents with keys and rental application forms',
    featured: false
  },
  {
    id: 'rent-collection-best-practices',
    title: 'Rent Collection Best Practices: Never Miss a Payment',
    description: 'Proven strategies for collecting rent on time, handling late payments, and maintaining positive tenant relationships.',
    excerpt: 'Implement these rent collection strategies to improve your cash flow and maintain positive relationships with tenants.',
    author: 'Jennifer Chen',
    publishedAt: '2025-01-01',
    readTime: '10 min',
    category: 'Finance',
    tags: ['Rent Collection', 'Finance', 'Cash Flow'],
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=450&fit=crop&crop=center&auto=format&q=80',
    imageAlt: 'Digital payment processing and financial planning charts for rental property management',
    featured: false
  },
  {
    id: 'maintenance-request-management',
    title: 'Maintenance Request Management Guide for Landlords',
    description: 'Streamline your maintenance workflow with proven systems for handling tenant requests efficiently and cost-effectively.',
    excerpt: 'Learn how to manage maintenance requests efficiently, reduce costs, and keep tenants satisfied with fast response times.',
    author: 'David Rodriguez',
    publishedAt: '2024-12-28',
    readTime: '7 min',
    category: 'Maintenance',
    tags: ['Maintenance', 'Property Management', 'Tenant Relations'],
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=450&fit=crop&crop=center&auto=format&q=80',
    imageAlt: 'Property maintenance tools and equipment for rental property repair management',
    featured: false
  }
];

const categories = [
  { name: 'Legal', count: 8, icon: Shield, color: 'bg-red-50 text-red-700 border-red-200' },
  { name: 'Property Management', count: 12, icon: Home, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { name: 'Finance', count: 6, icon: DollarSign, color: 'bg-green-50 text-green-700 border-green-200' },
  { name: 'Technology', count: 4, icon: TrendingUp, color: 'bg-purple-50 text-purple-700 border-purple-200' }
];

export default function BlogPage() {
  const featuredArticles = blogArticles.filter(article => article.featured);
  const recentArticles = blogArticles.filter(article => !article.featured);

  const staggerChildren = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }
  };

  const breadcrumbs = [
    { name: 'Blog', url: '/blog' }
  ];

  return (
    <>
      <SEO
        title="Property Management Blog - Expert Tips & Legal Guides"
        description="Expert property management advice, legal guides, and industry insights for landlords and property managers. Stay updated with the latest trends and best practices."
        keywords="property management blog, landlord tips, rental property advice, tenant laws, real estate insights"
        type="website"
        canonical={`${window.location.origin}/blog`}
        breadcrumbs={breadcrumbs}
      />

      <div className="min-h-screen bg-white">
        {/* Navigation */}
        <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                  <Home className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-semibold text-gray-900">TenantFlow</span>
              </Link>
              
              <div className="hidden md:flex items-center space-x-1">
                {/* Tools Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="flex items-center gap-2 font-medium transition-all duration-200 hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Wrench className="h-4 w-4" />
                      Tools
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64 bg-white/95 backdrop-blur-xl border shadow-xl">
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to="/lease-generator" className="flex items-center gap-3 px-4 py-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">Lease Generator</span>
                          <span className="text-xs text-gray-500">Create legal lease agreements</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to="/invoice-generator" className="flex items-center gap-3 px-4 py-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <Calculator className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">Invoice Generator</span>
                          <span className="text-xs text-gray-500">Professional invoice templates</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Link to="/pricing" className="text-gray-600 hover:text-gray-900 font-medium transition-colors px-3 py-2">
                  Pricing
                </Link>
                <Link to="/blog" className="text-blue-600 font-medium px-3 py-2">
                  Blog
                </Link>
                <Link to="/auth/login" className="text-gray-600 hover:text-gray-900 font-medium transition-colors px-3 py-2">
                  Sign In
                </Link>
                <Button asChild className="rounded-full ml-4">
                  <Link to="/auth/signup">Get Started</Link>
                </Button>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative py-20 lg:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23f8fafc" fill-opacity="0.5"%3E%3Ccircle cx="7" cy="7" r="1"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
            <Breadcrumbs 
              items={breadcrumbs} 
              className="mb-8"
            />
            
            <motion.div 
              initial="initial"
              animate="animate"
              variants={staggerChildren}
              className="text-center max-w-4xl mx-auto"
            >
              <motion.div variants={fadeInUp} className="mb-6">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 px-4 py-2 text-sm font-medium">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Expert Insights & Guides
                </Badge>
              </motion.div>
              
              <motion.h1 variants={fadeInUp} className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Property Management
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                  Insights & Guides
                </span>
              </motion.h1>
              
              <motion.p variants={fadeInUp} className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
                Expert insights, legal guides, and proven strategies to help you master property management
              </motion.p>
              
              <motion.div variants={fadeInUp} className="flex items-center justify-center gap-4 mb-12">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input 
                    type="text" 
                    placeholder="Search articles..." 
                    className="pl-10 pr-4 py-3 border border-gray-200 rounded-full w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </motion.div>
              
              <motion.div variants={fadeInUp} className="flex items-center justify-center gap-8 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Coffee className="h-4 w-4 text-amber-500" />
                  {blogArticles.length} articles
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Updated weekly
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Featured Articles */}
              <motion.section 
                initial="initial"
                animate="animate"
                variants={staggerChildren}
                className="mb-16"
              >
                <motion.div variants={fadeInUp} className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    Featured Articles
                  </h2>
                  <Badge variant="outline" className="text-orange-600 border-orange-200">
                    Editor's Choice
                  </Badge>
                </motion.div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {featuredArticles.map((article, index) => (
                    <motion.div key={article.id} variants={fadeInUp}>
                      <Card className="group overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
                        <div className="aspect-[16/10] overflow-hidden relative">
                          <img 
                            src={article.image} 
                            alt={article.imageAlt}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                          <div className="absolute top-4 left-4">
                            <Badge className="bg-white/90 text-gray-700 backdrop-blur-sm">
                              {article.category}
                            </Badge>
                          </div>
                        </div>
                        <CardHeader className="p-6">
                          <div className="flex items-center gap-3 mb-3 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {article.author}
                            </div>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {article.readTime}
                            </div>
                            <span>•</span>
                            <span>{new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                          
                          <CardTitle className="text-xl font-bold text-gray-900 leading-tight mb-3 group-hover:text-blue-600 transition-colors">
                            <Link to={`/blog/${article.id}`}>
                              {article.title}
                            </Link>
                          </CardTitle>
                          
                          <CardDescription className="text-gray-600 line-clamp-3 leading-relaxed">
                            {article.excerpt}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="px-6 pb-6">
                          <Link to={`/blog/${article.id}`}>
                            <Button variant="ghost" className="p-0 h-auto font-semibold text-blue-600 group/btn">
                              Read Article
                              <ArrowRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.section>

              {/* Recent Articles */}
              <motion.section 
                initial="initial"
                animate="animate"
                variants={staggerChildren}
              >
                <motion.h2 variants={fadeInUp} className="text-3xl font-bold text-gray-900 mb-8">
                  Latest Articles
                </motion.h2>
                
                <div className="space-y-6">
                  {recentArticles.map((article, index) => (
                    <motion.div key={article.id} variants={fadeInUp}>
                      <Card className="group overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-white">
                        <div className="md:flex">
                          <div className="md:w-80 aspect-[16/10] md:aspect-square overflow-hidden">
                            <img 
                              src={article.image} 
                              alt={article.imageAlt}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                          </div>
                          <div className="flex-1 p-6">
                            <div className="flex items-center gap-3 mb-3 text-sm text-gray-500">
                              <Badge variant="outline" className="text-xs">
                                {article.category}
                              </Badge>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {article.author}
                              </div>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {article.readTime}
                              </div>
                            </div>
                            
                            <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors leading-tight">
                              <Link to={`/blog/${article.id}`}>
                                {article.title}
                              </Link>
                            </h3>
                            
                            <p className="text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                              {article.excerpt}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500">
                                {new Date(article.publishedAt).toLocaleDateString('en-US', { 
                                  month: 'long', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}
                              </span>
                              <Link to={`/blog/${article.id}`}>
                                <Button variant="ghost" size="sm" className="text-blue-600 font-semibold group/btn">
                                  Read More
                                  <ArrowRight className="h-4 w-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Categories */}
              <motion.div 
                initial="initial"
                animate="animate"
                variants={fadeInUp}
              >
                <Card className="border-0 shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-bold text-gray-900">Browse by Category</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {categories.map((category) => {
                      const IconComponent = category.icon;
                      return (
                        <button 
                          key={category.name} 
                          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${category.color}`}>
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                              {category.name}
                            </span>
                          </div>
                          <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                            {category.count}
                          </Badge>
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Newsletter */}
              <motion.div 
                initial="initial"
                animate="animate"
                variants={fadeInUp}
              >
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-gray-900">Stay Updated</CardTitle>
                    <CardDescription className="text-gray-600">
                      Get the latest property management insights delivered to your inbox.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <input 
                      type="email" 
                      placeholder="Enter your email"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <Button className="w-full rounded-lg">
                      Subscribe
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* CTA */}
              <motion.div 
                initial="initial"
                animate="animate"
                variants={fadeInUp}
              >
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                  <CardHeader>
                    <CardTitle className="text-white">Ready to Get Started?</CardTitle>
                    <CardDescription className="text-blue-100">
                      Join thousands of property managers using TenantFlow to streamline their business.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link to="/pricing">
                      <Button variant="secondary" className="w-full rounded-lg font-semibold">
                        Start Free Trial
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}