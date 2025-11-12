import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import { FAQCategoryWithQuestions } from '@repo/shared/types/faq'
import type { Database } from '@repo/shared/types/supabase-generated'
import { queryList, querySingle } from '../../shared/utils/query-helpers'

@Injectable()
export class FAQService {
	private readonly logger = new Logger(FAQService.name)
	private readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

	constructor(private readonly supabase: SupabaseService) {}

	/**
	 * Maps a database FAQ question row to the application type
	 */
	private mapQuestion(
		question: Database['public']['Tables']['faq_questions']['Row']
	) {
		// Validate required fields - separate validation for strings vs other types
		const missingFields: string[] = []

		// UUID and date fields: check null/undefined only
		if (!question.id) missingFields.push('id')
		if (!question.category_id) missingFields.push('category_id')
		if (!question.created_at) missingFields.push('created_at')
		if (!question.updated_at) missingFields.push('updated_at')

		// String content fields: check null/undefined/empty string
		if (!question.question || question.question.trim() === '') {
			missingFields.push('question')
		}
		if (!question.answer || question.answer.trim() === '') {
			missingFields.push('answer')
		}

		if (missingFields.length > 0) {
			throw new Error(
				`Invalid FAQ question data: missing required fields [${missingFields.join(', ')}]. ` +
				`Question ID: ${question.id || 'unknown'}`
			)
		}

		return {
			id: question.id!,
			categoryId: question.category_id!,
			question: question.question!,
			answer: question.answer!,
			displayOrder: question.display_order ?? 0,
			isActive: question.is_active ?? false,
			viewCount: question.view_count ?? 0,
			helpfulCount: question.helpful_count ?? 0,
			createdAt: question.created_at!,
			updatedAt: question.updated_at!
		}
	}

	/**
	 * Maps a database FAQ category row (with questions) to the application type
	 */
	private mapCategoryWithQuestions(
		category: Database['public']['Tables']['faq_categories']['Row'] & {
			faq_questions?: Database['public']['Tables']['faq_questions']['Row'][]
		}
	): FAQCategoryWithQuestions {
		// Validate required fields before mapping
		const requiredFields = {
			id: category.id,
			name: category.name,
			slug: category.slug,
			created_at: category.created_at,
			updated_at: category.updated_at
		}

		for (const [field, value] of Object.entries(requiredFields)) {
			if (!value) {
				throw new Error(`Missing required category field: ${field}`)
			}
		}

		const categoryData: FAQCategoryWithQuestions = {
			id: category.id,
			name: category.name,
			slug: category.slug,
			displayOrder: category.display_order ?? 0,
			isActive: category.is_active ?? false,
			createdAt: category.created_at || new Date().toISOString(),
			updatedAt: category.updated_at || new Date().toISOString(),
			questions: (category.faq_questions || []).map(q => this.mapQuestion(q))
		}

		// Only include description if it exists
		if (category.description) {
			categoryData.description = category.description
		}

		return categoryData
	}

	/**
	 * Get all active FAQ categories with their questions
	 */
	async getAllFAQs(): Promise<FAQCategoryWithQuestions[]> {
		const client = this.supabase.getAdminClient()

		// Get categories with questions in a single query
		const data = await queryList<
			Database['public']['Tables']['faq_categories']['Row'] & {
				faq_questions?: Database['public']['Tables']['faq_questions']['Row'][]
			}
		>(
			client
				.from('faq_categories')
				.select(
					`
                    id,
                    name,
                    slug,
                    description,
                    display_order,
                    is_active,
                    created_at,
                    updated_at,
                    faq_questions (
                        id,
                        category_id,
                        question,
                        answer,
                        display_order,
                        is_active,
                        view_count,
                        helpful_count,
                        created_at,
                        updated_at
                    )
                `
				)
				.eq('is_active', true)
				.order('display_order', { ascending: true })
				.order('faq_questions.display_order', {
					ascending: true,
					foreignTable: 'faq_questions'
				}),
			{
				resource: 'FAQ categories',
				operation: 'fetch',
				logger: this.logger
			}
		)

		// Transform the data using the mapper helper
		return data.map(category => this.mapCategoryWithQuestions(category))
	}

