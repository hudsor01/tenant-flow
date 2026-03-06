import { describe, it, expect, vi, afterEach } from 'vitest'
import { emailSchema, uuidSchema, urlSchema, requiredString, nonEmptyStringSchema, requiredTitle, requiredDescription, nonNegativeNumberSchema, positiveNumberSchema, safeIntegerSchema, phoneSchema, stringBoolSchema, isValidEmail, isValidUrl, isValidUUID } from '../common'

describe('emailSchema', () => {
	it('accepts valid email', () => { expect(emailSchema.safeParse('user@example.com').success).toBe(true) })
	it('rejects invalid email', () => { expect(emailSchema.safeParse('not-an-email').success).toBe(false) })
	it('rejects empty string', () => { expect(emailSchema.safeParse('').success).toBe(false) })
})
describe('uuidSchema', () => {
	it('accepts valid UUID', () => { expect(uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true) })
	it('rejects invalid UUID', () => { expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false) })
	it('rejects empty string', () => { expect(uuidSchema.safeParse('').success).toBe(false) })
})
describe('urlSchema', () => {
	it('accepts valid https URL', () => { expect(urlSchema.safeParse('https://example.com').success).toBe(true) })
	it('accepts valid http URL', () => { expect(urlSchema.safeParse('http://example.com').success).toBe(true) })
	it('rejects empty string', () => { expect(urlSchema.safeParse('').success).toBe(false) })
	it('rejects malformed URL', () => { expect(urlSchema.safeParse('not-a-url').success).toBe(false) })
})
describe('isValidUrl', () => {
	it('accepts https URL', () => { expect(isValidUrl('https://example.com')).toBe(true) })
	it('accepts http URL', () => { expect(isValidUrl('http://example.com')).toBe(true) })
	it('rejects javascript: URL', () => { expect(isValidUrl('javascript:alert(1)')).toBe(false) })
	it('rejects ftp: URL', () => { expect(isValidUrl('ftp://files.example.com')).toBe(false) })
	it('rejects empty string', () => { expect(isValidUrl('')).toBe(false) })
	it('rejects malformed URL', () => { expect(isValidUrl('not a url at all')).toBe(false) })
	afterEach(() => { vi.unstubAllEnvs() })
	it('rejects localhost in production', () => {
		vi.stubEnv('NODE_ENV', 'production')
		expect(isValidUrl('http://localhost:3000')).toBe(false)
		expect(isValidUrl('http://127.0.0.1:3000')).toBe(false)
	})
	it('allows localhost in development', () => {
		vi.stubEnv('NODE_ENV', 'development')
		expect(isValidUrl('http://localhost:3000')).toBe(true)
	})
})
describe('isValidEmail', () => {
	it('accepts valid email', () => { expect(isValidEmail('user@example.com')).toBe(true) })
	it('rejects email without @', () => { expect(isValidEmail('userexample.com')).toBe(false) })
	it('rejects email without domain', () => { expect(isValidEmail('user@')).toBe(false) })
	it('rejects empty string', () => { expect(isValidEmail('')).toBe(false) })
	it('rejects email exceeding 254 characters', () => { expect(isValidEmail('a'.repeat(250) + '@b.com')).toBe(false) })
})
describe('isValidUUID', () => {
	it('accepts valid UUID', () => { expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true) })
	it('accepts uppercase UUID', () => { expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true) })
	it('rejects non-UUID string', () => { expect(isValidUUID('not-a-uuid')).toBe(false) })
	it('rejects empty string', () => { expect(isValidUUID('')).toBe(false) })
})
describe('requiredString', () => {
	it('accepts non-empty string', () => { expect(requiredString.safeParse('hello').success).toBe(true) })
	it('rejects empty string', () => { expect(requiredString.safeParse('').success).toBe(false) })
})
describe('nonEmptyStringSchema', () => {
	it('accepts non-empty string', () => { expect(nonEmptyStringSchema.safeParse('hello').success).toBe(true) })
	it('rejects empty string', () => { expect(nonEmptyStringSchema.safeParse('').success).toBe(false) })
	it('rejects whitespace-only string', () => { expect(nonEmptyStringSchema.safeParse('   ').success).toBe(false) })
})
describe('requiredTitle', () => {
	it('accepts valid title', () => { expect(requiredTitle.safeParse('My Title').success).toBe(true) })
	it('rejects empty string', () => { expect(requiredTitle.safeParse('').success).toBe(false) })
	it('rejects title exceeding 200 characters', () => { expect(requiredTitle.safeParse('x'.repeat(201)).success).toBe(false) })
	it('accepts title at exactly 200 characters', () => { expect(requiredTitle.safeParse('x'.repeat(200)).success).toBe(true) })
})
describe('requiredDescription', () => {
	it('accepts valid description', () => { expect(requiredDescription.safeParse('A valid description').success).toBe(true) })
	it('rejects empty string', () => { expect(requiredDescription.safeParse('').success).toBe(false) })
	it('rejects description exceeding 2000 characters', () => { expect(requiredDescription.safeParse('x'.repeat(2001)).success).toBe(false) })
})
describe('nonNegativeNumberSchema', () => {
	it('accepts zero', () => { expect(nonNegativeNumberSchema.safeParse(0).success).toBe(true) })
	it('accepts positive number', () => { expect(nonNegativeNumberSchema.safeParse(42).success).toBe(true) })
	it('rejects negative number', () => { expect(nonNegativeNumberSchema.safeParse(-1).success).toBe(false) })
})
describe('positiveNumberSchema', () => {
	it('accepts positive number', () => { expect(positiveNumberSchema.safeParse(1).success).toBe(true) })
	it('rejects zero', () => { expect(positiveNumberSchema.safeParse(0).success).toBe(false) })
	it('rejects negative number', () => { expect(positiveNumberSchema.safeParse(-5).success).toBe(false) })
})
describe('safeIntegerSchema', () => {
	it('accepts integer', () => { expect(safeIntegerSchema.safeParse(42).success).toBe(true) })
	it('rejects float', () => { expect(safeIntegerSchema.safeParse(3.14).success).toBe(false) })
})
describe('phoneSchema', () => {
	it('accepts valid US phone with formatting', () => { expect(phoneSchema.safeParse('+1 (555) 123-4567').success).toBe(true) })
	it('accepts plain digits phone number', () => { expect(phoneSchema.safeParse('5551234567').success).toBe(true) })
	it('rejects phone with letters', () => { expect(phoneSchema.safeParse('555-CALL-ME').success).toBe(false) })
	it('rejects phone shorter than 10 characters', () => { expect(phoneSchema.safeParse('12345').success).toBe(false) })
	it('rejects phone exceeding 20 characters', () => { expect(phoneSchema.safeParse('1'.repeat(21)).success).toBe(false) })
})
describe('stringBoolSchema', () => {
	it('parses "true" to true', () => { const r = stringBoolSchema.safeParse('true'); expect(r.success).toBe(true); if (r.success) expect(r.data).toBe(true) })
	it('parses "false" to false', () => { const r = stringBoolSchema.safeParse('false'); expect(r.success).toBe(true); if (r.success) expect(r.data).toBe(false) })
	it('parses "1" to true', () => { const r = stringBoolSchema.safeParse('1'); expect(r.success).toBe(true); if (r.success) expect(r.data).toBe(true) })
	it('parses "0" to false', () => { const r = stringBoolSchema.safeParse('0'); expect(r.success).toBe(true); if (r.success) expect(r.data).toBe(false) })
})
