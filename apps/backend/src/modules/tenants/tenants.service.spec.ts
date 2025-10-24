import { Test } from '@nestjs/testing'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { SupabaseService } from '../../database/supabase.service'
import { createMockSupabaseService } from '../../test-utils/mocks'
import { EmailService } from '../email/email.service'
import { TenantsService } from './tenants.service'

describe('TenantsService.getSummary', () => {
	let tenantsService: TenantsService
	let mockSupabaseService: ReturnType<typeof createMockSupabaseService>
	let mockEventEmitter: jest.Mocked<EventEmitter2>
	let mockEmailService: jest.Mocked<EmailService>

	beforeEach(async () => {
		mockSupabaseService = createMockSupabaseService()
		mockEventEmitter = {
			emit: jest.fn()
		} as unknown as jest.Mocked<EventEmitter2>
		mockEmailService = {
			sendTenantInvitation: jest.fn()
		} as unknown as jest.Mocked<EmailService>

		const moduleRef = await Test.createTestingModule({
			providers: [
				TenantsService,
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: EventEmitter2, useValue: mockEventEmitter },
				{ provide: EmailService, useValue: mockEmailService }
			]
		}).compile()

		tenantsService = moduleRef.get(TenantsService)
	})

	it('should compute totals and return a TenantSummary', async () => {
		const fakeAdminClient: any = {
			from: (table: string) => {
				const chain: any = {
					_table: table,
					_selectCols: undefined,
					select(cols: string) {
						this._selectCols = cols
						return this
					},
					eq() {
						return this
					},
					lt() {
						return this
					},
					lte() {
						return this
					},
					gte() {
						return this
					},
					neq() {
						return this
					},
					then: function (resolve: any) {
						let data: any[] = []
						const t = this._table
						const cols = this._selectCols
						if (t === 'tenant') {
							data = [
								{ id: 't1', invitation_status: 'PENDING', status: 'ACTIVE' },
								{ id: 't2', invitation_status: 'SENT', status: 'PENDING' }
							]
						} else if (t === 'rent_payment' && /sum\(/.test(cols || '')) {
							if (!fakeAdminClient._aggCalled) {
								fakeAdminClient._aggCalled = 1
								data = [{ sum: '5000' }]
							} else {
								data = [{ sum: '12000' }]
							}
						}
						return Promise.resolve({ data, error: null }).then(resolve)
					}
				}
				return chain
			}
		}

		mockSupabaseService.getAdminClient.mockReturnValue(fakeAdminClient as any)

		const summary = await tenantsService.getSummary('user-123')

		expect(summary).toBeDefined()
		expect(summary.total).toBe(2)
		expect(summary.invited).toBe(2)
		expect(summary.active).toBe(2)
		expect(summary.overdueBalanceCents).toBe(5000)
		expect(summary.upcomingDueCents).toBe(12000)
		expect(typeof summary.timestamp).toBe('string')
	})
})
