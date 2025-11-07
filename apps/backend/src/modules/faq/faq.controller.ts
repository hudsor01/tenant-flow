import {
	Controller,
	Get,
	Param,
	Post,
	HttpStatus,
	HttpException,
	BadRequestException,
	Logger,
	ParseUUIDPipe
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { FAQService } from './faq.service'
import { FAQCategoryWithQuestions } from '@repo/shared/types/faq'

/**
 * Regex for validating URL-safe slugs (lowercase letters, numbers, hyphens)
 */
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

@Controller('api/v1/faq')
export class FAQController {
	private readonly logger = new Logger(FAQController.name)

	constructor(private readonly faqService: FAQService) {}

	/**
	 * Get all FAQ categories with their questions
	 * Used by the public FAQ page
	 */
	@Get()
	async getAllFAQs(): Promise<FAQCategoryWithQuestions[]> {
		try {
			const faqs = await this.faqService.getAllFAQs()
			return faqs
		} catch (error) {
			this.logger.error('Failed to fetch FAQs', error)
			throw new HttpException(
				'Failed to load FAQ content',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	/**
	 * Get a specific FAQ category by slug
	 * Useful for deep linking to specific FAQ sections
	 */
	@Get('category/:slug')
	async getFAQBySlug(
		@Param('slug') slug: string
	): Promise<FAQCategoryWithQuestions | null> {
		// Validate slug format
		if (!SLUG_REGEX.test(slug)) {
			throw new BadRequestException(
				'Slug must contain only lowercase letters, numbers, and hyphens'
			)
		}

		try {
			const faq = await this.faqService.getFAQBySlug(slug)
			if (!faq) {
				throw new HttpException('FAQ category not found', HttpStatus.NOT_FOUND)
			}
			return faq
		} catch (error) {
			if (error instanceof HttpException) throw error
			this.logger.error('Failed to fetch FAQ by slug', { slug, error })
			throw new HttpException(
				'Failed to load FAQ content',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	/**
	 * Track question views for analytics
	 * Rate limited to prevent abuse (10 requests per minute)
	 */
	@Post('question/:questionId/view')
	@Throttle({ default: { limit: 10, ttl: 60000 } })
	async trackQuestionView(
		@Param('questionId', ParseUUIDPipe) questionId: string
	): Promise<{ success: boolean }> {
		try {
			await this.faqService.incrementQuestionView(questionId)
			return { success: true }
		} catch (error) {
			this.logger.error('Failed to track question view', { questionId, error })
			// Don't fail the request for analytics tracking
			return { success: false }
		}
	}

	/**
	 * Mark question as helpful for analytics
	 * Rate limited to prevent abuse (5 requests per minute)
	 */
	@Post('question/:questionId/helpful')
	@Throttle({ default: { limit: 5, ttl: 60000 } })
	async markQuestionHelpful(
		@Param('questionId', ParseUUIDPipe) questionId: string
	): Promise<{ success: boolean }> {
		try {
			await this.faqService.incrementQuestionHelpful(questionId)
			return { success: true }
		} catch (error) {
			this.logger.error('Failed to mark question helpful', {
				questionId,
				error
			})
			// Don't fail the request for analytics tracking
			return { success: false }
		}
	}
}
