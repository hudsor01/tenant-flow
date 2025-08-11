'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from '@/lib/framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  BookOpen, 
  FileText, 
  Video, 
  Download, 
  Search,
  Filter,
  ExternalLink,
  Clock,
  Eye,
  Star,
  Sparkles,
  PlayCircle,
  Code,
  HelpCircle,
  Users,
  ArrowRight,
  Lightbulb,
  MessageCircle
} from 'lucide-react'
import Link from 'next/link'

interface Resource {
  id: string
  title: string
  description: string
  category: 'guide' | 'video' | 'template' | 'api' | 'blog' | 'webinar'
  type: 'free' | 'premium'
  readTime: string
  views: string
  rating: number
  downloadUrl?: string
  href?: string
  isNew?: boolean
  featured?: boolean
}

const resources: Resource[] = [
  {
    id: '1',
    title: 'Complete Property Management Setup Guide',
    description: 'Step-by-step walkthrough to get your first property listed and tenants organized in under 30 minutes.',
    category: 'guide',
    type: 'free',
    readTime: '15 min read',
    views: '12.5K',
    rating: 4.9,
    href: '/resources/setup-guide',
    featured: true
  },
  {
    id: '2',
    title: 'Lease Agreement Templates (All 50 States)',
    description: 'Legally compliant lease templates for every state, customizable and ready to use.',
    category: 'template',
    type: 'premium',
    readTime: 'Templates',
    views: '8.2K',
    rating: 4.8,
    downloadUrl: '/downloads/lease-templates.zip'
  },
  {
    id: '3',
    title: 'Tenant Screening Best Practices',
    description: 'How to identify reliable tenants and avoid costly mistakes with comprehensive screening processes.',
    category: 'video',
    type: 'free',
    readTime: '25 min video',
    views: '15.1K',
    rating: 4.7,
    href: '/resources/tenant-screening-video',
    isNew: true
  },
  {
    id: '4',
    title: 'Property Management API Documentation',
    description: 'Complete API reference for integrating TenantFlow with your existing systems and tools.',
    category: 'api',
    type: 'free',
    readTime: 'Reference',
    views: '3.4K',
    rating: 4.6,
    href: '/api-docs'
  },
  {
    id: '5',
    title: 'Maximizing Rental ROI: 2025 Market Analysis',
    description: 'Data-driven insights on rental market trends and strategies to optimize your property investments.',
    category: 'blog',
    type: 'free',
    readTime: '12 min read',
    views: '9.8K',
    rating: 4.8,
    href: '/blog/rental-roi-2025',
    isNew: true
  },
  {
    id: '6',
    title: 'Advanced Property Analytics Webinar',
    description: 'Learn how to use TenantFlow\'s analytics to make data-driven decisions and increase profitability.',
    category: 'webinar',
    type: 'premium',
    readTime: '60 min webinar',
    views: '2.1K',
    rating: 4.9,
    href: '/webinars/property-analytics'
  }
]

const categories = [
  { id: 'all', label: 'All Resources', icon: BookOpen },
  { id: 'guide', label: 'Guides', icon: FileText },
  { id: 'video', label: 'Videos', icon: Video },
  { id: 'template', label: 'Templates', icon: Download },
  { id: 'api', label: 'API Docs', icon: Code },
  { id: 'blog', label: 'Blog Posts', icon: Lightbulb },
  { id: 'webinar', label: 'Webinars', icon: PlayCircle }
]

