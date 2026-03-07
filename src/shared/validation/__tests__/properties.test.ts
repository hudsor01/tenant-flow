import { describe, it, expect } from 'vitest'
import { propertyInputSchema, propertyFormSchema, propertyStatusSchema, propertyTypeSchema, propertyQuerySchema, propertyCreateSchema, propertyAddressSchema, propertySoldSchema, propertyStatsSchema } from '../properties'

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

describe('propertyStatusSchema', () => {
	it('accepts valid statuses', () => { for (const s of ['active', 'inactive', 'sold']) expect(propertyStatusSchema.safeParse(s).success).toBe(true) })
	it('rejects invalid status', () => { expect(propertyStatusSchema.safeParse('deleted').success).toBe(false) })
})
describe('propertyTypeSchema', () => {
	it('accepts all valid types', () => { for (const t of ['SINGLE_FAMILY', 'MULTI_UNIT', 'APARTMENT', 'COMMERCIAL', 'CONDO', 'TOWNHOUSE', 'OTHER']) expect(propertyTypeSchema.safeParse(t).success).toBe(true) })
	it('rejects invalid type', () => { expect(propertyTypeSchema.safeParse('MANSION').success).toBe(false) })
})
describe('propertyInputSchema', () => {
	const v = { name: 'Sunrise Apartments', address_line1: '123 Main Street', city: 'Austin', state: 'TX', postal_code: '78701', property_type: 'APARTMENT' as const, owner_user_id: VALID_UUID }
	it('accepts valid input', () => { expect(propertyInputSchema.safeParse(v).success).toBe(true) })
	it('rejects missing name', () => { const { name: _, ...r } = v; expect(propertyInputSchema.safeParse(r).success).toBe(false) })
	it('rejects name shorter than 2 chars', () => { expect(propertyInputSchema.safeParse({ ...v, name: 'A' }).success).toBe(false) })
	it('rejects name exceeding 100 chars', () => { expect(propertyInputSchema.safeParse({ ...v, name: 'x'.repeat(101) }).success).toBe(false) })
	it('rejects short address_line1', () => { expect(propertyInputSchema.safeParse({ ...v, address_line1: '123' }).success).toBe(false) })
	it('accepts optional address_line2', () => { expect(propertyInputSchema.safeParse({ ...v, address_line2: 'Apt 4B' }).success).toBe(true) })
	it('rejects invalid state format', () => { expect(propertyInputSchema.safeParse({ ...v, state: 'Texas' }).success).toBe(false); expect(propertyInputSchema.safeParse({ ...v, state: 'tx' }).success).toBe(false) })
	it('accepts 5-digit and 5+4 postal codes', () => { expect(propertyInputSchema.safeParse({ ...v, postal_code: '78701' }).success).toBe(true); expect(propertyInputSchema.safeParse({ ...v, postal_code: '78701-1234' }).success).toBe(true) })
	it('rejects invalid postal code', () => { expect(propertyInputSchema.safeParse({ ...v, postal_code: 'ABCDE' }).success).toBe(false) })
	it('defaults country to US', () => { const r = propertyInputSchema.safeParse(v); expect(r.success).toBe(true); if (r.success) expect(r.data.country).toBe('US') })
	it('defaults status to active', () => { const r = propertyInputSchema.safeParse(v); expect(r.success).toBe(true); if (r.success) expect(r.data.status).toBe('active') })
	it('rejects invalid owner_user_id', () => { expect(propertyInputSchema.safeParse({ ...v, owner_user_id: 'bad' }).success).toBe(false) })
})
describe('propertyFormSchema', () => {
	const v = { name: 'Test Property', address_line1: '456 Oak Lane', city: 'Dallas', state: 'TX', postal_code: '75201', property_type: 'SINGLE_FAMILY' as const, owner_user_id: VALID_UUID }
	it('accepts valid form data', () => { expect(propertyFormSchema.safeParse(v).success).toBe(true) })
	it('accepts optional acquisition_cost', () => { expect(propertyFormSchema.safeParse({ ...v, acquisition_cost: 250000 }).success).toBe(true) })
	it('rejects non-positive acquisition_cost', () => { expect(propertyFormSchema.safeParse({ ...v, acquisition_cost: -1 }).success).toBe(false) })
	it('accepts null acquisition_cost', () => { expect(propertyFormSchema.safeParse({ ...v, acquisition_cost: null }).success).toBe(true) })
	it('rejects missing required fields', () => { expect(propertyFormSchema.safeParse({}).success).toBe(false) })
})
describe('propertyCreateSchema', () => {
	it('omits owner_user_id', () => { expect(propertyCreateSchema.safeParse({ name: 'New Property', address_line1: '789 Elm Ave', city: 'Houston', state: 'TX', postal_code: '77001', property_type: 'CONDO' }).success).toBe(true) })
})
describe('propertyQuerySchema', () => {
	it('accepts empty query with defaults', () => { const r = propertyQuerySchema.safeParse({}); expect(r.success).toBe(true); if (r.success) { expect(r.data.page).toBe(1); expect(r.data.limit).toBe(20); expect(r.data.sort_order).toBe('asc') } })
	it('accepts full query with filters', () => { expect(propertyQuerySchema.safeParse({ search: 'sunset', property_type: 'APARTMENT', city: 'Austin', sort_by: 'name', sort_order: 'desc', page: 2, limit: 50 }).success).toBe(true) })
	it('rejects limit exceeding 100', () => { expect(propertyQuerySchema.safeParse({ limit: 200 }).success).toBe(false) })
})
describe('propertyAddressSchema', () => {
	it('accepts valid address', () => { expect(propertyAddressSchema.safeParse({ address_line1: '123 Main St', city: 'Austin', state: 'TX', postal_code: '78701' }).success).toBe(true) })
	it('rejects missing city', () => { expect(propertyAddressSchema.safeParse({ address_line1: '123 Main St', state: 'TX', postal_code: '78701' }).success).toBe(false) })
})
describe('propertySoldSchema', () => {
	it('accepts valid sold data', () => { expect(propertySoldSchema.safeParse({ sale_date: '2026-01-15', sale_price: 500000 }).success).toBe(true) })
	it('rejects missing sale_date', () => { expect(propertySoldSchema.safeParse({ sale_price: 500000 }).success).toBe(false) })
	it('rejects unrealistic sale_price', () => { expect(propertySoldSchema.safeParse({ sale_date: '2026-01-15', sale_price: 200000000 }).success).toBe(false) })
	it('rejects zero sale_price', () => { expect(propertySoldSchema.safeParse({ sale_date: '2026-01-15', sale_price: 0 }).success).toBe(false) })
})
describe('propertyStatsSchema', () => {
	it('accepts valid stats', () => { expect(propertyStatsSchema.safeParse({ total: 10, active: 8, inactive: 1, sold: 1, units: 20, occupied_units: 18, vacant_units: 2, occupancy_rate: 90 }).success).toBe(true) })
	it('rejects negative total', () => { expect(propertyStatsSchema.safeParse({ total: -1, active: 0, inactive: 0, sold: 0, units: 0, occupied_units: 0, vacant_units: 0, occupancy_rate: 0 }).success).toBe(false) })
	it('rejects occupancy_rate above 100', () => { expect(propertyStatsSchema.safeParse({ total: 1, active: 1, inactive: 0, sold: 0, units: 1, occupied_units: 1, vacant_units: 0, occupancy_rate: 150 }).success).toBe(false) })
})
