/**
 * Blog and content management types
 * All types related to blog articles, tags, and content management
 */

import type { Database } from './supabase-generated.js'

// Use Supabase BlogCategory enum instead of custom duplicate
export type BlogCategory = Database['public']['Enums']['BlogCategory']

export const BLOG_CATEGORY = {
	PROPERTY_MANAGEMENT: 'PROPERTY_MANAGEMENT',
	LEGAL_COMPLIANCE: 'LEGAL_COMPLIANCE',
	FINANCIAL_MANAGEMENT: 'FINANCIAL_MANAGEMENT',
	PROPERTY_MAINTENANCE: 'PROPERTY_MAINTENANCE',
	SOFTWARE_REVIEWS: 'SOFTWARE_REVIEWS',
	TENANT_RELATIONS: 'TENANT_RELATIONS',
	MARKETING: 'MARKETING',
	REAL_ESTATE_INVESTMENT: 'REAL_ESTATE_INVESTMENT',
	TAX_PLANNING: 'TAX_PLANNING',
	AUTOMATION: 'AUTOMATION'
} as const

export const BLOG_CATEGORY_OPTIONS = Object.values(BLOG_CATEGORY)

// Use Supabase BlogStatus enum instead of custom duplicate
export type BlogStatus = Database['public']['Enums']['BlogStatus']

export const BLOG_STATUS = {
	DRAFT: 'DRAFT',
	PUBLISHED: 'PUBLISHED',
	ARCHIVED: 'ARCHIVED',
	SCHEDULED: 'SCHEDULED'
} as const

export const BLOG_STATUS_OPTIONS = Object.values(BLOG_STATUS)

// Blog display helpers
export const getBlogCategoryLabel = (category: BlogCategory): string => {
	const labels: Record<BlogCategory, string> = {
		PROPERTY_MANAGEMENT: 'Property Management',
		LEGAL_COMPLIANCE: 'Legal Compliance',
		FINANCIAL_MANAGEMENT: 'Financial Management',
		PROPERTY_MAINTENANCE: 'Property Maintenance',
		SOFTWARE_REVIEWS: 'Software Reviews',
		TENANT_RELATIONS: 'Tenant Relations',
		MARKETING: 'Marketing',
		REAL_ESTATE_INVESTMENT: 'Real Estate Investment',
		TAX_PLANNING: 'Tax Planning',
		AUTOMATION: 'Automation'
	}
	return labels[category] || category
}

export const getBlogStatusLabel = (status: BlogStatus): string => {
	const labels: Record<BlogStatus, string> = {
		DRAFT: 'Draft',
		PUBLISHED: 'Published',
		ARCHIVED: 'Archived',
		SCHEDULED: 'Scheduled'
	}
	return labels[status] || status
}

export const getBlogStatusColor = (status: BlogStatus): string => {
	const colors: Record<BlogStatus, string> = {
		DRAFT: 'bg-gray-100 text-gray-800',
		PUBLISHED: 'bg-green-100 text-green-800',
		ARCHIVED: 'bg-yellow-100 text-yellow-800',
		SCHEDULED: 'bg-blue-100 text-blue-800'
	}
	return colors[status] || 'bg-gray-100 text-gray-800'
}

// Use Supabase table types instead of duplicating
export type BlogArticle = Database['public']['Tables']['BlogArticle']['Row']

export interface BlogArticleWithDetails extends Omit<BlogArticle, 'tags'> {
	author?: {
		id: string
		name: string | null
		avatarUrl: string | null
	}
	tags: BlogTag[]
	count?: {
		tags: number
	}
	description: string
	authorName: string
	readTime: number | null
	ogImage: string | null
	featured: boolean
	viewCount: number
	metaTitle: string | null
	metaDescription: string | null
	searchKeywords: string[]
	lastIndexed: string | null
}

export type BlogTag = Database['public']['Tables']['BlogTag']['Row']

// Blog article list item for efficient loading
export interface BlogArticleListItem {
	id: string
	title: string
	slug: string
	description: string
	excerpt: string | null
	authorName: string
	category: BlogCategory
	status: BlogStatus
	featured: boolean
	publishedAt: string | null
	readTime: number | null
	viewCount: number
	ogImage: string | null
	createdAt: string
	updatedAt: string
	tags: BlogTag[]
}

// Blog article creation/update input
export interface BlogArticleInput {
	title: string
	slug: string
	description: string
	content: string
	excerpt?: string
	authorName: string
	metaTitle?: string
	metaDescription?: string
	ogImage?: string
	category: BlogCategory
	tagIds?: string[]
	status: BlogStatus
	featured?: boolean
	publishedAt?: string
	readTime?: number
	searchKeywords?: string[]
}

// Blog filtering and search
export interface BlogFilters {
	category?: BlogCategory
	status?: BlogStatus
	featured?: boolean
	tags?: string[]
	authorId?: string
	search?: string
	dateFrom?: string
	dateTo?: string
}

// Blog pagination
export interface BlogPagination {
	page: number
	limit: number
	total?: number
	hasMore?: boolean
}

// Blog analytics
export interface BlogAnalytics {
	totalArticles: number
	publishedArticles: number
	draftArticles: number
	totalViews: number
	averageReadTime: number
	topCategories: Array<{
		category: BlogCategory
		count: number
	}>
	recentActivity: Array<{
		id: string
		title: string
		action: 'created' | 'updated' | 'published'
		timestamp: string
	}>
}

// Blog SEO data
export interface BlogSEOData {
	title: string
	description: string
	keywords: string[]
	ogImage?: string
	canonicalUrl: string
	publishedAt?: string
	updatedAt: string
	author: string
	category: BlogCategory
	readTime?: number
}

// Blog tag input
export interface BlogTagInput {
	name: string
	slug: string
	color?: string
}