function ResourceCard({ resource }: { resource: Resource }) {
  const getCategoryIcon = (category: Resource['category']) => {
    switch (category) {
      case 'guide': return FileText
      case 'video': return Video
      case 'template': return Download
      case 'api': return Code
      case 'blog': return Lightbulb
      case 'webinar': return PlayCircle
      default: return BookOpen
    }
  }

  const CategoryIcon = getCategoryIcon(resource.category)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card className={`border-0 bg-gradient-to-br from-white to-muted/20 hover:shadow-xl transition-all duration-300 group cursor-pointer h-full ${
        resource.featured ? 'ring-2 ring-primary/20 shadow-lg' : ''
      }`}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                resource.type === 'premium' 
                  ? 'bg-gradient-to-br from-accent to-primary' 
                  : 'bg-gradient-to-br from-muted to-muted-foreground/20'
              }`}>
                <CategoryIcon className={`w-5 h-5 ${resource.type === 'premium' ? 'text-white' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  {resource.featured && (
                    <Badge className="bg-gradient-to-r from-primary to-accent text-white text-xs">Featured</Badge>
                  )}
                  {resource.isNew && (
                    <Badge variant="secondary" className="text-xs">New</Badge>
                  )}
                  {resource.type === 'premium' && (
                    <Badge className="bg-gradient-to-r from-accent to-success text-white text-xs">Premium</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 text-yellow-500 fill-current" />
              <span className="text-sm text-muted-foreground">{resource.rating}</span>
            </div>
          </div>
          
          <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
            {resource.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-0">
          <p className="text-muted-foreground mb-4 leading-relaxed line-clamp-3">
            {resource.description}
          </p>

          <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{resource.readTime}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Eye className="w-4 h-4" />
                <span>{resource.views}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button 
              asChild
              variant={resource.type === 'premium' ? 'premium' : 'outline'} 
              className="group/btn"
            >
              <Link 
                href={resource.href || resource.downloadUrl || '#'}
                target={resource.downloadUrl ? '_blank' : undefined}
                rel={resource.downloadUrl ? 'noopener noreferrer' : undefined}
              >
                {resource.downloadUrl ? (
                  <>
                    Download
                    <Download className="w-4 h-4 ml-2 group-hover/btn:translate-y-0.5 transition-transform" />
                  </>
                ) : (
                  <>
                    {resource.category === 'video' || resource.category === 'webinar' ? 'Watch' : 'Read'}
                    <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                  </>
                )}
              </Link>
            </Button>
            {resource.href && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={resource.href}>
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function ResourcesPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredResources = resources.filter(resource => {
    const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const featuredResources = resources.filter(resource => resource.featured)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-6"
            >
              <Badge className="bg-gradient-to-r from-primary via-accent to-success text-white border-0 px-6 py-2 text-sm font-semibold shadow-lg">
                <Sparkles className="w-4 h-4 mr-2" />
                Resource Hub
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight"
            >
              Learn &{' '}
              <span className="bg-gradient-to-r from-primary via-accent to-success bg-clip-text text-transparent">
                Succeed
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
            >
              Everything you need to master property management. From setup guides to advanced strategies, 
              templates to webinars - accelerate your success with our comprehensive resources.
            </motion.p>
          </div>

          {/* Search and Filter */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col lg:flex-row gap-6 items-center justify-between mb-12"
          >
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 border-2 transition-all duration-200 focus:border-primary focus:shadow-lg focus:shadow-primary/10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const IconComponent = category.icon
                return (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                    className="flex items-center space-x-2"
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{category.label}</span>
                  </Button>
                )
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Resources */}
      {selectedCategory === 'all' && searchQuery === '' && (
        <section className="py-16 px-4 bg-gradient-to-r from-muted/20 to-muted/10">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl font-bold text-foreground mb-6">Featured Resources</h2>
              <p className="text-xl text-muted-foreground">
                Our most popular and valuable content to help you get started.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {featuredResources.map((resource, index) => (
                <motion.div
                  key={resource.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <ResourceCard resource={resource} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Resources */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-4xl font-bold text-foreground mb-4">
                  {selectedCategory === 'all' ? 'All Resources' : categories.find(c => c.id === selectedCategory)?.label}
                </h2>
                <p className="text-muted-foreground">
                  {filteredResources.length} {filteredResources.length === 1 ? 'resource' : 'resources'} found
                </p>
              </div>

              {filteredResources.length > 0 && (
                <Button variant="outline" className="flex items-center space-x-2">
                  <Filter className="w-4 h-4" />
                  <span>Sort by Popular</span>
                </Button>
              )}
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {filteredResources.length > 0 ? (
              <motion.div 
                key="resources"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {filteredResources.map((resource) => (
                  <ResourceCard key={resource.id} resource={resource} />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="no-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
                  <HelpCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-semibold text-foreground mb-4">No resources found</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Try adjusting your search terms or selecting a different category.
                </p>
                <Button 
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedCategory('all')
                  }}
                  variant="outline"
                >
                  Clear Filters
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Help Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="mb-8">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-4xl font-bold text-foreground mb-6">Need More Help?</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                Can't find what you're looking for? Our support team is here to help you succeed 
                with personalized guidance and expert advice.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[
                {
                  icon: MessageCircle,
                  title: 'Live Chat',
                  description: 'Get instant help from our team'
                },
                {
                  icon: Video,
                  title: '1-on-1 Training',
                  description: 'Schedule personalized onboarding'
                },
                {
                  icon: Users,
                  title: 'Community Forum',
                  description: 'Connect with other property owners'
                }
              ].map((option) => {
                const IconComponent = option.icon
                return (
                  <Card key={option.title} className="border-0 bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-6 text-center">
                      <div className="mx-auto w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mb-4">
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-2">{option.title}</h3>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <Button variant="premium" size="lg" className="group">
                  Contact Support
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/help">
                <Button variant="outline" size="lg">
                  Visit Help Center
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}