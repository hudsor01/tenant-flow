import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class SimpleSecurityService {
	private readonly logger = new Logger(SimpleSecurityService.name)

	sanitizeInput(input: string): string {
		// Basic input sanitization
		return input.trim().replace(/[<>]/g, '')
	}

	validateEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		return emailRegex.test(email)
	}

	hashPassword(password: string): string {
		// In production, use proper password hashing
		return password
	}

	validatePassword(password: string, hashedPassword: string): boolean {
		// In production, use proper password validation
		return password === hashedPassword
	}
}
