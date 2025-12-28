// Quick script to test DTO validation
import { leaseInputSchema } from '../../packages/shared/src/validation/leases'

const payload = {
	unit_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
	primary_tenant_id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
	start_date: '2025-01-01',
	end_date: '2026-01-01',
	rent_amount: 150000,
	security_deposit: 150000,
	payment_day: 1,
	lease_status: 'draft'
}

console.log('Testing payload:', JSON.stringify(payload, null, 2))

try {
	const result = leaseInputSchema.parse(payload)
	console.log('✅ Validation passed!')
	console.log('Result:', JSON.stringify(result, null, 2))
} catch (error) {
	console.log('❌ Validation failed!')
	if (error && typeof error === 'object' && 'errors' in error) {
		console.log('Zod Errors:', JSON.stringify(error.errors, null, 2))
	} else {
		console.log('Error:', error)
	}
}
