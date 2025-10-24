import { Test } from '@nestjs/testing'
import { beforeEach, describe, it } from 'node:test'
import { SupabaseService } from '../../database/supabase.service'
import { createMockSupabaseService } from '../../test-utils/mocks'
import { TenantsService } from './tenants.service'

describe('TenantsService.getSummary', () => {
	let tenantsService: TenantsService

	beforeEach(async () => {
		const moduleRef = await Test.createTestingModule({
			providers: [
				TenantsService,
				{ provide: SupabaseService, useValue: createMockSupabaseService() }
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

		const supabaseService = (tenantsService as any).supabase as any
		supabaseService.getAdminClient = jest.fn().mockReturnValue(fakeAdminClient)

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
