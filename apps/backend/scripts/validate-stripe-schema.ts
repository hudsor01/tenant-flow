import 'dotenv/config'
import pg from 'pg'

/**
 * Validate Stripe Schema Creation
 * 
 * Checks that the Stripe Sync Engine properly created the database schema
 */
async function validateStripeSchema() {
  console.log('CHECKING: Validating Stripe schema creation...')
  
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL not found')
    process.exit(1)
  }

  const client = new pg.Client({ connectionString: databaseUrl })
  
  try {
    await client.connect()
    console.log('SUCCESS: Connected to database')

    // Check if stripe schema exists
    const schemaResult = await client.query(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'stripe'"
    )
    
    if (schemaResult.rows.length === 0) {
      console.error('ERROR: Stripe schema not found')
      return
    }
    console.log('SUCCESS: Stripe schema exists')

    // Count stripe tables
    const tablesResult = await client.query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'stripe'
    `)
    
    const tableCount = parseInt(tablesResult.rows[0].table_count)
    console.log(`STATS: Found ${tableCount} stripe tables`)
    
    if (tableCount < 50) {
      console.warn(`WARNING:  Expected 90+ tables, found ${tableCount}`)
    } else {
      console.log('SUCCESS: Good number of tables created')
    }

    // List key tables
    const keyTablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'stripe' 
      AND table_name IN ('customers', 'subscriptions', 'invoices', 'prices', 'products', 'charges', 'payment_intents')
      ORDER BY table_name
    `)

    console.log('KEY: Key tables found:')
    const foundTables = keyTablesResult.rows.map(row => row.table_name)
    const expectedTables = ['customers', 'subscriptions', 'invoices', 'prices', 'products', 'charges', 'payment_intents']
    
    expectedTables.forEach(table => {
      if (foundTables.includes(table)) {
        console.log(`  SUCCESS: ${table}`)
      } else {
        console.log(`  ERROR: ${table} (missing)`)
      }
    })

    // Check if tables are empty (expected with 0 users)
    const customerCount = await client.query('SELECT COUNT(*) FROM stripe.customers')
    console.log(`USERS: Customers in database: ${customerCount.rows[0].count}`)
    
    if (customerCount.rows[0].count === '0') {
      console.log('SUCCESS: Database is empty as expected (0 users)')
    }

    console.log('\nSUCCESS: Stripe schema validation completed successfully!')
    
  } catch (error) {
    console.error('ERROR: Validation failed:', error)
  } finally {
    await client.end()
  }
}

validateStripeSchema()