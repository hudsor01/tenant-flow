import { BadRequestException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { SilentLogger } from '../__test__/silent-logger'
import { SupabaseService } from '../database/supabase.service'
import { SecurityService } from './security.service'

describe('SecurityService', () => {
	let service: SecurityService

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SecurityService,
				// Provide a minimal SupabaseService mock to satisfy DI
				{
					provide: SupabaseService,
					useValue: {}
				}
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<SecurityService>(SecurityService)
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

		it('should throw on empty string', () => {
			expect(() => service.sanitizeInput('')).toThrow(BadRequestException)
			expect(() => service.sanitizeInput('')).toThrow('Input cannot be empty')
		})

		it('should throw on string with only whitespace', () => {
			expect(() => service.sanitizeInput('   ')).toThrow(BadRequestException)
			expect(() => service.sanitizeInput('   ')).toThrow('Input cannot contain only whitespace')
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
			// These emails should be rejected (invalid format)
			expect(service.validateEmail('.user@domain.com')).toBe(false) // Leading dot is invalid
			expect(service.validateEmail('user.@domain.com')).toBe(false) // Trailing dot is invalid
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
		it('should hash password using bcrypt', async () => {
			const password = 'testPassword123'
			const hash = await service.hashPassword(password)

			expect(hash).toBeDefined()
			expect(hash).not.toBe(password)
			expect(hash.startsWith('$2b$')).toBe(true) // bcrypt hash format
		})

		it('should generate different hashes for same password (random salt)', async () => {
			const password = 'testPassword123'
			const hash1 = await service.hashPassword(password)
			const hash2 = await service.hashPassword(password)

			expect(hash1).not.toBe(hash2) // Different salts = different hashes
		})

		it('should hash password with special characters', async () => {
			const password = 'p@ssW0rd!#$%'
			const hash = await service.hashPassword(password)

			expect(hash).toBeDefined()
			expect(hash.startsWith('$2b$')).toBe(true)
		})

		it('should hash password with whitespace', async () => {
			const password = ' password with spaces '
			const hash = await service.hashPassword(password)

			expect(hash).toBeDefined()
			expect(hash.startsWith('$2b$')).toBe(true)
		})
	})

	describe('validatePassword', () => {
		it('should validate correct password', async () => {
			const password = 'testPassword123'
			const hash = await service.hashPassword(password)

			const isValid = await service.validatePassword(password, hash)
			expect(isValid).toBe(true)
		})

		it('should reject incorrect password', async () => {
			const password = 'testPassword123'
			const wrongPassword = 'wrongPassword123'
			const hash = await service.hashPassword(password)

			const isValid = await service.validatePassword(wrongPassword, hash)
			expect(isValid).toBe(false)
		})

		it('should reject empty passwords', async () => {
			const password = 'testPassword123'
			const hash = await service.hashPassword(password)

			const isValidEmpty = await service.validatePassword('', hash)
			expect(isValidEmpty).toBe(false)

			const isValidEmptyHash = await service.validatePassword(password, '')
			expect(isValidEmptyHash).toBe(false)
		})

		it('should be case sensitive', async () => {
			const password = 'TestPassword'
			const wrongCase = 'testpassword'
			const hash = await service.hashPassword(password)

			const isValid = await service.validatePassword(wrongCase, hash)
			expect(isValid).toBe(false)
		})

		it('should handle special characters and whitespace', async () => {
			const password = ' p@ssW0rd!#$% '
			const hash = await service.hashPassword(password)

			const isValid = await service.validatePassword(password, hash)
			expect(isValid).toBe(true)
		})
	})
})
