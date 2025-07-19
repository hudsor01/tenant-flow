// Blog-related types for content management system

import type { 
	BlogArticle as BaseBlogArticle,
	BlogTag as BaseBlogTag
} from '@tenantflow/types'

// Frontend-specific BlogArticle with string dates for serialization
export interface BlogArticle extends Omit<BaseBlogArticle, 'publishedAt' | 'lastIndexed' | 'createdAt' | 'updatedAt' | 'category' | 'status'> {
	// Convert Date objects to strings for frontend serialization
	publishedAt: string | null
	createdAt: string
	updatedAt: string
	// Frontend uses string enums for now
	category: string
	status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
}

// Frontend-specific BlogTag with string dates
export interface BlogTag extends Omit<BaseBlogTag, 'createdAt'> {
	createdAt?: string // Make optional for frontend
color: string | null
}

// Blog types
export type BlogCategory = string
export type BlogStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

// Enhanced blog article with relationships
export interface BlogArticleWithDetails extends BlogArticle {
author?: {
id: string
name: string | null
avatarUrl: string | null
}
tags: BlogTag[]
_count?: {
tags: number
}
}

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
topCategories: {
category: BlogCategory
count: number
}[]
recentActivity: {
id: string
title: string
action: 'created' | 'updated' | 'published'
timestamp: string
}[]
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
	category: string
	readTime?: number
}

// Blog tag input
export interface BlogTagInput {
	name: string
	slug: string
	color?: string
}
