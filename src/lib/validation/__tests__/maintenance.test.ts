import { describe, it, expect } from 'vitest'
import { maintenancePrioritySchema, maintenanceStatusSchema, maintenanceRequestInputSchema, maintenanceRequestUpdateSchema, maintenanceRequestQuerySchema, maintenanceRequestCreateSchema, maintenanceCostUpdateSchema, maintenanceAssignmentSchema, maintenanceCompletionSchema, maintenanceInspectionSchema, maintenanceRequestFormSchema, transformMaintenanceRequestFormData } from '../maintenance'

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'
const VALID_UUID_2 = '660e8400-e29b-41d4-a716-446655440000'

describe('maintenancePrioritySchema', () => {
	it('accepts valid priorities', () => { for (const p of ['low', 'normal', 'medium', 'high', 'urgent']) expect(maintenancePrioritySchema.safeParse(p).success).toBe(true) })
	it('rejects invalid priority', () => { expect(maintenancePrioritySchema.safeParse('critical').success).toBe(false) })
})
describe('maintenanceStatusSchema', () => {
	it('accepts valid statuses', () => { for (const s of ['open', 'in_progress', 'completed', 'cancelled', 'on_hold']) expect(maintenanceStatusSchema.safeParse(s).success).toBe(true) })
	it('rejects invalid status', () => { expect(maintenanceStatusSchema.safeParse('closed').success).toBe(false) })
})
describe('maintenanceRequestInputSchema', () => {
	const v = { unit_id: VALID_UUID, tenant_id: VALID_UUID_2, description: 'The kitchen faucet is leaking badly and needs repair', priority: 'high' as const }
	it('accepts valid input', () => { expect(maintenanceRequestInputSchema.safeParse(v).success).toBe(true) })
	it('defaults title', () => { const r = maintenanceRequestInputSchema.safeParse(v); expect(r.success).toBe(true); if (r.success) expect(r.data.title).toBe('New Maintenance Request') })
	it('defaults status to open', () => { const r = maintenanceRequestInputSchema.safeParse(v); expect(r.success).toBe(true); if (r.success) expect(r.data.status).toBe('open') })
	it('rejects missing unit_id', () => { const { unit_id: _, ...r } = v; expect(maintenanceRequestInputSchema.safeParse(r).success).toBe(false) })
	it('rejects missing tenant_id', () => { const { tenant_id: _, ...r } = v; expect(maintenanceRequestInputSchema.safeParse(r).success).toBe(false) })
	it('rejects short description', () => { expect(maintenanceRequestInputSchema.safeParse({ ...v, description: 'Short' }).success).toBe(false) })
	it('rejects long description', () => { expect(maintenanceRequestInputSchema.safeParse({ ...v, description: 'x'.repeat(2001) }).success).toBe(false) })
	it('accepts optional estimated_cost', () => { expect(maintenanceRequestInputSchema.safeParse({ ...v, estimated_cost: 500 }).success).toBe(true) })
	it('rejects non-positive estimated_cost', () => { expect(maintenanceRequestInputSchema.safeParse({ ...v, estimated_cost: 0 }).success).toBe(false) })
	it('rejects high estimated_cost', () => { expect(maintenanceRequestInputSchema.safeParse({ ...v, estimated_cost: 2000000 }).success).toBe(false) })
	it('accepts optional assigned_to', () => { expect(maintenanceRequestInputSchema.safeParse({ ...v, assigned_to: VALID_UUID }).success).toBe(true) })
	it('accepts custom title', () => { const r = maintenanceRequestInputSchema.safeParse({ ...v, title: 'Broken window' }); expect(r.success).toBe(true); if (r.success) expect(r.data.title).toBe('Broken window') })
	it('rejects short title', () => { expect(maintenanceRequestInputSchema.safeParse({ ...v, title: 'AB' }).success).toBe(false) })
	it('rejects long title', () => { expect(maintenanceRequestInputSchema.safeParse({ ...v, title: 'x'.repeat(101) }).success).toBe(false) })
})
describe('maintenanceRequestUpdateSchema', () => {
	it('accepts partial update', () => { expect(maintenanceRequestUpdateSchema.safeParse({ status: 'in_progress' }).success).toBe(true) })
	it('accepts empty object', () => { expect(maintenanceRequestUpdateSchema.safeParse({}).success).toBe(true) })
	it('accepts priority change', () => { expect(maintenanceRequestUpdateSchema.safeParse({ priority: 'urgent', status: 'in_progress' }).success).toBe(true) })
})
describe('maintenanceRequestQuerySchema', () => {
	it('accepts empty query with defaults', () => { const r = maintenanceRequestQuerySchema.safeParse({}); expect(r.success).toBe(true); if (r.success) { expect(r.data.page).toBe(1); expect(r.data.limit).toBe(20); expect(r.data.sort_order).toBe('asc') } })
	it('accepts full query', () => { expect(maintenanceRequestQuerySchema.safeParse({ priority: 'high', status: 'open', sort_by: 'priority', sort_order: 'desc', page: 2, limit: 50 }).success).toBe(true) })
	it('accepts cost range filters', () => { expect(maintenanceRequestQuerySchema.safeParse({ has_cost: true, min_cost: 100, max_cost: 5000 }).success).toBe(true) })
	it('rejects limit exceeding 100', () => { expect(maintenanceRequestQuerySchema.safeParse({ limit: 200 }).success).toBe(false) })
})
describe('maintenanceRequestCreateSchema', () => {
	it('accepts valid create data', () => { expect(maintenanceRequestCreateSchema.safeParse({ unit_id: VALID_UUID, tenant_id: VALID_UUID_2, description: 'Water heater is making strange noises', priority: 'medium' }).success).toBe(true) })
	it('defaults status to open', () => { const r = maintenanceRequestCreateSchema.safeParse({ unit_id: VALID_UUID, tenant_id: VALID_UUID_2, description: 'Water heater is making strange noises', priority: 'medium' }); expect(r.success).toBe(true); if (r.success) expect(r.data.status).toBe('open') })
})
describe('maintenanceCostUpdateSchema', () => {
	it('accepts estimated_cost only', () => { expect(maintenanceCostUpdateSchema.safeParse({ estimated_cost: 300 }).success).toBe(true) })
	it('accepts actual_cost only', () => { expect(maintenanceCostUpdateSchema.safeParse({ actual_cost: 275 }).success).toBe(true) })
	it('accepts both costs', () => { expect(maintenanceCostUpdateSchema.safeParse({ estimated_cost: 300, actual_cost: 275 }).success).toBe(true) })
	it('rejects non-positive cost', () => { expect(maintenanceCostUpdateSchema.safeParse({ estimated_cost: 0 }).success).toBe(false) })
})
describe('maintenanceAssignmentSchema', () => {
	it('accepts valid assignment', () => { expect(maintenanceAssignmentSchema.safeParse({ assigned_to: VALID_UUID }).success).toBe(true) })
	it('accepts with scheduled_date', () => { expect(maintenanceAssignmentSchema.safeParse({ assigned_to: VALID_UUID, scheduled_date: '2026-04-01' }).success).toBe(true) })
	it('rejects missing assigned_to', () => { expect(maintenanceAssignmentSchema.safeParse({}).success).toBe(false) })
})
describe('maintenanceCompletionSchema', () => {
	it('accepts valid completion', () => { expect(maintenanceCompletionSchema.safeParse({ completed_at: '2026-03-10T14:00:00Z' }).success).toBe(true) })
	it('rejects missing completed_at', () => { expect(maintenanceCompletionSchema.safeParse({}).success).toBe(false) })
	it('rejects empty completed_at', () => { expect(maintenanceCompletionSchema.safeParse({ completed_at: '' }).success).toBe(false) })
	it('accepts optional actual_cost', () => { expect(maintenanceCompletionSchema.safeParse({ completed_at: '2026-03-10', actual_cost: 250 }).success).toBe(true) })
})
describe('maintenanceInspectionSchema', () => {
	it('accepts valid inspection', () => { expect(maintenanceInspectionSchema.safeParse({ inspection_date: '2026-03-08', inspection_findings: 'Minor leak found under kitchen sink', inspector_id: VALID_UUID }).success).toBe(true) })
	it('rejects missing inspection_date', () => { expect(maintenanceInspectionSchema.safeParse({ inspection_findings: 'Found issues', inspector_id: VALID_UUID }).success).toBe(false) })
	it('rejects missing inspection_findings', () => { expect(maintenanceInspectionSchema.safeParse({ inspection_date: '2026-03-08', inspector_id: VALID_UUID }).success).toBe(false) })
	it('rejects missing inspector_id', () => { expect(maintenanceInspectionSchema.safeParse({ inspection_date: '2026-03-08', inspection_findings: 'Found issues' }).success).toBe(false) })
	it('rejects long findings', () => { expect(maintenanceInspectionSchema.safeParse({ inspection_date: '2026-03-08', inspection_findings: 'x'.repeat(2001), inspector_id: VALID_UUID }).success).toBe(false) })
})
describe('maintenanceRequestFormSchema', () => {
	const v = { unit_id: VALID_UUID, tenant_id: VALID_UUID_2, title: 'Leaky faucet', description: 'The faucet in the kitchen needs repair', priority: 'high' as const }
	it('accepts valid form data', () => { expect(maintenanceRequestFormSchema.safeParse(v).success).toBe(true) })
	it('rejects missing unit_id', () => { const { unit_id: _, ...r } = v; expect(maintenanceRequestFormSchema.safeParse(r).success).toBe(false) })
	it('rejects missing description', () => { const { description: _, ...r } = v; expect(maintenanceRequestFormSchema.safeParse(r).success).toBe(false) })
	it('accepts optional estimated_cost as string', () => { expect(maintenanceRequestFormSchema.safeParse({ ...v, estimated_cost: '500' }).success).toBe(true) })
})
describe('transformMaintenanceRequestFormData', () => {
	it('transforms form data correctly', () => {
		const t = transformMaintenanceRequestFormData({ unit_id: VALID_UUID, tenant_id: VALID_UUID_2, title: 'Broken window', description: 'Window is cracked', priority: 'high', estimated_cost: '350', scheduled_date: '2026-04-01' })
		expect(t.unit_id).toBe(VALID_UUID)
		expect(t.estimated_cost).toBe(350)
		expect(t.scheduled_date).toBe('2026-04-01')
	})
	it('handles undefined estimated_cost', () => {
		const t = transformMaintenanceRequestFormData({ unit_id: VALID_UUID, tenant_id: VALID_UUID_2, title: 'Test', description: 'Test description', priority: 'low' })
		expect(t.estimated_cost).toBeUndefined()
	})
	it('handles empty string estimated_cost', () => {
		const t = transformMaintenanceRequestFormData({ unit_id: VALID_UUID, tenant_id: VALID_UUID_2, title: 'Test', description: 'Test description', priority: 'low', estimated_cost: '' })
		expect(t.estimated_cost).toBeUndefined()
	})
})
