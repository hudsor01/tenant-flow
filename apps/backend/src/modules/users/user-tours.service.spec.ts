import { UserToursService } from './user-tours.service'
import { createMockSupabaseService } from '../../__test__/supabase-mock'
import { SilentLogger } from '../../__test__/silent-logger'
import type { SupabaseService } from '../../database/supabase.service'

const TOKEN = 'test-token'
const USER_ID = 'user-123'

describe('UserToursService', () => {
	beforeEach(() => {
		jest.useFakeTimers({ now: new Date('2024-01-01T00:00:00Z') })
	})

	afterEach(() => {
		jest.useRealTimers()
		jest.clearAllMocks()
	})

	it('returns default progress when no record exists', async () => {
		const mockSupabase = createMockSupabaseService(
			{ data: null, error: null },
			{ data: null, error: null }
		)
		const service = new UserToursService(
			mockSupabase as unknown as SupabaseService,
			new SilentLogger() as never
		)

		const result = await service.getTourProgress(
			TOKEN,
			USER_ID,
			'tenant-onboarding'
		)

		expect(result).toEqual({
			tour_key: 'tenant-onboarding',
			status: 'not_started',
			current_step: 0,
			completed_at: null,
			skipped_at: null,
			last_seen_at: null
		})
	})

	it('updates tour progress and sets completion timestamp', async () => {
		const mockSupabase = createMockSupabaseService(
			{ data: null, error: null },
			{ data: null, error: null }
		)
		const mockClient = mockSupabase.getUserClient()
		mockClient.maybeSingle.mockResolvedValue({ data: null, error: null })
		mockClient.single.mockResolvedValue({
			data: {
				user_id: USER_ID,
				tour_key: 'tenant-onboarding',
				status: 'completed',
				current_step: 5,
				completed_at: '2024-01-01T00:00:00.000Z',
				skipped_at: null,
				last_seen_at: '2024-01-01T00:00:00.000Z'
			},
			error: null
		})

		const service = new UserToursService(
			mockSupabase as unknown as SupabaseService,
			new SilentLogger() as never
		)

		const result = await service.updateTourProgress(
			TOKEN,
			USER_ID,
			'tenant-onboarding',
			{
				status: 'completed',
				current_step: 5
			}
		)

		expect(mockClient.upsert).toHaveBeenCalled()
		expect(result.status).toBe('completed')
		expect(result.completed_at).toBe('2024-01-01T00:00:00.000Z')
	})

	it('resets tour progress to not_started', async () => {
		const mockSupabase = createMockSupabaseService(
			{ data: null, error: null },
			{ data: null, error: null }
		)
		const mockClient = mockSupabase.getUserClient()
		mockClient.single.mockResolvedValue({
			data: {
				user_id: USER_ID,
				tour_key: 'owner-onboarding',
				status: 'not_started',
				current_step: 0,
				completed_at: null,
				skipped_at: null,
				last_seen_at: '2024-01-01T00:00:00.000Z'
			},
			error: null
		})

		const service = new UserToursService(
			mockSupabase as unknown as SupabaseService,
			new SilentLogger() as never
		)

		const result = await service.resetTourProgress(
			TOKEN,
			USER_ID,
			'owner-onboarding'
		)

		expect(result.status).toBe('not_started')
		expect(result.current_step).toBe(0)
	})

	it('rejects invalid tour keys', async () => {
		const mockSupabase = createMockSupabaseService(
			{ data: null, error: null },
			{ data: null, error: null }
		)
		const service = new UserToursService(
			mockSupabase as unknown as SupabaseService,
			new SilentLogger() as never
		)

		await expect(
			service.getTourProgress(TOKEN, USER_ID, 'invalid-tour')
		).rejects.toThrow('Invalid tour key')
	})
})
