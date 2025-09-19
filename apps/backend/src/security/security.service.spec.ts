import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing'
import { SilentLogger } from '../__test__/silent-logger'
import { SimpleSecurityService } from './security.service'

describe('SimpleSecurityService', () => {
	let service: SimpleSecurityService

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [SimpleSecurityService],
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<SimpleSecurityService>(SimpleSecurityService)
	})

	describe('sanitizeInput', () => {
		it('should remove leading and trailing whitespace', () => {
			const input = '  hello world  '
			const result = service.sanitizeInput(input)
			expect(result).toBe('hello world')
		})

		it('should remove HTML-like angle brackets', () => {
			const input = 'hello <script>alert("xss")</script> world'
			const result = service.sanitizeInput(input)
			expect(result).toBe('hello scriptalert("xss")/script world')
		})

		it('should remove opening and closing angle brackets separately', () => {
			const input = 'test < and > symbols'
			const result = service.sanitizeInput(input)
			expect(result).toBe('test  and  symbols')
		})

		it('should handle multiple angle brackets', () => {
			const input = '<<>>test<<>>'
			const result = service.sanitizeInput(input)
			expect(result).toBe('test')
		})

		it('should handle empty string', () => {
			const result = service.sanitizeInput('')
			expect(result).toBe('')
		})

		it('should handle string with only whitespace', () => {
			const result = service.sanitizeInput('   ')
			expect(result).toBe('')
		})

		it('should preserve other special characters', () => {
			const input = '  hello@world.com #test $100 %discount  '
			const result = service.sanitizeInput(input)
			expect(result).toBe('hello@world.com #test $100 %discount')
		})

		it('should handle mixed content with whitespace and brackets', () => {
			const input = '  <div>Hello World</div>  '
			const result = service.sanitizeInput(input)
			expect(result).toBe('divHello World/div')
		})
	})

	describe('validateEmail', () => {
		it('should validate correct email formats', () => {
			const validEmails = [
				'test@example.com',
				'user.name@domain.co.uk',
				'first.last+tag@example.org',
				'test123@test123.com',
				'a@b.co',
				'user_name@domain.com',
				'user-name@domain-name.com'
			]

			validEmails.forEach(email => {
				expect(service.validateEmail(email)).toBe(true)
			})
		})

		it('should reject invalid email formats', () => {
			const invalidEmails = [
				'',
				'invalid',
				'@domain.com',
				'user@',
				'user@@domain.com',
				'user@domain',
				'user.domain.com',
				'user @domain.com',
				'user@domain .com',
				'user@.com',
				'user@domain.',
				'us er@domain.com'
			]

			invalidEmails.forEach(email => {
				expect(service.validateEmail(email)).toBe(false)
			})
		})

		it('should handle edge cases for email validation', () => {
			// These emails pass the current regex but might be considered edge cases
			expect(service.validateEmail('.user@domain.com')).toBe(true) // Current regex allows leading dot
			expect(service.validateEmail('user.@domain.com')).toBe(true) // Current regex allows trailing dot
		})

		it('should validate minimal email formats', () => {
			// These are technically valid according to the regex
			expect(service.validateEmail('a@b.c')).toBe(true)
			
			// These should be invalid
			expect(service.validateEmail('user@')).toBe(false)
			expect(service.validateEmail('@domain.com')).toBe(false)
		})

		it('should be case insensitive', () => {
			expect(service.validateEmail('User@Domain.COM')).toBe(true)
			expect(service.validateEmail('USER@DOMAIN.COM')).toBe(true)
		})
	})

	describe('hashPassword', () => {
		it('should return the password unchanged (placeholder implementation)', () => {
			const password = 'testPassword123'
			const result = service.hashPassword(password)
			expect(result).toBe(password)
		})

		it('should handle empty password', () => {
			const result = service.hashPassword('')
			expect(result).toBe('')
		})

		it('should handle special characters in password', () => {
			const password = 'p@ssW0rd!#$%'
			const result = service.hashPassword(password)
			expect(result).toBe(password)
		})

		it('should handle whitespace in password', () => {
			const password = ' password with spaces '
			const result = service.hashPassword(password)
			expect(result).toBe(password)
		})
	})

	describe('validatePassword', () => {
		it('should validate correct password against hash (placeholder implementation)', () => {
			const password = 'testPassword123'
			const hashedPassword = 'testPassword123' // Same since it's not actually hashed
			
			const result = service.validatePassword(password, hashedPassword)
			expect(result).toBe(true)
		})

		it('should reject incorrect password against hash', () => {
			const password = 'testPassword123'
			const wrongPassword = 'wrongPassword123'
			
			const result = service.validatePassword(wrongPassword, password)
			expect(result).toBe(false)
		})

		it('should handle empty passwords', () => {
			expect(service.validatePassword('', '')).toBe(true)
			expect(service.validatePassword('password', '')).toBe(false)
			expect(service.validatePassword('', 'password')).toBe(false)
		})

		it('should be case sensitive', () => {
			const password = 'TestPassword'
			const wrongCase = 'testpassword'
			
			const result = service.validatePassword(wrongCase, password)
			expect(result).toBe(false)
		})

		it('should handle special characters and whitespace exactly', () => {
			const password = ' p@ssW0rd!#$% '
			
			expect(service.validatePassword(password, password)).toBe(true)
			expect(service.validatePassword('p@ssW0rd!#$%', password)).toBe(false) // Missing spaces
		})
	})
})