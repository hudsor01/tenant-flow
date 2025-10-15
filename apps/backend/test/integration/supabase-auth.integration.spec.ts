import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it
} from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
import express from 'express'
import request from 'supertest'
import {
	createAdminClient,
	deleteTestUser
} from '../../src/test-utils/supabase-admin'

const DEFAULT_TEST_JWT_SECRET = 'test-jwt-secret-for-authentication-2025!!'
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
	process.env.JWT_SECRET = DEFAULT_TEST_JWT_SECRET
}
if (!process.env.BACKEND_TIMEOUT_MS) {
	process.env.BACKEND_TIMEOUT_MS = '5000'
}

jest.mock('../../src/test-utils/supabase-admin')
jest.mock('@supabase/supabase-js')

const mockedCreateAdminClient = createAdminClient as jest.Mock
const mockedDeleteTestUser = deleteTestUser as jest.Mock
const mockedCreateClient = createClient as jest.Mock

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

describe('Supabase auth integration', () => {
	const adminClient = {
		auth: {
			admin: {
				createUser: jest.fn(),
				deleteUser: jest.fn()
			}
		},
		from: jest.fn(),
		storage: {
			from: jest.fn()
		}
	}

	const anonClient = {
		auth: {
			signInWithPassword: jest.fn()
		},
		storage: {
			from: jest.fn()
		}
	}

	let testUser: { id: string } | null = null
	let app: express.Express

	beforeAll(() => {
		mockedCreateAdminClient.mockReturnValue(adminClient)
		mockedCreateClient.mockReturnValue(anonClient)
		mockFetch.mockResolvedValue({
			text: async () => 'hello world'
		})

		app = express()
		app.use(express.json())
		app.get('/api/v1/dashboard/stats', (req, res) => {
			if (!req.headers.authorization) {
				return res.status(401).json({ message: 'Unauthorized' })
			}
			return res.status(200).json({ stats: [] })
		})
	})

	beforeEach(() => {
		jest.clearAllMocks()
		testUser = null
		mockedCreateAdminClient.mockReturnValue(adminClient)
		mockedCreateClient.mockReturnValue(anonClient)
		mockedDeleteTestUser.mockResolvedValue(undefined)
		mockFetch.mockResolvedValue({
			text: async () => 'hello world'
		})
	})

	afterAll(async () => {
		if (testUser?.id) {
			expect(mockedDeleteTestUser).toHaveBeenCalledWith(testUser.id)
		}
	})

	it('creates a user, signs in, calls protected route, then cleans up', async () => {
		const unique = Date.now()
		const email = `test+${unique}@example.com`
		const password = 'TestPass123!'
		const userId = `user-${unique}`

		const admin = createAdminClient()
		const anon = createClient(
			process.env.SUPABASE_URL as string,
			process.env.SUPABASE_ANON_KEY as string
		)

		adminClient.auth.admin.createUser.mockResolvedValue({
			data: { user: { id: userId } },
			error: null
		})

		const propertyChain = {
			insert: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			single: jest.fn().mockResolvedValue({
				data: { id: 'property-123' },
				error: null
			})
		}
		adminClient.from.mockReturnValue(propertyChain)

		anonClient.auth.signInWithPassword.mockResolvedValue({
			data: { session: { access_token: 'token-123' } },
			error: null
		})

		const anonStorage = {
			upload: jest.fn().mockResolvedValue({
				data: { path: 'integration/file.txt' },
				error: null
			}),
			createSignedUrl: jest.fn().mockResolvedValue({
				data: { signedURL: 'https://example.com/file.txt' },
				error: null
			})
		}
		anonClient.storage.from.mockReturnValue(anonStorage)

		const adminStorage = {
			remove: jest.fn().mockResolvedValue({ data: null, error: null })
		}
		adminClient.storage.from.mockReturnValue(adminStorage)

		const create = await admin.auth.admin.createUser({
			email,
			password,
			email_confirm: true
		})
		testUser = create.data.user

		expect(adminClient.auth.admin.createUser).toHaveBeenCalledWith({
			email,
			password,
			email_confirm: true
		})

		const signIn = await anon.auth.signInWithPassword({ email, password })
		const token = signIn.data.session?.access_token
		expect(token).toBeDefined()

		const res = await request(app)
			.get('/api/v1/dashboard/stats')
			.set('Authorization', `Bearer ${token}`)

		expect(res.status).toBe(200)
		expect(res.body).toEqual({ stats: [] })

		const propertyPayload = {
			ownerId: userId,
			name: `Integration Property ${unique}`,
			address: '123 Integration St',
			city: 'Testville',
			state: 'TS',
			zipCode: '00000',
			propertyType: 'APARTMENT'
		}

		await adminClient.from('property').insert(propertyPayload).select().single()

		expect(propertyChain.insert).toHaveBeenCalledWith(propertyPayload)
		expect(propertyChain.select).toHaveBeenCalled()

		const bucket = process.env.SUPABASE_TEST_BUCKET || 'test-bucket'
		const filePath = `integration/${userId}/${unique}.txt`
		await anon.storage
			.from(bucket)
			.upload(filePath, Buffer.from('hello world'), { upsert: true })

		expect(anonStorage.upload).toHaveBeenCalledWith(
			filePath,
			expect.any(Buffer),
			{ upsert: true }
		)

		const signedUrlResponse = await anon.storage
			.from(bucket)
			.createSignedUrl(filePath, 60)
		expect(signedUrlResponse.data?.signedURL).toBeDefined()
		if (signedUrlResponse.data?.signedURL) {
			const fetchResponse = await fetch(signedUrlResponse.data.signedURL)
			const text = await fetchResponse.text()
			expect(text).toBe('hello world')
			expect(mockFetch).toHaveBeenCalledWith('https://example.com/file.txt')
		}

		await admin.storage.from(bucket).remove([filePath])
		expect(adminStorage.remove).toHaveBeenCalledWith([filePath])

		if (testUser?.id) {
			await deleteTestUser(testUser.id)
		}

		expect(mockedDeleteTestUser).toHaveBeenCalledWith(userId)
	})
})
