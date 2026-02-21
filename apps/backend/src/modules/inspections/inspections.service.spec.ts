import { ForbiddenException, InternalServerErrorException, NotFoundException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import { InspectionsService } from './inspections.service'

type InspectionRow = Database['public']['Tables']['inspections']['Row']

// ─── Shared mock data ────────────────────────────────────────────────────────

const USER_ID = 'user-123'
const INSPECTION_ID = 'insp-1'
const LEASE_ID = 'lease-1'
const PROPERTY_ID = 'prop-1'

const MOCK_INSPECTION: InspectionRow = {
	id: INSPECTION_ID,
	lease_id: LEASE_ID,
	property_id: PROPERTY_ID,
	unit_id: null,
	owner_user_id: USER_ID,
	inspection_type: 'move_in',
	status: 'pending',
	scheduled_date: null,
	completed_at: null,
	tenant_reviewed_at: null,
	tenant_signature_data: null,
	overall_condition: null,
	owner_notes: null,
	tenant_notes: null,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z'
}

// ─── Mock builder helpers ─────────────────────────────────────────────────────

/**
 * Creates a mock Supabase query chain that resolves with the given result.
 * Supports both .single() and array resolution.
 */
function makeQueryChain(result: { data: unknown; error: null | { message: string } }) {
	const chain: Record<string, jest.Mock> = {}
	const methods = ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single']
	for (const m of methods) {
		chain[m] = jest.fn().mockReturnThis()
	}
	// Resolve on .single() or array await
	chain['single'] = jest.fn().mockResolvedValue(result)
	// Make the chain itself thenable for array queries
	;(chain as unknown as Promise<typeof result>).then = (resolve: (v: typeof result) => void) =>
		Promise.resolve(result).then(resolve)
	return chain
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('InspectionsService', () => {
	let service: InspectionsService
	let adminClient: jest.Mocked<SupabaseClient<Database>>

	beforeEach(async () => {
		adminClient = {
			from: jest.fn()
		} as unknown as jest.Mocked<SupabaseClient<Database>>

		const supabaseServiceMock: Partial<SupabaseService> = {
			getAdminClient: jest.fn().mockReturnValue(adminClient)
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				InspectionsService,
				{ provide: SupabaseService, useValue: supabaseServiceMock },
				{ provide: AppLogger, useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn() } }
			]
		}).compile()

		service = module.get<InspectionsService>(InspectionsService)
	})

	// ─── findAll ──────────────────────────────────────────────────────────────

	describe('findAll', () => {
		it('returns mapped inspection list items', async () => {
			const rawItem = {
				...MOCK_INSPECTION,
				property: { name: 'Test Property', address_line1: '123 Main St' },
				unit: { name: 'Apt 1' },
				rooms: [{ id: 'room-1' }, { id: 'room-2' }]
			}
			const chain = makeQueryChain({ data: [rawItem], error: null })
			adminClient.from.mockReturnValue(chain as never)

			const result = await service.findAll(USER_ID)

			expect(adminClient.from).toHaveBeenCalledWith('inspections')
			expect(result).toHaveLength(1)
			expect(result[0].id).toBe(INSPECTION_ID)
			expect(result[0].property_name).toBe('Test Property')
			expect(result[0].unit_name).toBe('Apt 1')
			expect(result[0].room_count).toBe(2)
		})

		it('returns empty array when no inspections exist', async () => {
			const chain = makeQueryChain({ data: null, error: null })
			adminClient.from.mockReturnValue(chain as never)

			const result = await service.findAll(USER_ID)

			expect(result).toEqual([])
		})

		it('throws NotFoundException when query errors', async () => {
			const chain = makeQueryChain({ data: null, error: { message: 'DB error' } })
			adminClient.from.mockReturnValue(chain as never)

			await expect(service.findAll(USER_ID)).rejects.toThrow(NotFoundException)
		})
	})

	// ─── findOne ──────────────────────────────────────────────────────────────

	describe('findOne', () => {
		it('returns the inspection when found', async () => {
			const chain = makeQueryChain({ data: MOCK_INSPECTION, error: null })
			adminClient.from.mockReturnValue(chain as never)

			const result = await service.findOne(INSPECTION_ID, USER_ID)

			expect(result.id).toBe(INSPECTION_ID)
		})

		it('throws NotFoundException when inspection is missing', async () => {
			const chain = makeQueryChain({ data: null, error: null })
			adminClient.from.mockReturnValue(chain as never)

			await expect(service.findOne(INSPECTION_ID, USER_ID)).rejects.toThrow(NotFoundException)
		})

		it('throws NotFoundException when query errors', async () => {
			const chain = makeQueryChain({ data: null, error: { message: 'DB error' } })
			adminClient.from.mockReturnValue(chain as never)

			await expect(service.findOne(INSPECTION_ID, USER_ID)).rejects.toThrow(NotFoundException)
		})
	})

	// ─── findByLease ─────────────────────────────────────────────────────────

	describe('findByLease', () => {
		it('returns inspections for a lease', async () => {
			const chain = makeQueryChain({ data: [MOCK_INSPECTION], error: null })
			adminClient.from.mockReturnValue(chain as never)

			const result = await service.findByLease(LEASE_ID, USER_ID)

			expect(result).toHaveLength(1)
			expect(result[0].lease_id).toBe(LEASE_ID)
		})

		it('returns empty array when no inspections for lease', async () => {
			const chain = makeQueryChain({ data: null, error: null })
			adminClient.from.mockReturnValue(chain as never)

			const result = await service.findByLease(LEASE_ID, USER_ID)

			expect(result).toEqual([])
		})

		it('throws NotFoundException when query errors', async () => {
			const chain = makeQueryChain({ data: null, error: { message: 'DB error' } })
			adminClient.from.mockReturnValue(chain as never)

			await expect(service.findByLease(LEASE_ID, USER_ID)).rejects.toThrow(NotFoundException)
		})
	})

	// ─── create ───────────────────────────────────────────────────────────────

	describe('create', () => {
		const createDto = {
			lease_id: LEASE_ID,
			property_id: PROPERTY_ID,
			inspection_type: 'move_in' as const,
			unit_id: null,
			scheduled_date: null
		}

		it('creates and returns a new inspection', async () => {
			const chain = makeQueryChain({ data: MOCK_INSPECTION, error: null })
			adminClient.from.mockReturnValue(chain as never)

			const result = await service.create(createDto, USER_ID)

			expect(result.id).toBe(INSPECTION_ID)
			expect(result.owner_user_id).toBe(USER_ID)
		})

		it('throws InternalServerErrorException when insert fails', async () => {
			const chain = makeQueryChain({ data: null, error: null })
			adminClient.from.mockReturnValue(chain as never)

			await expect(service.create(createDto, USER_ID)).rejects.toThrow(InternalServerErrorException)
		})
	})

	// ─── update ───────────────────────────────────────────────────────────────

	describe('update', () => {
		const updateDto = { status: 'in_progress' as const }

		it('updates inspection when owner is correct', async () => {
			const existingChain = makeQueryChain({
				data: { id: INSPECTION_ID, owner_user_id: USER_ID },
				error: null
			})
			const updatedChain = makeQueryChain({ data: MOCK_INSPECTION, error: null })
			adminClient.from
				.mockReturnValueOnce(existingChain as never)
				.mockReturnValueOnce(updatedChain as never)

			const result = await service.update(INSPECTION_ID, updateDto, USER_ID)

			expect(result.id).toBe(INSPECTION_ID)
		})

		it('throws NotFoundException when inspection not found', async () => {
			const chain = makeQueryChain({ data: null, error: null })
			adminClient.from.mockReturnValue(chain as never)

			await expect(service.update(INSPECTION_ID, updateDto, USER_ID)).rejects.toThrow(
				NotFoundException
			)
		})

		it('throws ForbiddenException when user does not own inspection', async () => {
			const existingChain = makeQueryChain({
				data: { id: INSPECTION_ID, owner_user_id: 'other-user' },
				error: null
			})
			adminClient.from.mockReturnValue(existingChain as never)

			await expect(service.update(INSPECTION_ID, updateDto, USER_ID)).rejects.toThrow(
				ForbiddenException
			)
		})
	})

	// ─── complete ─────────────────────────────────────────────────────────────

	describe('complete', () => {
		it('marks inspection as completed when owner is correct', async () => {
			const existingChain = makeQueryChain({
				data: { id: INSPECTION_ID, owner_user_id: USER_ID },
				error: null
			})
			const completedInspection = { ...MOCK_INSPECTION, status: 'completed' }
			const updatedChain = makeQueryChain({ data: completedInspection, error: null })
			adminClient.from
				.mockReturnValueOnce(existingChain as never)
				.mockReturnValueOnce(updatedChain as never)

			const result = await service.complete(INSPECTION_ID, USER_ID)

			expect(result.status).toBe('completed')
		})

		it('throws ForbiddenException when user is not the owner', async () => {
			const chain = makeQueryChain({
				data: { id: INSPECTION_ID, owner_user_id: 'other-user' },
				error: null
			})
			adminClient.from.mockReturnValue(chain as never)

			await expect(service.complete(INSPECTION_ID, USER_ID)).rejects.toThrow(ForbiddenException)
		})
	})

	// ─── remove ───────────────────────────────────────────────────────────────

	describe('remove', () => {
		it('removes inspection when called with valid ids', async () => {
			const chain = makeQueryChain({ data: null, error: null })
			adminClient.from.mockReturnValue(chain as never)

			await expect(service.remove(INSPECTION_ID, USER_ID)).resolves.toBeUndefined()
		})

		it('throws InternalServerErrorException when delete fails', async () => {
			const chain = makeQueryChain({ data: null, error: { message: 'DB error' } })
			adminClient.from.mockReturnValue(chain as never)

			await expect(service.remove(INSPECTION_ID, USER_ID)).rejects.toThrow(InternalServerErrorException)
		})
	})

	// ─── createRoom ───────────────────────────────────────────────────────────

	describe('createRoom', () => {
		const createRoomDto = {
			inspection_id: INSPECTION_ID,
			room_name: 'Living Room',
			room_type: 'living_room' as const,
			condition_rating: 'good' as const,
			notes: null
		}

		it('creates a room and returns it', async () => {
			const mockRoom = {
				id: 'room-1',
				inspection_id: INSPECTION_ID,
				room_name: 'Living Room',
				room_type: 'living_room',
				condition_rating: 'good',
				notes: null,
				created_at: '2024-01-01T00:00:00Z',
				updated_at: '2024-01-01T00:00:00Z'
			}
			const chain = makeQueryChain({ data: mockRoom, error: null })
			adminClient.from.mockReturnValue(chain as never)

			const result = await service.createRoom(createRoomDto, USER_ID)

			expect(adminClient.from).toHaveBeenCalledWith('inspection_rooms')
			expect(result.room_name).toBe('Living Room')
		})

		it('throws ForbiddenException when inspection not found or access denied', async () => {
			const chain = makeQueryChain({ data: null, error: null })
			adminClient.from.mockReturnValue(chain as never)

			await expect(service.createRoom(createRoomDto, USER_ID)).rejects.toThrow(ForbiddenException)
		})

		it('throws InternalServerErrorException when room insert fails', async () => {
			const inspectionChain = makeQueryChain({ data: { id: INSPECTION_ID }, error: null })
			const insertChain = makeQueryChain({ data: null, error: null })
			adminClient.from
				.mockReturnValueOnce(inspectionChain as never)
				.mockReturnValueOnce(insertChain as never)

			await expect(service.createRoom(createRoomDto, USER_ID)).rejects.toThrow(InternalServerErrorException)
		})
	})
})
