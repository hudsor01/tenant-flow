/**
 * Blog and content management types
 * All types related to blog articles, tags, and content management
 */
export type BlogCategory = 'PROPERTY_MANAGEMENT' | 'REAL_ESTATE' | 'LANDLORD_TIPS' | 'TENANT_RESOURCES' | 'LEGAL_ADVICE' | 'MAINTENANCE' | 'TECHNOLOGY' | 'MARKET_TRENDS' | 'INDUSTRY_NEWS' | 'COMPANY_NEWS';
export declare const BLOG_CATEGORY: {
    readonly PROPERTY_MANAGEMENT: "PROPERTY_MANAGEMENT";
    readonly REAL_ESTATE: "REAL_ESTATE";
    readonly LANDLORD_TIPS: "LANDLORD_TIPS";
    readonly TENANT_RESOURCES: "TENANT_RESOURCES";
    readonly LEGAL_ADVICE: "LEGAL_ADVICE";
    readonly MAINTENANCE: "MAINTENANCE";
    readonly TECHNOLOGY: "TECHNOLOGY";
    readonly MARKET_TRENDS: "MARKET_TRENDS";
    readonly INDUSTRY_NEWS: "INDUSTRY_NEWS";
    readonly COMPANY_NEWS: "COMPANY_NEWS";
};
export declare const BLOG_CATEGORY_OPTIONS: ("MAINTENANCE" | "PROPERTY_MANAGEMENT" | "REAL_ESTATE" | "LANDLORD_TIPS" | "TENANT_RESOURCES" | "LEGAL_ADVICE" | "TECHNOLOGY" | "MARKET_TRENDS" | "INDUSTRY_NEWS" | "COMPANY_NEWS")[];
export type BlogStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export declare const BLOG_STATUS: {
    readonly DRAFT: "DRAFT";
    readonly PUBLISHED: "PUBLISHED";
    readonly ARCHIVED: "ARCHIVED";
};
export declare const BLOG_STATUS_OPTIONS: ("DRAFT" | "PUBLISHED" | "ARCHIVED")[];
export declare const getBlogCategoryLabel: (category: BlogCategory) => string;
export declare const getBlogStatusLabel: (status: BlogStatus) => string;
export declare const getBlogStatusColor: (status: BlogStatus) => string;
export interface BlogArticle {
    id: string;
    title: string;
    slug: string;
    description: string;
    content: string;
    excerpt: string | null;
    authorId: string | null;
    authorName: string;
    metaTitle: string | null;
    metaDescription: string | null;
    ogImage: string | null;
    category: BlogCategory;
    status: BlogStatus;
    featured: boolean;
    publishedAt: Date | null;
    viewCount: number;
    readTime: number | null;
    searchKeywords: string[];
    lastIndexed: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface BlogArticleWithDetails extends Omit<BlogArticle, 'tags'> {
    author?: {
        id: string;
        name: string | null;
        avatarUrl: string | null;
    };
    tags: BlogTag[];
    count?: {
        tags: number;
    };
    description: string;
    authorName: string;
    readTime: number | null;
    ogImage: string | null;
    featured: boolean;
    viewCount: number;
    metaTitle: string | null;
    metaDescription: string | null;
    searchKeywords: string[];
    lastIndexed: Date | null;
}
export interface BlogTag {
    id: string;
    name: string;
    slug: string;
    color: string | null;
    createdAt: Date;
}
export interface BlogArticleListItem {
    id: string;
    title: string;
    slug: string;
    description: string;
    excerpt: string | null;
    authorName: string;
    category: BlogCategory;
    status: BlogStatus;
    featured: boolean;
    publishedAt: Date | null;
    readTime: number | null;
    viewCount: number;
    ogImage: string | null;
    createdAt: Date;
    updatedAt: Date;
    tags: BlogTag[];
}
export interface BlogArticleInput {
    title: string;
    slug: string;
    description: string;
    content: string;
    excerpt?: string;
    authorName: string;
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: string;
    category: BlogCategory;
    tagIds?: string[];
    status: BlogStatus;
    featured?: boolean;
    publishedAt?: Date;
    readTime?: number;
    searchKeywords?: string[];
}
export interface BlogFilters {
    category?: BlogCategory;
    status?: BlogStatus;
    featured?: boolean;
    tags?: string[];
    authorId?: string;
    search?: string;
    dateFrom?: Date;
    dateTo?: Date;
}
export interface BlogPagination {
    page: number;
    limit: number;
    total?: number;
    hasMore?: boolean;
}
export interface BlogAnalytics {
    totalArticles: number;
    publishedArticles: number;
    draftArticles: number;
    totalViews: number;
    averageReadTime: number;
    topCategories: {
        category: BlogCategory;
        count: number;
    }[];
    recentActivity: {
        id: string;
        title: string;
        action: 'created' | 'updated' | 'published';
        timestamp: Date;
    }[];
}
export interface BlogSEOData {
    title: string;
    description: string;
    keywords: string[];
    ogImage?: string;
    canonicalUrl: string;
    publishedAt?: Date;
    updatedAt: Date;
    author: string;
    category: BlogCategory;
    readTime?: number;
}
export interface BlogTagInput {
    name: string;
    slug: string;
    color?: string;
}
//# sourceMappingURL=blog.d.ts.map