import { BadRequestException, NotFoundException } from '@nestjs/common'
import type Stripe from 'stripe'
import { StripeIdentityService } from './stripe-identity.service'

describe('StripeIdentityService', () => {
	const userRow = {
		id: 'user_1',
		email: 'owner@tenantflow.app',
		identityVerificationSessionId: null,
		identityVerificationStatus: null,
		identityVerificationError: null,
		identityVerifiedAt: null,
		identityVerificationData: null
	}

	const stripeClientMock = {
		identity: {
			verificationSessions: {
				create: jest.fn(),
				retrieve: jest.fn()
			}
		}
	} as unknown as Stripe

	const stripeClientServiceMock = {
		getClient: jest.fn().mockReturnValue(stripeClientMock)
	}

	const supabaseMock = {
		getAdminClient: jest.fn()
	}

	const usersServiceMock = {
		getUserById: jest.fn(),
		updateUser: jest.fn()
	}

	let service: StripeIdentityService

	beforeEach(() => {
		jest.clearAllMocks()
		service = new StripeIdentityService(
			supabaseMock as any,
			stripeClientServiceMock as any,
			usersServiceMock as any
		)
	})

	it('creates a verification session when none exists', async () => {
		const session = {
		id: 'sess_1',
		object: 'identity.verification_session',
		status: 'created',
		client_secret: 'secret_123',
		client_reference_id: null,
		created: Date.now() / 1000,
		last_error: null,
		last_verification_report: null,
		livemode: false,
		redaction: null,
		related_customer: null,
		type: 'document',
		options: null,
		url: null,
		metadata: {
			user_id: userRow.id
		}
	} as unknown as Stripe.Identity.VerificationSession

		usersServiceMock.getUserById.mockResolvedValueOnce(userRow)
		usersServiceMock.updateUser.mockResolvedValueOnce(userRow)
		;(stripeClientMock.identity.verificationSessions.create as jest.Mock).mockResolvedValueOnce(
			session
		)

		const payload = await service.createVerificationSession(userRow.id)

		expect(payload).toEqual({
			clientSecret: 'secret_123',
			sessionId: 'sess_1',
			status: 'created'
		})
		expect(usersServiceMock.updateUser).toHaveBeenCalledWith(
			userRow.id,
			expect.objectContaining({
				identityVerificationSessionId: 'sess_1',
				identityVerificationStatus: 'created'
			})
		)
	})

	it('throws NotFoundException when the user is missing', async () => {
		usersServiceMock.getUserById.mockResolvedValueOnce(null)

		await expect(service.createVerificationSession('missing')).rejects.toThrow(
			NotFoundException
		)
	})

	it('throws BadRequestException if identity is already verified', async () => {
		usersServiceMock.getUserById.mockResolvedValueOnce({
			...userRow,
			identityVerificationStatus: 'verified'
		})

		await expect(service.createVerificationSession(userRow.id)).rejects.toThrow(
			BadRequestException
		)
	})

	it('handles verified webhook events by updating the user', async () => {
		const session = {
		id: 'sess_verify',
		object: 'identity.verification_session',
		status: 'verified',
		client_secret: null,
		client_reference_id: null,
		created: Date.now() / 1000,
		last_error: null,
		last_verification_report: null,
		livemode: false,
		redaction: null,
		related_customer: null,
		type: 'document',
		options: null,
		url: null,
		metadata: {
			user_id: userRow.id
		}
	} as unknown as Stripe.Identity.VerificationSession

		usersServiceMock.updateUser.mockResolvedValueOnce(userRow)

		await service.handleVerificationSessionEvent(session)

		expect(usersServiceMock.updateUser).toHaveBeenCalledWith(
			userRow.id,
			expect.objectContaining({
				identityVerificationStatus: 'verified',
				identityVerifiedAt: expect.any(String)
			})
		)
	})
})
