/**
 * Blog and content management types
 * All types related to blog articles, tags, and content management
 */

// Blog category enum
export type BlogCategory = 
  | 'PROPERTY_MANAGEMENT'
  | 'REAL_ESTATE'
  | 'LANDLORD_TIPS'
  | 'TENANT_RESOURCES'
  | 'LEGAL_ADVICE'
  | 'MAINTENANCE'
  | 'TECHNOLOGY'
  | 'MARKET_TRENDS'
  | 'INDUSTRY_NEWS'
  | 'COMPANY_NEWS'

export const BLOG_CATEGORY = {
  PROPERTY_MANAGEMENT: 'PROPERTY_MANAGEMENT',
  REAL_ESTATE: 'REAL_ESTATE',
  LANDLORD_TIPS: 'LANDLORD_TIPS',
  TENANT_RESOURCES: 'TENANT_RESOURCES',
  LEGAL_ADVICE: 'LEGAL_ADVICE',
  MAINTENANCE: 'MAINTENANCE',
  TECHNOLOGY: 'TECHNOLOGY',
  MARKET_TRENDS: 'MARKET_TRENDS',
  INDUSTRY_NEWS: 'INDUSTRY_NEWS',
  COMPANY_NEWS: 'COMPANY_NEWS'
} as const

export const BLOG_CATEGORY_OPTIONS = Object.values(BLOG_CATEGORY)

// Blog status enum
export type BlogStatus = 
  | 'DRAFT'
  | 'PUBLISHED'
  | 'ARCHIVED'

export const BLOG_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED'
} as const

export const BLOG_STATUS_OPTIONS = Object.values(BLOG_STATUS)

// Blog display helpers
export const getBlogCategoryLabel = (category: BlogCategory): string => {
  const labels: Record<BlogCategory, string> = {
    PROPERTY_MANAGEMENT: 'Property Management',
    REAL_ESTATE: 'Real Estate',
    LANDLORD_TIPS: 'Landlord Tips',
    TENANT_RESOURCES: 'Tenant Resources',
    LEGAL_ADVICE: 'Legal Advice',
    MAINTENANCE: 'Maintenance',
    TECHNOLOGY: 'Technology',
    MARKET_TRENDS: 'Market Trends',
    INDUSTRY_NEWS: 'Industry News',
    COMPANY_NEWS: 'Company News'
  }
  return labels[category] || category
}

export const getBlogStatusLabel = (status: BlogStatus): string => {
  const labels: Record<BlogStatus, string> = {
    DRAFT: 'Draft',
    PUBLISHED: 'Published',
    ARCHIVED: 'Archived'
  }
  return labels[status] || status
}

export const getBlogStatusColor = (status: BlogStatus): string => {
  const colors: Record<BlogStatus, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    PUBLISHED: 'bg-green-100 text-green-800',
    ARCHIVED: 'bg-yellow-100 text-yellow-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

// Blog entity types
export interface BlogArticle {
  id: string
  title: string
  slug: string
  description: string
  content: string
  excerpt: string | null
  authorId: string | null
  authorName: string
  metaTitle: string | null
  metaDescription: string | null
  ogImage: string | null
  category: BlogCategory
  status: BlogStatus
  featured: boolean
  publishedAt: Date | null
  viewCount: number
  readTime: number | null
  searchKeywords: string[]
  lastIndexed: Date | null
  createdAt: Date
  updatedAt: Date
}

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
  lastIndexed: Date | null
}

export interface BlogTag {
  id: string
  name: string
  slug: string
  color: string | null
  createdAt: Date
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
  publishedAt: Date | null
  readTime: number | null
  viewCount: number
  ogImage: string | null
  createdAt: Date
  updatedAt: Date
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
  publishedAt?: Date
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
  dateFrom?: Date
  dateTo?: Date
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
    timestamp: Date
  }[]
}

// Blog SEO data
export interface BlogSEOData {
  title: string
  description: string
  keywords: string[]
  ogImage?: string
  canonicalUrl: string
  publishedAt?: Date
  updatedAt: Date
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