	/**
	 * Get a single FAQ category with its questions
	 */
	async getFAQBySlug(slug: string): Promise<FAQCategoryWithQuestions | null> {
		const client = this.supabase.getAdminClient()

		try {
			const data = await querySingle<
				Database['public']['Tables']['faq_categories']['Row'] & {
					faq_questions?: Database['public']['Tables']['faq_questions']['Row'][]
				}
			>(
				client
					.from('faq_categories')
					.select(
						`
                    id,
                    name,
                    slug,
                    description,
                    display_order,
                    is_active,
                    created_at,
                    updated_at,
                    faq_questions (
                        id,
                        category_id,
                        question,
                        answer,
                        display_order,
                        is_active,
                        view_count,
                        helpful_count,
                        created_at,
                        updated_at
                    )
                `
					)
					.eq('slug', slug)
					.eq('is_active', true)
					.order('faq_questions.display_order', {
						ascending: true,
						foreignTable: 'faq_questions'
					})
					.single(),
				{
					resource: 'FAQ category',
					operation: 'fetch by slug',
					logger: this.logger
				}
			)

			return this.mapCategoryWithQuestions(data)
		} catch (error) {
			// Return null for not found (soft failure for FAQ lookup)
			if (error instanceof HttpException && error.getStatus() === HttpStatus.NOT_FOUND) {
				return null
			}
			throw error
		}
	}

	/**
	 * Helper method to increment question metrics (views, helpful counts)
	 * Validates UUID and invokes RPC function with error handling
	 */
	private async incrementQuestionMetric(
		questionId: string,
		rpcFunction: string,
		metricName: string
	): Promise<void> {
		// Validate questionId is a valid UUID
		if (!questionId || typeof questionId !== 'string' || !this.UUID_REGEX.test(questionId)) {
			this.logger.debug(`Invalid questionId for ${metricName}`, { questionId })
			return
		}

		try {
			const client = this.supabase.getAdminClient()
			// Type assertion needed as rpcFunction is dynamically determined
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await client.rpc(rpcFunction as any, {
				question_id: questionId
			})
		} catch (error) {
			this.logger.warn(`Error ${metricName}`, {
				questionId,
				error
			})
		}
	}

	/**
	 * Increment view count for a question (for analytics)
	 */
	async incrementQuestionView(questionId: string): Promise<void> {
		return this.incrementQuestionMetric(
			questionId,
			'increment_faq_view_count',
			'incrementing question view'
		)
	}

	/**
	 * Mark a question as helpful (for analytics)
	 */
	async incrementQuestionHelpful(questionId: string): Promise<void> {
		return this.incrementQuestionMetric(
			questionId,
			'increment_faq_helpful_count',
			'marking question helpful'
		)
	}

	/**
	 * Get FAQ analytics data
	 */
	async getFAQAnalytics(): Promise<{
		totalCategories: number
		totalQuestions: number
		totalViews: number
		totalHelpful: number
		avgHelpfulRate: number
	}> {
		const client = this.supabase.getAdminClient()

		const { data, error } = await client.rpc('get_faq_analytics')

		if (error) {
			this.logger.error('Failed to fetch FAQ analytics', {
				error: error.message
			})
			throw new HttpException(
				'Failed to fetch FAQ analytics',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}

		return data?.[0]
			? {
					totalCategories: data[0].total_categories ?? 0,
					totalQuestions: data[0].total_questions ?? 0,
					totalViews: data[0].total_views ?? 0,
					totalHelpful: data[0].total_helpful ?? 0,
					avgHelpfulRate: data[0].avg_helpful_rate ?? 0
				}
			: {
					totalCategories: 0,
					totalQuestions: 0,
					totalViews: 0,
					totalHelpful: 0,
					avgHelpfulRate: 0
				}
	}
}
