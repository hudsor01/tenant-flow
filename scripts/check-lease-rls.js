import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseSecretKey)

async function checkLeaseRLSPolicies() {
  try {
    console.log('Checking lease RLS policies...')

    // Check if RLS is enabled on the lease table
    const { data: rlsEnabled, error: rlsError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'lease')
      .eq('row_security', 'ENABLED')

    if (rlsError) {
      console.error('Error checking RLS status:', rlsError.message)
      return
    }

    if (rlsEnabled && rlsEnabled.length > 0) {
      console.log('✅ RLS is enabled on lease table')
    } else {
      console.log('❌ RLS is NOT enabled on lease table')
      return
    }

    // Check if policies exist
    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, roles')
      .eq('schemaname', 'public')
      .eq('tablename', 'lease')

    if (policyError) {
      console.error('Error checking policies:', policyError.message)
      return
    }

    console.log('Found policies:', policies?.map(p => p.policyname) || [])

    const expectedPolicies = [
      'lease_owner_select',
      'lease_owner_modify',
      'lease_tenant_select',
      'lease_service_role_access'
    ]

    const missingPolicies = expectedPolicies.filter(
      expected => !policies?.some(p => p.policyname === expected)
    )

    if (missingPolicies.length === 0) {
      console.log('✅ All lease RLS policies are in place')
    } else {
      console.log('❌ Missing policies:', missingPolicies)
    }

  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

checkLeaseRLSPolicies()