/**
 * Password Service
 *
 * Handles password validation and strength checking.
 * Extracted from UtilityService for single responsibility.
 */

import { Injectable } from '@nestjs/common'
import { AppLogger } from '../../logger/app-logger.service'

export interface PasswordValidationResult {
	isValid: boolean
	score: number
	feedback: string[]
	requirements: {
		minLength: boolean
		hasUppercase: boolean
		hasLowercase: boolean
		hasNumbers: boolean
		hasSpecialChars: boolean
	}
}

@Injectable()
export class PasswordService {
	constructor(private readonly logger: AppLogger) {}

	/**
	 * Validate password strength
	 * Uses native JavaScript instead of database function
	 */
	validatePasswordStrength(password: string): PasswordValidationResult {
		try {
			this.logger.debug('Validating password strength')

			if (!password) {
				return {
					isValid: false,
					score: 0,
					feedback: ['Password is required'],
					requirements: {
						minLength: false,
						hasUppercase: false,
						hasLowercase: false,
						hasNumbers: false,
						hasSpecialChars: false
					}
				}
			}

			// Check requirements
			const requirements = {
				minLength: password.length >= 8,
				hasUppercase: /[A-Z]/.test(password),
				hasLowercase: /[a-z]/.test(password),
				hasNumbers: /\d/.test(password),
				hasSpecialChars: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
			}

			// Calculate score (0-100)
			let score = 0
			if (requirements.minLength) score += 20
			if (requirements.hasUppercase) score += 20
			if (requirements.hasLowercase) score += 20
			if (requirements.hasNumbers) score += 20
			if (requirements.hasSpecialChars) score += 20

			// Bonus points for length
			if (password.length >= 12) score += 10
			if (password.length >= 16) score += 10

			// Penalty for common patterns
			if (/(.)\1{2,}/.test(password)) score -= 10 // Repeated characters
			if (/123|abc|qwe|password|admin/i.test(password)) score -= 20 // Common patterns

			// Ensure score stays within bounds
			score = Math.max(0, Math.min(100, score))

			// Generate feedback
			const feedback: string[] = []
			if (!requirements.minLength)
				feedback.push('Password must be at least 8 characters long')
			if (!requirements.hasUppercase)
				feedback.push('Password must contain at least one uppercase letter')
			if (!requirements.hasLowercase)
				feedback.push('Password must contain at least one lowercase letter')
			if (!requirements.hasNumbers)
				feedback.push('Password must contain at least one number')
			if (!requirements.hasSpecialChars)
				feedback.push('Password must contain at least one special character')

			if (password.length < 12)
				feedback.push('Consider using a longer password (12+ characters)')
			if (/(.)\1{2,}/.test(password))
				feedback.push('Avoid repeating the same character multiple times')
			if (/123|abc|qwe|password|admin/i.test(password))
				feedback.push('Avoid common patterns and words')

			// Determine if password is valid (meets basic requirements)
			const isValid = Object.values(requirements).every(req => req)

			return {
				isValid,
				score,
				feedback:
					feedback.length > 0 ? feedback : ['Password meets all requirements'],
				requirements
			}
		} catch (error) {
			this.logger.error('Failed to validate password strength', {
				error: error instanceof Error ? error.message : String(error)
			})

			return {
				isValid: false,
				score: 0,
				feedback: ['Error validating password'],
				requirements: {
					minLength: false,
					hasUppercase: false,
					hasLowercase: false,
					hasNumbers: false,
					hasSpecialChars: false
				}
			}
		}
	}
}
