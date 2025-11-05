/**
 * FAQ Types
 * Shared types for FAQ functionality across frontend and backend
 */

export interface FAQCategory {
    id: string
    name: string
    slug: string
    description?: string
    displayOrder: number
    isActive: boolean
    createdAt: string
    updatedAt: string
}

export interface FAQQuestion {
    id: string
    categoryId: string
    question: string
    answer: string
    displayOrder: number
    isActive: boolean
    viewCount: number
    helpfulCount: number
    createdAt: string
    updatedAt: string
}

export interface FAQCategoryWithQuestions extends FAQCategory {
    questions: FAQQuestion[]
}

export interface FAQAnalytics {
    totalCategories: number
    totalQuestions: number
    totalViews: number
    totalHelpful: number
    avgHelpfulRate: number
}