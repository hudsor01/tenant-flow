import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
    Calculator,
    Loader2
} from 'lucide-react'
import { SEO } from '@/components/seo/SEO'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useFeaturedBlogArticles, useBlogArticles } from '@/hooks/useBlogArticleData'
import type { BlogArticleWithDetails } from '@/types/blog'

// Categories for the sidebar (production-ready data)
const sidebarCategories = [
    {
        name: 'Legal',
        count: 8,
        icon: Shield,
        color: 'bg-red-50 text-red-700 border-red-200'
    },
    {
        name: 'Property Management',
        count: 12,
        icon: Home,
        color: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    {
        name: 'Finance',
        count: 6,
        icon: DollarSign,
        color: 'bg-green-50 text-green-700 border-green-200'
    },
    {
        name: 'Technology',
        count: 4,
        icon: TrendingUp,
        color: 'bg-purple-50 text-purple-700 border-purple-200'
    }
]

export default function BlogPage() {
    const [searchQuery, setSearchQuery] = useState('')

    // Fetch data from database
    const { data: featuredArticles = [], isLoading: featuredLoading } = useFeaturedBlogArticles(3)
    const { data: recentArticlesData, isLoading: recentLoading } = useBlogArticles(
        { featured: false },
        { page: 1, limit: 6 }
    )

    // Type the arrays properly to avoid TypeScript errors
    const typedFeaturedArticles: BlogArticleWithDetails[] = featuredArticles as BlogArticleWithDetails[]
    const recentArticles: BlogArticleWithDetails[] = recentArticlesData?.articles || []
    const totalArticles = (typedFeaturedArticles.length || 0) + (recentArticlesData?.total || 0)

    const staggerChildren = {
        animate: {
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const fadeInUp = {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }
    }

    const breadcrumbs = [{ name: 'Blog', url: '/blog' }]

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
                            <Link
                                to="/"
                                className="flex items-center space-x-2"
                            >
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700">
                                    <Home className="h-5 w-5 text-white" />
                                </div>
                                <span className="text-xl font-semibold text-gray-900">
                                    TenantFlow
                                </span>
                            </Link>

                            <div className="hidden items-center space-x-1 md:flex">
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
                                    <DropdownMenuContent
                                        align="start"
                                        className="w-64 border bg-white/95 shadow-xl backdrop-blur-xl"
                                    >
                                        <DropdownMenuItem
                                            asChild
                                            className="cursor-pointer"
                                        >
                                            <Link
                                                to="/lease-generator"
                                                className="flex items-center gap-3 px-4 py-3"
                                            >
                                                <div className="rounded-lg bg-blue-500/10 p-2">
                                                    <FileText className="h-4 w-4 text-blue-600" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">
                                                        Lease Generator
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        Create legal lease agreements
                                                    </span>
                                                </div>
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            asChild
                                            className="cursor-pointer"
                                        >
                                            <Link
                                                to="/invoice-generator"
                                                className="flex items-center gap-3 px-4 py-3"
                                            >
                                                <div className="rounded-lg bg-green-500/10 p-2">
                                                    <Calculator className="h-4 w-4 text-green-600" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">
                                                        Invoice Generator
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        Professional invoice templates
                                                    </span>
                                                </div>
                                            </Link>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <Link
                                    to="/pricing"
                                    className="px-3 py-2 font-medium text-gray-600 transition-colors hover:text-gray-900"
                                >
                                    Pricing
                                </Link>
                                <Link
                                    to="/blog"
                                    className="px-3 py-2 font-medium text-blue-600"
                                >
                                    Blog
                                </Link>
                                <Link
                                    to="/auth/login"
                                    className="px-3 py-2 font-medium text-gray-600 transition-colors hover:text-gray-900"
                                >
                                    Sign In
                                </Link>
                                <Button asChild className="ml-4 rounded-full">
                                    <Link to="/auth/signup">Get Started</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Hero Section */}
                <section className="relative overflow-hidden py-20 lg:py-28">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50" />
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23f8fafc%22%20fill-opacity%3D%220.5%22%3E%3Ccircle%20cx%3D%227%22%20cy%3D%227%22%20r%3D%221%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />

                    <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
                        <Breadcrumbs items={breadcrumbs} className="mb-8" />

                        <motion.div
                            initial="initial"
                            animate="animate"
                            variants={staggerChildren}
                            className="mx-auto max-w-4xl text-center"
                        >
                            <motion.div variants={fadeInUp} className="mb-6">
                                <Badge
                                    variant="secondary"
                                    className="border-blue-200 bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700"
                                >
                                    <BookOpen className="mr-2 h-4 w-4" />
                                    Expert Insights & Guides
                                </Badge>
                            </motion.div>

                            <motion.h1
                                variants={fadeInUp}
                                className="mb-6 text-4xl font-bold text-gray-900 md:text-5xl lg:text-6xl"
                            >
                                Property Management
                                <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                    Insights & Guides
                                </span>
                            </motion.h1>

                            <motion.p
                                variants={fadeInUp}
                                className="mb-8 text-xl leading-relaxed text-gray-600 md:text-2xl"
                            >
                                Expert insights, legal guides, and proven strategies to help you master property management
                            </motion.p>

                            <motion.div
                                variants={fadeInUp}
                                className="mb-12 flex items-center justify-center gap-4"
                            >
                                <div className="relative">
                                    <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search articles..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-64 rounded-full border border-gray-200 py-3 pr-4 pl-10 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                            </motion.div>

                            <motion.div
                                variants={fadeInUp}
                                className="flex items-center justify-center gap-8 text-sm text-gray-500"
                            >
                                <div className="flex items-center gap-2">
                                    <Coffee className="h-4 w-4 text-amber-500" />
                                    {totalArticles} articles
                                </div>
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                    Updated weekly
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </section>

                <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 gap-12 lg:grid-cols-4">
                        {/* Main Content */}
                        <div className="lg:col-span-3">
                            {/* Featured Articles */}
                            <motion.section
                                initial="initial"
                                animate="animate"
                                variants={staggerChildren}
                                className="mb-16"
                            >
                                <motion.div
                                    variants={fadeInUp}
                                    className="mb-8 flex items-center justify-between"
                                >
                                    <h2 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-red-500">
                                            <TrendingUp className="h-5 w-5 text-white" />
                                        </div>
                                        Featured Articles
                                    </h2>
                                    <Badge
                                        variant="outline"
                                        className="border-orange-200 text-orange-600"
                                    >
                                        Editor's Choice
                                    </Badge>
                                </motion.div>

                                {featuredLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                                        {typedFeaturedArticles.map((article) => (
                                            <motion.div
                                                key={article.id}
                                                variants={fadeInUp}
                                            >
                                                <Card className="group overflow-hidden border-0 bg-white shadow-lg transition-all duration-300 hover:shadow-xl">
                                                    <div className="relative aspect-[16/10] overflow-hidden">
                                                        <img
                                                            src={article.ogImage || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=450&fit=crop&crop=center&auto=format&q=80'}
                                                            alt={`${article.title} featured image`}
                                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                            loading="lazy"
                                                        />
                                                        <div className="absolute top-4 left-4">
                                                            <Badge className="bg-white/90 text-gray-700 backdrop-blur-sm">
                                                                {article.category}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <CardHeader className="p-6">
                                                        <div className="mb-3 flex items-center gap-3 text-sm text-gray-500">
                                                            <div className="flex items-center gap-1">
                                                                <User className="h-4 w-4" />
                                                                {article.authorName}
                                                            </div>
                                                            <span>•</span>
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="h-4 w-4" />
                                                                {article.readTime ? `${article.readTime} min` : '5 min'}
                                                            </div>
                                                            <span>•</span>
                                                            <span>
                                                                {article.publishedAt && new Date(article.publishedAt).toLocaleDateString('en-US', {
                                                                    month: 'short',
                                                                    day: 'numeric'
                                                                })}
                                                            </span>
                                                        </div>

                                                        <CardTitle className="mb-3 text-xl leading-tight font-bold text-gray-900 transition-colors group-hover:text-blue-600">
                                                            <Link to={`/blog/${article.slug}`}>
                                                                {article.title}
                                                            </Link>
                                                        </CardTitle>

                                                        <CardDescription className="line-clamp-3 leading-relaxed text-gray-600">
                                                            {article.excerpt || article.description}
                                                        </CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="px-6 pb-6">
                                                        <Link to={`/blog/${article.slug}`}>
                                                            <Button
                                                                variant="ghost"
                                                                className="group/btn h-auto p-0 font-semibold text-blue-600"
                                                            >
                                                                Read Article
                                                                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                                                            </Button>
                                                        </Link>
                                                    </CardContent>
                                                </Card>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </motion.section>

                            {/* Recent Articles */}
                            <motion.section
                                initial="initial"
                                animate="animate"
                                variants={staggerChildren}
                            >
                                <motion.h2
                                    variants={fadeInUp}
                                    className="mb-8 text-3xl font-bold text-gray-900"
                                >
                                    Latest Articles
                                </motion.h2>

                                {recentLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {recentArticles.map((article) => (
                                            <motion.div
                                                key={article.id}
                                                variants={fadeInUp}
                                            >
                                                <Card className="group overflow-hidden border-0 bg-white shadow-md transition-all duration-300 hover:shadow-lg">
                                                    <div className="md:flex">
                                                        <div className="aspect-[16/10] overflow-hidden md:aspect-square md:w-80">
                                                            <img
                                                                src={article.ogImage || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=450&fit=crop&crop=center&auto=format&q=80'}
                                                                alt={`${article.title} featured image`}
                                                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                                loading="lazy"
                                                            />
                                                        </div>
                                                        <div className="flex-1 p-6">
                                                            <div className="mb-3 flex items-center gap-3 text-sm text-gray-500">
                                                                <Badge
                                                                    variant="outline"
                                                                    className="text-xs"
                                                                >
                                                                    {article.category}
                                                                </Badge>
                                                                <span>•</span>
                                                                <div className="flex items-center gap-1">
                                                                    <User className="h-3 w-3" />
                                                                    {article.authorName}
                                                                </div>
                                                                <span>•</span>
                                                                <div className="flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    {article.readTime ? `${article.readTime} min` : '5 min'}
                                                                </div>
                                                            </div>

                                                            <h3 className="mb-3 text-xl leading-tight font-bold text-gray-900 transition-colors group-hover:text-blue-600">
                                                                <Link to={`/blog/${article.slug}`}>
                                                                    {article.title}
                                                                </Link>
                                                            </h3>

                                                            <p className="mb-4 line-clamp-2 leading-relaxed text-gray-600">
                                                                {article.excerpt || article.description}
                                                            </p>

                                                            <div className="flex items-center justify-between">
                                                                <span className="text-sm text-gray-500">
                                                                    {article.publishedAt && new Date(article.publishedAt).toLocaleDateString('en-US', {
                                                                        month: 'long',
                                                                        day: 'numeric',
                                                                        year: 'numeric'
                                                                    })}
                                                                </span>
                                                                <Link to={`/blog/${article.slug}`}>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="group/btn font-semibold text-blue-600"
                                                                    >
                                                                        Read More
                                                                        <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                                                                    </Button>
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Card>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
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
                                        <CardTitle className="text-lg font-bold text-gray-900">
                                            Browse by Category
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {sidebarCategories.map((category) => {
                                            const IconComponent = category.icon
                                            return (
                                                <button
                                                    key={category.name}
                                                    className="group flex w-full items-center justify-between rounded-lg p-3 transition-colors hover:bg-gray-50"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={`flex h-8 w-8 items-center justify-center rounded-lg ${category.color}`}
                                                        >
                                                            <IconComponent className="h-4 w-4" />
                                                        </div>
                                                        <span className="font-medium text-gray-900 transition-colors group-hover:text-blue-600">
                                                            {category.name}
                                                        </span>
                                                    </div>
                                                    <Badge
                                                        variant="secondary"
                                                        className="bg-gray-100 text-gray-600"
                                                    >
                                                        {category.count}
                                                    </Badge>
                                                </button>
                                            )
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
                                <Card className="border-0 bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg">
                                    <CardHeader>
                                        <CardTitle className="text-lg font-bold text-gray-900">
                                            Stay Updated
                                        </CardTitle>
                                        <CardDescription className="text-gray-600">
                                            Get the latest property management insights delivered to your inbox.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <input
                                            type="email"
                                            placeholder="Enter your email"
                                            className="w-full rounded-lg border border-gray-200 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                                <Card className="border-0 bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg">
                                    <CardHeader>
                                        <CardTitle className="text-white">
                                            Ready to Get Started?
                                        </CardTitle>
                                        <CardDescription className="text-blue-100">
                                            Join thousands of property managers using TenantFlow to streamline their business.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Link to="/pricing">
                                            <Button
                                                variant="secondary"
                                                className="w-full rounded-lg font-semibold"
                                            >
                                                Start Free Trial
                                                <ArrowRight className="ml-2 h-4 w-4" />
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
    )
}
