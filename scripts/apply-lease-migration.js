import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseSecretKey)

async function applyMigration() {
  try {
    const sql = readFileSync(join('..', '..', 'supabase', 'migrations', '20251113101000_add_lease_rls_policies.sql'), 'utf8')
    console.log('Applying lease RLS policies migration...')

    const { error } = await supabase.rpc('exec_sql', { sql })
    if (error) {
      console.error('Failed to apply migration:', error.message)
      process.exit(1)
    } else {
      console.log('Migration applied successfully!')
    }
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

applyMigration()