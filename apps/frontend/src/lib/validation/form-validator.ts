/**
 * Minimal frontend form validator - only basic UI validation
 * All business logic validation is handled by the backend
 */

export class FormValidator {
	/**
	 * Basic UI validation for immediate user feedback only
	 */
	static validateEmail(email: string): string | undefined {
		if (!email) {
			return 'Email is required'
		}
		if (!email.includes('@')) {
			return 'Please enter a valid email'
		}
		return undefined
	}

	static validatePassword(password: string): string | undefined {
		if (!password) {
			return 'Password is required'
		}
		if (password.length < 6) {
			return 'Password must be at least 6 characters'
		}
		return undefined
	}

	static validateRequired(
		value: unknown,
		fieldName: string
	): string | undefined {
		if (!value || (typeof value === 'string' && !value.trim())) {
			return `${fieldName} is required`
		}
		return undefined
	}

	static validatePhone(phone: string): string | undefined {
		if (!phone) {
			return undefined
		} // Phone is usually optional
		const phoneRegex = /^[\d\s\-()\\+]+$/
		if (!phoneRegex.test(phone)) {
			return 'Please enter a valid phone number'
		}
		return undefined
	}
}
