import { describe, it, expect } from 'vitest'
import { tenantInputSchema, tenantUpdateSchema, tenantStatusSchema, tenantQuerySchema, tenantFormSchema, inviteTenantSchema, inviteTenantRequestSchema, inviteToSignLeaseSchema, emergencyContactSchema, tenantVerificationSchema, bulkDeleteTenantsSchema, activateTenantSchema } from '../tenants'

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'
const VALID_UUID_2 = '660e8400-e29b-41d4-a716-446655440000'

describe('tenantStatusSchema', () => {
	it('accepts valid statuses', () => { for (const s of ['active', 'inactive', 'pending', 'SUSPENDED', 'DELETED']) expect(tenantStatusSchema.safeParse(s).success).toBe(true) })
	it('rejects invalid status', () => { expect(tenantStatusSchema.safeParse('banned').success).toBe(false) })
})
describe('tenantInputSchema', () => {
	const v = { user_id: VALID_UUID }
	it('accepts minimal valid input', () => { expect(tenantInputSchema.safeParse(v).success).toBe(true) })
	it('accepts input with all optional fields', () => { expect(tenantInputSchema.safeParse({ ...v, date_of_birth: '1990-01-15', emergency_contact_name: 'Jane Doe', emergency_contact_phone: '5551234567', emergency_contact_relationship: 'Spouse', identity_verified: true, ssn_last_four: '1234', stripe_customer_id: 'cus_test123' }).success).toBe(true) })
	it('rejects missing user_id', () => { expect(tenantInputSchema.safeParse({}).success).toBe(false) })
	it('rejects invalid user_id', () => { expect(tenantInputSchema.safeParse({ user_id: 'not-uuid' }).success).toBe(false) })
	it('rejects ssn_last_four with wrong format', () => { expect(tenantInputSchema.safeParse({ ...v, ssn_last_four: '12' }).success).toBe(false); expect(tenantInputSchema.safeParse({ ...v, ssn_last_four: 'abcd' }).success).toBe(false) })
	it('accepts valid ssn_last_four', () => { expect(tenantInputSchema.safeParse({ ...v, ssn_last_four: '9876' }).success).toBe(true) })
	it('rejects emergency_contact_name exceeding 100 chars', () => { expect(tenantInputSchema.safeParse({ ...v, emergency_contact_name: 'x'.repeat(101) }).success).toBe(false) })
})
describe('tenantUpdateSchema', () => {
	it('accepts partial update', () => { expect(tenantUpdateSchema.safeParse({ identity_verified: true }).success).toBe(true) })
	it('accepts empty object', () => { expect(tenantUpdateSchema.safeParse({}).success).toBe(true) })
	it('accepts update with optional id', () => { expect(tenantUpdateSchema.safeParse({ id: VALID_UUID, identity_verified: false }).success).toBe(true) })
})
describe('tenantQuerySchema', () => {
	it('accepts empty query with defaults', () => { const r = tenantQuerySchema.safeParse({}); expect(r.success).toBe(true); if (r.success) { expect(r.data.page).toBe(1); expect(r.data.limit).toBe(20); expect(r.data.sort_order).toBe('asc') } })
	it('rejects limit exceeding 100', () => { expect(tenantQuerySchema.safeParse({ limit: 200 }).success).toBe(false) })
})
describe('inviteTenantSchema', () => {
	const v = { email: 'tenant@example.com', first_name: 'John', last_name: 'Doe' }
	it('accepts valid invitation', () => { expect(inviteTenantSchema.safeParse(v).success).toBe(true) })
	it('rejects missing email', () => { const { email: _, ...r } = v; expect(inviteTenantSchema.safeParse(r).success).toBe(false) })
	it('rejects invalid email', () => { expect(inviteTenantSchema.safeParse({ ...v, email: 'bad-email' }).success).toBe(false) })
	it('rejects missing first_name', () => { const { first_name: _, ...r } = v; expect(inviteTenantSchema.safeParse(r).success).toBe(false) })
	it('rejects empty first_name', () => { expect(inviteTenantSchema.safeParse({ ...v, first_name: '' }).success).toBe(false) })
	it('rejects missing last_name', () => { const { last_name: _, ...r } = v; expect(inviteTenantSchema.safeParse(r).success).toBe(false) })
	it('accepts optional property_id and unit_id', () => { expect(inviteTenantSchema.safeParse({ ...v, property_id: VALID_UUID, unit_id: VALID_UUID_2 }).success).toBe(true) })
	it('accepts optional phone', () => { expect(inviteTenantSchema.safeParse({ ...v, phone: '5551234567' }).success).toBe(true) })
})
describe('inviteTenantRequestSchema', () => {
	const v = { tenantData: { email: 'tenant@example.com', first_name: 'John', last_name: 'Doe' } }
	it('accepts valid request', () => { expect(inviteTenantRequestSchema.safeParse(v).success).toBe(true) })
	it('accepts with leaseData', () => { expect(inviteTenantRequestSchema.safeParse({ ...v, leaseData: { property_id: VALID_UUID, unit_id: VALID_UUID_2 } }).success).toBe(true) })
	it('rejects missing tenantData', () => { expect(inviteTenantRequestSchema.safeParse({}).success).toBe(false) })
	it('rejects missing email in tenantData', () => { expect(inviteTenantRequestSchema.safeParse({ tenantData: { first_name: 'John', last_name: 'Doe' } }).success).toBe(false) })
})
describe('inviteToSignLeaseSchema', () => {
	it('accepts valid lease invitation', () => { expect(inviteToSignLeaseSchema.safeParse({ lease_id: VALID_UUID, email: 'tenant@example.com' }).success).toBe(true) })
	it('rejects missing lease_id', () => { expect(inviteToSignLeaseSchema.safeParse({ email: 'tenant@example.com' }).success).toBe(false) })
	it('accepts optional message', () => { expect(inviteToSignLeaseSchema.safeParse({ lease_id: VALID_UUID, email: 'tenant@example.com', message: 'Please sign' }).success).toBe(true) })
	it('rejects message exceeding 1000 chars', () => { expect(inviteToSignLeaseSchema.safeParse({ lease_id: VALID_UUID, email: 'tenant@example.com', message: 'x'.repeat(1001) }).success).toBe(false) })
})
describe('emergencyContactSchema', () => {
	it('accepts valid emergency contact', () => { expect(emergencyContactSchema.safeParse({ name: 'Jane Doe', phone: '5551234567', relationship: 'Spouse' }).success).toBe(true) })
	it('rejects missing name', () => { expect(emergencyContactSchema.safeParse({ phone: '5551234567', relationship: 'Spouse' }).success).toBe(false) })
	it('rejects empty name', () => { expect(emergencyContactSchema.safeParse({ name: '', phone: '5551234567', relationship: 'Spouse' }).success).toBe(false) })
	it('rejects missing phone', () => { expect(emergencyContactSchema.safeParse({ name: 'Jane Doe', relationship: 'Spouse' }).success).toBe(false) })
})
describe('tenantVerificationSchema', () => {
	it('accepts valid verification', () => { expect(tenantVerificationSchema.safeParse({ identity_verified: true }).success).toBe(true) })
	it('accepts with optional date', () => { expect(tenantVerificationSchema.safeParse({ identity_verified: true, verification_date: '2026-03-01' }).success).toBe(true) })
	it('rejects missing identity_verified', () => { expect(tenantVerificationSchema.safeParse({}).success).toBe(false) })
})
describe('bulkDeleteTenantsSchema', () => {
	it('accepts array of valid UUIDs', () => { expect(bulkDeleteTenantsSchema.safeParse({ ids: [VALID_UUID, VALID_UUID_2] }).success).toBe(true) })
	it('rejects empty ids array', () => { expect(bulkDeleteTenantsSchema.safeParse({ ids: [] }).success).toBe(false) })
	it('rejects ids exceeding 100', () => { expect(bulkDeleteTenantsSchema.safeParse({ ids: Array.from({ length: 101 }, () => VALID_UUID) }).success).toBe(false) })
})
describe('activateTenantSchema', () => {
	it('accepts valid authuser_id', () => { expect(activateTenantSchema.safeParse({ authuser_id: VALID_UUID }).success).toBe(true) })
	it('rejects missing authuser_id', () => { expect(activateTenantSchema.safeParse({}).success).toBe(false) })
	it('rejects invalid UUID', () => { expect(activateTenantSchema.safeParse({ authuser_id: 'not-uuid' }).success).toBe(false) })
})
describe('tenantFormSchema', () => {
	it('accepts valid form data', () => { expect(tenantFormSchema.safeParse({ user_id: VALID_UUID }).success).toBe(true) })
	it('rejects missing user_id', () => { expect(tenantFormSchema.safeParse({}).success).toBe(false) })
	it('rejects empty user_id', () => { expect(tenantFormSchema.safeParse({ user_id: '' }).success).toBe(false) })
})
