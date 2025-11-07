import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import { FAQCategoryWithQuestions } from '@repo/shared/types/faq'
import type { Database } from '@repo/shared/types/supabase-generated'

@Injectable()
export class FAQService {
	private readonly logger = new Logger(FAQService.name)

	constructor(private readonly supabase: SupabaseService) {}

	/**
	 * Get all active FAQ categories with their questions
	 */
	async getAllFAQs(): Promise<FAQCategoryWithQuestions[]> {
		try {
			const client = this.supabase.getAdminClient()

			// Get categories with questions in a single query
			const { data, error } = await client
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
				})

			if (error) {
				this.logger.error('Failed to fetch FAQs', { error: error.message })
				throw new HttpException(
					'Failed to fetch FAQs',
					HttpStatus.INTERNAL_SERVER_ERROR
				)
			}

			// Transform the data to match our types
			const categories: FAQCategoryWithQuestions[] = (data || []).map(
				(
					category: Database['public']['Tables']['faq_categories']['Row'] & {
						faq_questions: Database['public']['Tables']['faq_questions']['Row'][]
					}
				) => {
					const categoryData: FAQCategoryWithQuestions = {
						id: category.id,
						name: category.name,
						slug: category.slug,
						displayOrder: category.display_order ?? 0,
						isActive: category.is_active ?? false,
						createdAt: category.created_at ?? '',
						updatedAt: category.updated_at ?? '',
						questions: (category.faq_questions || []).map(
							(
								question: Database['public']['Tables']['faq_questions']['Row']
							) => ({
								id: question.id,
								categoryId: question.category_id ?? '',
								question: question.question ?? '',
								answer: question.answer ?? '',
								displayOrder: question.display_order ?? 0,
								isActive: question.is_active ?? false,
								viewCount: question.view_count ?? 0,
								helpfulCount: question.helpful_count ?? 0,
								createdAt: question.created_at ?? '',
								updatedAt: question.updated_at ?? ''
							})
						)
					}

					// Only include description if it exists
					if (category.description) {
						categoryData.description = category.description
					}

					return categoryData
				}
			)

			return categories
		} catch (error) {
			this.logger.error('Failed to fetch FAQs', { error })
			throw new HttpException(
				'Failed to fetch FAQs',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	/**
	 * Get a single FAQ category with its questions
	 */
	async getFAQBySlug(slug: string): Promise<FAQCategoryWithQuestions | null> {
		try {
			const client = this.supabase.getAdminClient()

			const { data, error } = await client
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
				.single()

			if (error) {
				if (error.code === 'PGRST116') return null
				this.logger.error('Failed to fetch FAQ by slug', {
					error: error.message,
					slug
				})
				throw new HttpException(
					error.message || 'Failed to fetch FAQ category',
					HttpStatus.INTERNAL_SERVER_ERROR
				)
			}
			const categoryData: FAQCategoryWithQuestions = {
				id: data.id ?? '',
				name: data.name ?? '',
				slug: data.slug ?? '',
				displayOrder: data.display_order ?? 0,
				isActive: data.is_active ?? false,
				createdAt: data.created_at ?? '',
				updatedAt: data.updated_at ?? '',
				questions: (data.faq_questions || []).map(
					(question: Database['public']['Tables']['faq_questions']['Row']) => ({
						id: question.id ?? '',
						categoryId: question.category_id ?? '',
						question: question.question ?? '',
						answer: question.answer ?? '',
						displayOrder: question.display_order ?? 0,
						isActive: question.is_active ?? false,
						viewCount: question.view_count ?? 0,
						helpfulCount: question.helpful_count ?? 0,
						createdAt: question.created_at ?? '',
						updatedAt: question.updated_at ?? ''
					})
				)
			}

			// Only include description if it exists
			if (data.description) {
				categoryData.description = data.description
			}

			return categoryData
		} catch (error) {
			this.logger.error('Failed to fetch FAQ by slug', { error, slug })
			throw new HttpException(
				'Failed to fetch FAQ',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	/**
	 * Increment view count for a question (for analytics)
	 */
	async incrementQuestionView(questionId: string): Promise<void> {
		try {
			const client = this.supabase.getAdminClient()

			const { error } = await client.rpc('increment_faq_view_count', {
				question_id: questionId
			})

			if (error) {
				this.logger.warn('Failed to increment view count', {
					questionId,
					error
				})
			}
		} catch (error) {
			this.logger.warn('Error incrementing question view', {
				questionId,
				error
			})
		}
	}

	/**
	 * Mark a question as helpful (for analytics)
	 */
	async incrementQuestionHelpful(questionId: string): Promise<void> {
		try {
			const client = this.supabase.getAdminClient()

			const { error } = await client.rpc('increment_faq_helpful_count', {
				question_id: questionId
			})

			if (error) {
				this.logger.warn('Failed to increment helpful count', {
					questionId,
					error
				})
			}
		} catch (error) {
			this.logger.warn('Error marking question helpful', { questionId, error })
		}
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
		try {
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
		} catch (error) {
			this.logger.error('Failed to fetch FAQ analytics', { error })
			throw new HttpException(
				'Failed to fetch FAQ analytics',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}
}
