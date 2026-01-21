import { Test, type TestingModule } from '@nestjs/testing'
import { UnitQueryService } from './unit-query.service'
import { SupabaseService } from '../../../database/supabase.service'
import { AppLogger } from '../../../logger/app-logger.service'
import { SilentLogger } from '../../../__tests__/silent-logger'

type MockQueryResult = { data: unknown; error: unknown }

type MockQueryBuilder = {
	select: jest.Mock
	eq: jest.Mock
	ilike: jest.Mock
	range: jest.Mock
	order: jest.Mock
	single: jest.Mock
	then: (
		onfulfilled: (result: MockQueryResult) => void,
		onrejected?: (reason: unknown) => void
	) => void
}

describe('UnitQueryService - N+1 Prevention', () => {
	let service: UnitQueryService
	let queryCount: number
	let thenResult: MockQueryResult
	let singleResult: MockQueryResult

	beforeEach(async () => {
		queryCount = 0
		thenResult = { data: [], error: null }
		singleResult = { data: { id: 'unit-1' }, error: null }

		const mockQueryBuilder: MockQueryBuilder = {
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			ilike: jest.fn().mockReturnThis(),
			range: jest.fn().mockReturnThis(),
			order: jest.fn().mockReturnThis(),
			single: jest.fn().mockImplementation(() => Promise.resolve(singleResult)),
			then: (onfulfilled, onrejected) => {
				try {
					onfulfilled(thenResult)
				} catch (error) {
					if (onrejected) {
						onrejected(error)
					}
				}
			}
		}

		const mockClient = {
			from: jest.fn().mockImplementation(() => {
				queryCount += 1
				return mockQueryBuilder
			})
		}

		const mockSupabase = {
			getUserClient: jest.fn(() => mockClient)
		} as unknown as jest.Mocked<SupabaseService>

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				UnitQueryService,
				{ provide: SupabaseService, useValue: mockSupabase },
				{ provide: AppLogger, useValue: new SilentLogger() }
			]
		}).compile()

		service = module.get<UnitQueryService>(UnitQueryService)
	})

	it('findAll uses a single query', async () => {
		await service.findAll('mock-token', { status: 'available' })

		expect(queryCount).toBe(1)
	})

	it('findByProperty uses a single query', async () => {
		await service.findByProperty('mock-token', 'property-123')

		expect(queryCount).toBe(1)
	})

	it('getAvailable uses a single query', async () => {
		await service.getAvailable('mock-token', 'property-123')

		expect(queryCount).toBe(1)
	})

	it('findOne uses a single query', async () => {
		await service.findOne('mock-token', 'unit-1')

		expect(queryCount).toBe(1)
	})
})
