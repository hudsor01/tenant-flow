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
  FileText,
  TrendingUp,
  Shield,
  DollarSign,
  Home
} from 'lucide-react';
import { SEO } from '@/components/seo/SEO';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

// Blog article data - in a real app, this would come from a CMS
const blogArticles = [
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
    image: '/blog/software-comparison.jpg',
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
    image: '/blog/california-landlord-guide.jpg',
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
    image: '/blog/tenant-screening.jpg',
    featured: true
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
    image: '/blog/rent-collection.jpg',
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
    image: '/blog/maintenance-management.jpg',
    featured: false
  }
];

const categories = [
  { name: 'Legal', count: 8, icon: Shield },
  { name: 'Property Management', count: 12, icon: Home },
  { name: 'Finance', count: 6, icon: DollarSign },
  { name: 'Technology', count: 4, icon: TrendingUp }
];

export default function BlogPage() {
  const featuredArticles = blogArticles.filter(article => article.featured);
  const recentArticles = blogArticles.filter(article => !article.featured);

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
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

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* Header */}
        <div className="border-b bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            {/* Breadcrumbs */}
            <Breadcrumbs 
              items={breadcrumbs} 
              className="mb-6"
            />
            <motion.div {...fadeInUp} className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Property Management <span className="text-primary">Blog</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Expert insights, legal guides, and proven strategies for successful property management
              </p>
            </motion.div>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Featured Articles */}
              <motion.section {...fadeInUp} className="mb-12">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  Featured Articles
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {featuredArticles.map((article) => (
                    <Card key={article.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="aspect-video bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                        <FileText className="h-12 w-12 text-primary/50" />
                      </div>
                      <CardHeader>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">{article.category}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(article.publishedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <CardTitle className="line-clamp-2">
                          <Link to={`/blog/${article.id}`} className="hover:text-primary transition-colors">
                            {article.title}
                          </Link>
                        </CardTitle>
                        <CardDescription className="line-clamp-3">
                          {article.excerpt}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {article.author}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {article.readTime}
                            </span>
                          </div>
                          <Link to={`/blog/${article.id}`}>
                            <Button variant="ghost" size="sm">
                              Read More
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.section>

              {/* Recent Articles */}
              <motion.section {...fadeInUp}>
                <h2 className="text-2xl font-bold mb-6">Recent Articles</h2>
                <div className="space-y-6">
                  {recentArticles.map((article) => (
                    <Card key={article.id} className="overflow-hidden">
                      <div className="md:flex">
                        <div className="md:w-1/3 aspect-video md:aspect-square bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                          <FileText className="h-8 w-8 text-primary/50" />
                        </div>
                        <div className="md:w-2/3">
                          <CardHeader>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{article.category}</Badge>
                              <span className="text-sm text-muted-foreground">
                                {new Date(article.publishedAt).toLocaleDateString()}
                              </span>
                            </div>
                            <CardTitle className="line-clamp-2">
                              <Link to={`/blog/${article.id}`} className="hover:text-primary transition-colors">
                                {article.title}
                              </Link>
                            </CardTitle>
                            <CardDescription className="line-clamp-2">
                              {article.excerpt}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {article.author}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {article.readTime}
                                </span>
                              </div>
                              <Link to={`/blog/${article.id}`}>
                                <Button variant="outline" size="sm">
                                  Read More
                                </Button>
                              </Link>
                            </div>
                          </CardContent>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </motion.section>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Categories */}
              <motion.div {...fadeInUp}>
                <Card>
                  <CardHeader>
                    <CardTitle>Categories</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {categories.map((category) => {
                      const IconComponent = category.icon;
                      return (
                        <div key={category.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4 text-primary" />
                            <span className="text-sm">{category.name}</span>
                          </div>
                          <Badge variant="secondary">{category.count}</Badge>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </motion.div>

              {/* CTA */}
              <motion.div {...fadeInUp}>
                <Card className="bg-primary text-primary-foreground">
                  <CardHeader>
                    <CardTitle>Start Managing Properties</CardTitle>
                    <CardDescription className="text-primary-foreground/80">
                      Join thousands of landlords using TenantFlow to streamline their property management.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link to="/pricing">
                      <Button variant="secondary" className="w-full">
                        Get Started Free
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