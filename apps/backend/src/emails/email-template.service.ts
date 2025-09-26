import { Injectable } from '@nestjs/common'
import { EmailParams, emailTemplates } from './email-templates'

interface EmailTemplateResult {
	to: string
	subject: string
	html: string
}

@Injectable()
export class EmailTemplateService {
	/**
	 * Render an email template with the given parameters
	 */
	renderTemplate(
		templateName: keyof typeof emailTemplates,
		params: EmailParams
	): EmailTemplateResult {
		const template = emailTemplates[templateName]
		if (!template) {
			throw new Error(`Template '${templateName}' not found`)
		}
		return template(params)
	}

	/**
	 * Get available template names
	 */
	getAvailableTemplates(): string[] {
		return Object.keys(emailTemplates)
	}

	/**
	 * Validate template parameters
	 */
	validateTemplateParams(
		templateName: keyof typeof emailTemplates,
		params: EmailParams
	): boolean {
		const template = emailTemplates[templateName]
		if (!template) {
			return false
		}

		// Basic validation - check if required fields are present
		switch (templateName) {
			case 'subscriptionCreated':
				return !!(params.to && params.planName && params.amount)
			case 'subscriptionCancelled':
				return !!(params.to && params.planName)
			case 'paymentFailed':
				return !!(params.to && params.planName)
			case 'trialEndingSoon':
				return !!(params.to && params.planName && params.trialEndDate)
			default:
				return true
		}
	}
}
