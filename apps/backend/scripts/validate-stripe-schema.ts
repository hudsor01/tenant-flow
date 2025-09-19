import { createClient } from '@supabase/supabase-js'

interface ValidationResult {
	success: boolean
	message: string
	tableCount?: number
	missingTables?: string[]
}

class StripeSchemaValidator {
	private client

	constructor() {
		const supabaseUrl = process.env.SUPABASE_URL
		const serviceKey =
			process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

		if (!supabaseUrl || !serviceKey) {
			throw new Error('Missing Supabase configuration')
		}

		this.client = createClient(supabaseUrl, serviceKey)
	}

	async validateSchema(): Promise<ValidationResult> {
		try {
			const schemaExists = await this.checkSchemaExists()
			if (!schemaExists.success) {
				return schemaExists
			}

			const tableCount = await this.countStripeTables()
			if (!tableCount.success) {
				return tableCount
			}

			const keyTables = await this.validateKeyTables()
			if (!keyTables.success) {
				return { ...keyTables, tableCount: tableCount.tableCount }
			}

			await this.checkCustomerCount()

			return {
				success: true,
				message: 'Stripe schema validation completed successfully',
				tableCount: tableCount.tableCount
			}
		} catch (error) {
			return {
				success: false,
				message:
					error instanceof Error ? error.message : 'Unknown validation error'
			}
		}
	}

	private async checkSchemaExists(): Promise<ValidationResult> {
		const { data, error } = (await this.client.rpc('check_schema_exists', {
			schema_name: 'stripe'
		})) as { data: unknown; error: unknown }

		if (error) {
			return {
				success: false,
				message: `Schema check failed: ${(error as { message: string }).message}`
			}
		}

		if (!(data as boolean)) {
			return { success: false, message: 'Stripe schema not found' }
		}

		console.log('SUCCESS: Stripe schema exists')
		return { success: true, message: 'Schema exists' }
	}

	private async countStripeTables(): Promise<
		ValidationResult & { tableCount?: number }
	> {
		const { data, error } = (await this.client.rpc('count_stripe_tables')) as {
			data: unknown
			error: unknown
		}

		if (error) {
			return {
				success: false,
				message: `Table count failed: ${(error as { message: string }).message}`
			}
		}

		const tableCount = parseInt(String(data), 10)
		console.log(`STATS: Found ${tableCount} stripe tables`)

		if (tableCount < 50) {
			console.warn(`WARNING: Expected 90+ tables, found ${tableCount}`)
		} else {
			console.log('SUCCESS: Good number of tables created')
		}

		return { success: true, message: 'Tables counted', tableCount }
	}

	private async validateKeyTables(): Promise<
		ValidationResult & { missingTables?: string[] }
	> {
		const expectedTables = [
			'customers',
			'subscriptions',
			'invoices',
			'prices',
			'products',
			'charges',
			'payment_intents'
		]

		const { data, error } = (await this.client.rpc('get_key_stripe_tables', {
			table_names: expectedTables
		})) as { data: unknown; error: unknown }

		if (error) {
			return {
				success: false,
				message: `Key tables check failed: ${(error as { message: string }).message}`
			}
		}

		const tableRows = data as Array<{ table_name: string }> | null
		const foundTables = tableRows ? tableRows.map(row => row.table_name) : []
		const missingTables = expectedTables.filter(
			table => !foundTables.includes(table)
		)

		console.log('KEY: Key tables found:')
		for (const table of expectedTables) {
			if (foundTables.includes(table)) {
				console.log(`  SUCCESS: ${table}`)
			} else {
				console.log(`  ERROR: ${table} (missing)`)
			}
		}

		return {
			success: missingTables.length === 0,
			message:
				missingTables.length > 0
					? `Missing tables: ${missingTables.join(', ')}`
					: 'All key tables found',
			missingTables
		}
	}

	private async checkCustomerCount(): Promise<ValidationResult> {
		const { data, error } = (await this.client.rpc(
			'count_stripe_customers'
		)) as { data: unknown; error: unknown }

		if (error) {
			console.warn(
				`Customer count check failed: ${(error as { message: string }).message}`
			)
			return { success: true, message: 'Customer count unavailable' }
		}

		const customerCount = parseInt(String(data), 10)
		console.log(`USERS: Customers in database: ${customerCount}`)

		if (customerCount === 0) {
			console.log('SUCCESS: Database is empty as expected (0 users)')
		}

		return { success: true, message: 'Customer count checked' }
	}
}

async function validateStripeSchema(): Promise<void> {
	console.log('CHECKING: Validating Stripe schema creation...')

	try {
		const validator = new StripeSchemaValidator()
		const result = await validator.validateSchema()

		if (result.success) {
			console.log(`\nSUCCESS: ${result.message}`)
			if (result.tableCount) {
				console.log(`  Total tables: ${result.tableCount}`)
			}
		} else {
			console.error(`\nERROR: ${result.message}`)
			if (result.missingTables && result.missingTables.length > 0) {
				console.error(`  Missing: ${result.missingTables.join(', ')}`)
			}
			process.exit(1)
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error'
		console.error('FATAL:', message)
		process.exit(1)
	}
}

validateStripeSchema().catch((error: unknown) => {
	console.error('Fatal error:', error)
	process.exit(1)
})
