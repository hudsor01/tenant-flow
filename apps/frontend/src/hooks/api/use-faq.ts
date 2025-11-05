import { useQuery } from '@tanstack/react-query'
import type { FAQCategoryWithQuestions } from '@repo/shared/types/faq'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'FAQHooks' })

/**
 * FAQ API Hooks
 * Provides React Query hooks for FAQ data fetching
 */

const FAQ_KEYS = {
	all: ['faq'] as const,
	categories: () => [...FAQ_KEYS.all, 'categories'] as const,
	category: (slug: string) => [...FAQ_KEYS.all, 'category', slug] as const,
	analytics: () => [...FAQ_KEYS.all, 'analytics'] as const
}

/**
 * Hook to fetch all FAQ categories with their questions
 */
export function useFAQs() {
	return useQuery({
		queryKey: FAQ_KEYS.categories(),
		queryFn: async (): Promise<FAQCategoryWithQuestions[]> => {
			const response = await fetch('/api/v1/faq')
			if (!response.ok) {
				throw new Error('Failed to fetch FAQs')
			}
			return response.json()
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000 // 10 minutes
	})
}

/**
 * Hook to fetch a specific FAQ category by slug
 */
export function useFAQCategory(slug: string) {
	return useQuery({
		queryKey: FAQ_KEYS.category(slug),
		queryFn: async (): Promise<FAQCategoryWithQuestions | null> => {
			const response = await fetch(`/api/v1/faq/category/${slug}`)
			if (response.status === 404) {
				return null
			}
			if (!response.ok) {
				throw new Error('Failed to fetch FAQ category')
			}
			return response.json()
		},
		enabled: !!slug,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000
	})
}

/**
 * Track FAQ question view (fire and forget)
 */
export async function trackQuestionView(questionId: string): Promise<void> {
	try {
		await fetch(`/api/v1/faq/question/${questionId}/view`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			}
		})
	} catch (error) {
		// Silently fail for analytics tracking
		logger.warn('Failed to track question view', { error })
	}
}

/**
 * Mark FAQ question as helpful (fire and forget)
 */
export async function markQuestionHelpful(questionId: string): Promise<void> {
	try {
		await fetch(`/api/v1/faq/question/${questionId}/helpful`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			}
		})
	} catch (error) {
		// Silently fail for analytics tracking
		logger.warn('Failed to mark question helpful', { error })
	}
}
