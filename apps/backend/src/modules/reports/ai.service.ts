/**
 * AI Service
 * Phase 5: Advanced Features - AI-powered rent prediction
 *
 * Uses OpenAI to predict optimal rent prices based on property data
 */

import { Injectable, Logger } from '@nestjs/common'
import OpenAI from 'openai'
import { AppConfigService } from '../../config/app-config.service'

export interface RentPredictionRequest {
	property_id: string
	address: string
	city: string
	state: string
	zip_code: string
	bedrooms: number
	bathrooms: number
	square_feet: number
	year_built?: number
	property_type: string
	amenities?: string[]
}

export interface RentPredictionResponse {
	predicted_rent: number
	confidence_score: number
	range_low: number
	range_high: number
	market_insights: string
	factors: Array<{
		factor: string
		impact: 'positive' | 'negative' | 'neutral'
		description: string
	}>
}

@Injectable()
export class AiService {
	private readonly logger = new Logger(AiService.name)
	private openai: OpenAI | null = null

	constructor(private readonly config: AppConfigService) {
		const apiKey = this.config.getOpenAiApiKey()
		if (apiKey) {
			this.openai = new OpenAI({ apiKey })
		} else {
			this.logger.warn('OpenAI API key not configured, AI features will be disabled')
		}
	}

	/**
	 * Predict optimal rent price for a property
	 */
	async predictRent(request: RentPredictionRequest): Promise<RentPredictionResponse> {
		if (!this.openai) {
			throw new Error('OpenAI service not configured')
		}

		try {
			const prompt = this.buildRentPredictionPrompt(request)

			const completion = await this.openai.chat.completions.create({
				model: 'gpt-4o-mini', // Cost-effective model for predictions
				messages: [
					{
						role: 'system',
						content: 'You are a real estate market analyst specializing in rent pricing. Provide accurate, data-driven rent predictions based on property characteristics and market conditions. Always respond with valid JSON.'
					},
					{
						role: 'user',
						content: prompt
					}
				],
				temperature: 0.3, // Lower temperature for more consistent predictions
				response_format: { type: 'json_object' }
			})

			const content = completion.choices[0]?.message?.content
			if (!content) {
				throw new Error('No response from OpenAI')
			}

			const prediction = JSON.parse(content) as RentPredictionResponse

			// Validate the response structure
			this.validatePredictionResponse(prediction)

			return prediction
		} catch (error) {
			this.logger.error('Failed to predict rent', error)
			throw new Error('Unable to generate rent prediction at this time')
		}
	}

	private buildRentPredictionPrompt(request: RentPredictionRequest): string {
		return `Analyze this property and provide a rent prediction:

Property Details:
- Address: ${request.address}, ${request.city}, ${request.state} ${request.zip_code}
- Bedrooms: ${request.bedrooms}
- Bathrooms: ${request.bathrooms}
- Square Feet: ${request.square_feet}
- Year Built: ${request.year_built || 'Unknown'}
- Property Type: ${request.property_type}
- Amenities: ${request.amenities?.join(', ') || 'None specified'}

Please provide a JSON response with the following structure:
{
  "predicted_rent": <number - monthly rent in dollars>,
  "confidence_score": <number 0-100 - how confident you are in this prediction>,
  "range_low": <number - lower bound of rent range>,
  "range_high": <number - upper bound of rent range>,
  "market_insights": "<string - brief market analysis>",
  "factors": [
    {
      "factor": "<string - factor name>",
      "impact": "<positive|negative|neutral>",
      "description": "<string - explanation>"
    }
  ]
}

Consider current market conditions, location desirability, property features, and comparable rentals. Base predictions on real market data patterns.`
	}

	private validatePredictionResponse(prediction: RentPredictionResponse): void {
		if (typeof prediction !== 'object' || prediction === null) {
			throw new Error('Invalid prediction response format')
		}

		const requiredFields = ['predicted_rent', 'confidence_score', 'range_low', 'range_high', 'market_insights', 'factors']
		for (const field of requiredFields) {
			if (!(field in prediction)) {
				throw new Error(`Missing required field: ${field}`)
			}
		}

		if (typeof prediction.predicted_rent !== 'number' || prediction.predicted_rent <= 0) {
			throw new Error('Invalid predicted_rent value')
		}

		if (typeof prediction.confidence_score !== 'number' || prediction.confidence_score < 0 || prediction.confidence_score > 100) {
			throw new Error('Invalid confidence_score value')
		}

		if (!Array.isArray(prediction.factors)) {
			throw new Error('Invalid factors array')
		}
	}
}