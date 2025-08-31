'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import {
	BookOpen,
	FileText,
	Video,
	Download,
	Code,
	Lightbulb,
	PlayCircle,
	Star,
	Clock,
	Eye,
	ArrowRight,
	ExternalLink,
	Sparkles,
	Search,
	Filter,
	HelpCircle,
	Users,
	MessageCircle
} from 'lucide-react'

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
		description:
			'Step-by-step walkthrough to get your first property listed and tenants organized in under 30 minutes.',
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
		description:
			'Legally compliant lease templates for every state, customizable and ready to use.',
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
		description:
			'How to identify reliable tenants and avoid costly mistakes with comprehensive screening processes.',
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
		description:
			'Complete API reference for integrating TenantFlow with your existing systems and tools.',
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
		description:
			'Data-driven insights on rental market trends and strategies to optimize your property investments.',
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
		description:
			"Learn how to use TenantFlow's analytics to make data-driven decisions and increase profitability.",
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

interface ResourceCardProps {
	resource: Resource
	className?: string
}

function ResourceCard({ resource, className }: ResourceCardProps) {
	const getCategoryIcon = (category: Resource['category']) => {
		switch (category) {
			case 'guide':
				return FileText
			case 'video':
				return Video
			case 'template':
				return Download
			case 'api':
				return Code
			case 'blog':
				return Lightbulb
			case 'webinar':
				return PlayCircle
			default:
				return BookOpen
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
			<Card
				className={`to-muted/20 group h-full cursor-pointer border-0 bg-gradient-to-br from-white transition-all duration-300 hover:shadow-xl ${
					resource.featured ? 'ring-primary/20 shadow-lg ring-2' : ''
				} ${className || ''}`}
			>
				<CardHeader className="pb-4">
					<div className="flex items-start justify-between">
						<div className="flex items-center space-x-3">
							<div
								className={`flex h-10 w-10 items-center justify-center rounded-lg ${
									resource.type === 'premium'
										? 'from-accent to-primary bg-gradient-to-br'
										: 'from-muted to-muted-foreground/20 bg-gradient-to-br'
								}`}
							>
								<CategoryIcon
									className={`h-5 w-5 ${resource.type === 'premium' ? 'text-white' : 'text-muted-foreground'}`}
								/>
							</div>
							<div>
								<div className="flex items-center space-x-2">
									{resource.featured && (
										<Badge className="from-primary to-accent bg-gradient-to-r text-xs text-white">
											Featured
										</Badge>
									)}
									{resource.isNew && (
										<Badge
											variant="secondary"
											className="text-xs"
										>
											New
										</Badge>
									)}
									{resource.type === 'premium' && (
										<Badge className="from-accent to-success bg-gradient-to-r text-xs text-white">
											Premium
										</Badge>
									)}
								</div>
							</div>
						</div>
						<div className="flex items-center space-x-1">
							<Star className="h-4 w-4 fill-current text-yellow-500" />
							<span className="text-muted-foreground text-sm">
								{resource.rating}
							</span>
						</div>
					</div>

					<CardTitle className="group-hover:text-primary text-lg leading-tight transition-colors">
						{resource.title}
					</CardTitle>
				</CardHeader>

				<CardContent className="pt-0">
					<p className="text-muted-foreground mb-4 line-clamp-3 leading-relaxed">
						{resource.description}
					</p>

					<div className="text-muted-foreground mb-4 flex items-center justify-between text-sm">
						<div className="flex items-center space-x-4">
							<div className="flex items-center space-x-1">
								<Clock className="h-4 w-4" />
								<span>{resource.readTime}</span>
							</div>
							<div className="flex items-center space-x-1">
								<Eye className="h-4 w-4" />
								<span>{resource.views}</span>
							</div>
						</div>
					</div>

					<div className="flex items-center justify-between">
						<Button
							asChild
							variant={
								resource.type === 'premium'
									? 'premium'
									: 'outline'
							}
							className="group/btn"
						>
							<Link
								href={
									resource.href ?? resource.downloadUrl ?? '#'
								}
								target={
									resource.downloadUrl ? '_blank' : undefined
								}
								rel={
									resource.downloadUrl
										? 'noopener noreferrer'
										: undefined
								}
							>
								{resource.downloadUrl ? (
									<>
										Download
										<Download className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-y-0.5" />
									</>
								) : (
									<>
										{resource.category === 'video' ||
										resource.category === 'webinar'
											? 'Watch'
											: 'Read'}
										<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
									</>
								)}
							</Link>
						</Button>
						{resource.href && (
							<Link href={resource.href}>
								<Button variant="ghost" size="sm">
									<ExternalLink className="h-4 w-4" />
								</Button>
							</Link>
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
		const matchesCategory =
			selectedCategory === 'all' || resource.category === selectedCategory
		const matchesSearch =
			resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			resource.description
				.toLowerCase()
				.includes(searchQuery.toLowerCase())
		return matchesCategory && matchesSearch
	})

	const featuredResources = resources.filter(resource => resource.featured)

	return (
		<div className="from-background to-muted/20 min-h-screen bg-gradient-to-b">
			{/* Hero Section */}
			<section className="px-4 pb-16 pt-24">
				<div className="mx-auto max-w-7xl">
					<div className="mb-16 text-center">
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6 }}
							className="mb-6"
						>
							<Badge className="from-primary via-accent to-success border-0 bg-gradient-to-r px-6 py-2 text-sm font-semibold text-white shadow-lg">
								<Sparkles className="mr-2 h-4 w-4" />
								Resource Hub
							</Badge>
						</motion.div>

						<motion.h1
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.1 }}
							className="text-foreground mb-6 text-5xl font-bold leading-tight lg:text-6xl"
						>
							Learn &{' '}
							<span className="from-primary via-accent to-success bg-gradient-to-r bg-clip-text text-transparent">
								Succeed
							</span>
						</motion.h1>

						<motion.p
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.2 }}
							className="text-muted-foreground mx-auto max-w-3xl text-xl leading-relaxed"
						>
							Everything you need to master property management.
							From setup guides to advanced strategies, templates
							to webinars - accelerate your success with our
							comprehensive resources.
						</motion.p>
					</div>

					{/* Search and Filter */}
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, delay: 0.3 }}
						className="mb-12 flex flex-col items-center justify-between gap-6 lg:flex-row"
					>
						<div className="relative max-w-md flex-1">
							<Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform" />
							<Input
								placeholder="Search resources..."
								value={searchQuery}
								onChange={(
									e: React.ChangeEvent<HTMLInputElement>
								) => setSearchQuery(e.target.value)}
								className="focus:border-primary focus:shadow-primary/10 h-12 border-2 pl-10 transition-all duration-200 focus:shadow-lg"
							/>
						</div>

						<div className="flex flex-wrap gap-2">
							{categories.map(category => {
								const Icon = category.icon
								return (
									<Button
										key={category.id}
										variant={
											selectedCategory === category.id
												? 'default'
												: 'outline'
										}
										size="sm"
										onClick={() =>
											setSelectedCategory(category.id)
										}
										className="flex items-center space-x-2"
									>
										<Icon className="h-4 w-4" />
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
				<section className="from-muted/20 to-muted/10 bg-gradient-to-r px-4 py-16">
					<div className="mx-auto max-w-7xl">
						<motion.div
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6 }}
							viewport={{ once: true }}
							className="mb-12 text-center"
						>
							<h2 className="text-foreground mb-6 text-4xl font-bold">
								Featured Resources
							</h2>
							<p className="text-muted-foreground text-xl">
								Our most popular and valuable content to help
								you get started.
							</p>
						</motion.div>

						<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
							{featuredResources.map((resource, index) => (
								<motion.div
									key={resource.id}
									initial={{ opacity: 0, y: 20 }}
									whileInView={{ opacity: 1, y: 0 }}
									transition={{
										duration: 0.5,
										delay: index * 0.1
									}}
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
			<section className="px-4 py-16">
				<div className="mx-auto max-w-7xl">
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						viewport={{ once: true }}
						className="mb-12"
					>
						<div className="flex items-center justify-between">
							<div>
								<h2 className="text-foreground mb-4 text-4xl font-bold">
									{selectedCategory === 'all'
										? 'All Resources'
										: categories.find(
												c => c.id === selectedCategory
											)?.label}
								</h2>
								<p className="text-muted-foreground">
									{filteredResources.length}{' '}
									{filteredResources.length === 1
										? 'resource'
										: 'resources'}{' '}
									found
								</p>
							</div>

							{filteredResources.length > 0 && (
								<Button
									variant="outline"
									className="flex items-center space-x-2"
								>
									<Filter className="h-4 w-4" />
									<span>Sort by Popular</span>
								</Button>
							)}
						</div>
					</motion.div>

					<AnimatePresence mode="wait">
						{filteredResources.length > 0 ? (
							<motion.div
								key="resources"
								className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
							>
								{filteredResources.map(resource => (
									<ResourceCard
										key={resource.id}
										resource={resource}
									/>
								))}
							</motion.div>
						) : (
							<motion.div
								key="no-results"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className="py-12 text-center"
							>
								<div className="bg-muted mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full">
									<HelpCircle className="text-muted-foreground h-8 w-8" />
								</div>
								<h3 className="text-foreground mb-4 text-2xl font-semibold">
									No resources found
								</h3>
								<p className="text-muted-foreground mx-auto mb-6 max-w-md">
									Try adjusting your search terms or selecting
									a different category.
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
			<section className="from-primary/5 to-accent/5 bg-gradient-to-r px-4 py-16">
				<div className="mx-auto max-w-4xl text-center">
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						viewport={{ once: true }}
					>
						<div className="mb-8">
							<div className="from-primary to-accent mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br">
								<Users className="h-8 w-8 text-white" />
							</div>
							<h2 className="text-foreground mb-6 text-4xl font-bold">
								Need More Help?
							</h2>
							<p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-xl">
								Can't find what you're looking for? Our support
								team is here to help you succeed with
								personalized guidance and expert advice.
							</p>
						</div>

						<div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
							{[
								{
									icon: MessageCircle,
									title: 'Live Chat',
									description:
										'Get instant help from our team'
								},
								{
									icon: Video,
									title: '1-on-1 Training',
									description:
										'Schedule personalized onboarding'
								},
								{
									icon: Users,
									title: 'Community Forum',
									description:
										'Connect with other property owners'
								}
							].map(option => {
								const Icon = option.icon
								return (
									<Card
										key={option.title}
										className="border-0 bg-white/80 backdrop-blur-sm"
									>
										<CardContent className="p-6 text-center">
											<div className="from-primary to-accent mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br">
												<Icon className="h-6 w-6 text-white" />
											</div>
											<h3 className="text-foreground mb-2 font-semibold">
												{option.title}
											</h3>
											<p className="text-muted-foreground text-sm">
												{option.description}
											</p>
										</CardContent>
									</Card>
								)
							})}
						</div>

						<div className="flex flex-col justify-center gap-4 sm:flex-row">
							<Button
								asChild
								variant="premium"
								size="lg"
								className="group"
							>
								<Link href="/contact">
									Contact Support
									<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
								</Link>
							</Button>
							<Button asChild variant="outline" size="lg">
								<Link href="/help">Visit Help Center</Link>
							</Button>
						</div>
					</motion.div>
				</div>
			</section>
		</div>
	)
}
