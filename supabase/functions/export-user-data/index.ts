// Export User Data Edge Function
// GDPR Article 20 data portability: authenticated users download all their personal data as JSON.
// Supports OWNER and TENANT roles with role-specific data sections.
//
// GET /functions/v1/export-user-data
// Headers: Authorization: Bearer <jwt>
// -> 200 JSON file with Content-Disposition: attachment header
// -> 401 { error: 'Authorization required' | 'Invalid token' }
// -> 405 Method Not Allowed (non-GET requests)

import { createClient } from '@supabase/supabase-js'
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts'
import { validateEnv } from '../_shared/env.ts'
import { errorResponse } from '../_shared/errors.ts'

interface UserRecord {
  user_type: string
  full_name: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  avatar_url: string | null
  created_at: string | null
  deletion_requested_at: string | null
}

Deno.serve(async (req: Request) => {
  const optionsResponse = handleCorsOptions(req)
  if (optionsResponse) return optionsResponse

  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405, headers: getCorsHeaders(req) })
  }

  try {
    const env = validateEnv({
      required: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY'],
    })

    // JWT auth guard -- derive user identity from token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }
    const token = authHeader.replace('Bearer ', '')

    // Validate token using anon-key client
    const supabaseAuth = createClient(env['SUPABASE_URL'], env['SUPABASE_ANON_KEY'], {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Service role client -- bypasses RLS for complete data export
    const supabase = createClient(env['SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'])

    // Fetch user profile to determine role
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('user_type, full_name, email, first_name, last_name, phone, avatar_url, created_at, deletion_requested_at')
      .eq('id', user.id)
      .single()

    if (userError || !userRecord) {
      return errorResponse(req, 500, userError ?? new Error('User not found'), { action: 'export_user_data_lookup' })
    }

    const typedUser = userRecord as UserRecord
    const userType = typedUser.user_type

    // Build profile section (same for both roles)
    const profile = {
      full_name: typedUser.full_name,
      email: typedUser.email,
      first_name: typedUser.first_name,
      last_name: typedUser.last_name,
      phone: typedUser.phone,
      avatar_url: typedUser.avatar_url,
      created_at: typedUser.created_at,
      user_type: typedUser.user_type,
      deletion_requested_at: typedUser.deletion_requested_at,
    }

    let exportData: Record<string, unknown>

    if (userType === 'OWNER' || userType === 'ADMIN') {
      exportData = await collectOwnerData(supabase, user.id, profile)
    } else if (userType === 'TENANT') {
      exportData = await collectTenantData(supabase, user.id, profile)
    } else {
      // PENDING or unknown role -- export profile only
      exportData = {
        exported_at: new Date().toISOString(),
        user_role: userType,
        user_id: user.id,
        profile,
      }
    }

    const filename = `tenantflow-data-export-${userType.toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        ...getCorsHeaders(req),
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    return errorResponse(req, 500, err, { action: 'export_user_data' })
  }
})

async function collectOwnerData(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  profile: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  // Pre-fetch IDs needed for .in() filters (avoids duplicate queries inside Promise.all)
  const [leaseIds, maintenanceIds] = await Promise.all([
    getOwnerLeaseIds(supabase, userId),
    getOwnerMaintenanceIds(supabase, userId),
  ])

  const [
    propertiesResult,
    unitsResult,
    leasesResult,
    rentDueResult,
    rentPaymentsResult,
    maintenanceResult,
    documentsResult,
    expensesResult,
  ] = await Promise.all([
    supabase
      .from('properties')
      .select('id, name, address_line1, address_line2, city, state, postal_code, property_type, status, created_at')
      .eq('owner_user_id', userId)
      .limit(10000),
    supabase
      .from('units')
      .select('id, unit_number, bedrooms, bathrooms, rent_amount, status, property_id')
      .eq('owner_user_id', userId)
      .limit(10000),
    supabase
      .from('leases')
      .select('id, lease_status, start_date, end_date, rent_amount, created_at')
      .eq('owner_user_id', userId)
      .limit(10000),
    supabase
      .from('rent_due')
      .select('id, amount, due_date, status, lease_id')
      .in('lease_id', leaseIds.length > 0 ? leaseIds : ['__none__'])
      .limit(10000),
    supabase
      .from('rent_payments')
      .select('id, amount, status, paid_date, lease_id')
      .in('lease_id', leaseIds.length > 0 ? leaseIds : ['__none__'])
      .limit(10000),
    supabase
      .from('maintenance_requests')
      .select('id, title, description, status, priority, created_at')
      .eq('owner_user_id', userId)
      .limit(10000),
    supabase
      .from('documents')
      .select('id, document_type, file_path, created_at')
      .eq('owner_user_id', userId)
      .limit(10000),
    supabase
      .from('expenses')
      .select('id, amount, vendor_name, expense_date, maintenance_request_id')
      .in('maintenance_request_id', maintenanceIds.length > 0 ? maintenanceIds : ['__none__'])
      .limit(10000),
  ])

  return {
    exported_at: new Date().toISOString(),
    user_role: 'OWNER',
    user_id: userId,
    profile,
    properties: propertiesResult.data ?? [],
    units: unitsResult.data ?? [],
    leases: leasesResult.data ?? [],
    rent_due: rentDueResult.data ?? [],
    rent_payments: rentPaymentsResult.data ?? [],
    maintenance_requests: maintenanceResult.data ?? [],
    documents: documentsResult.data ?? [],
    expenses: expensesResult.data ?? [],
  }
}

async function collectTenantData(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  profile: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  // First get the tenant record to use tenant_id for related queries
  const { data: tenantRecord } = await supabase
    .from('tenants')
    .select('id, status, date_of_birth, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship')
    .eq('user_id', userId)
    .single()

  const tenantId = tenantRecord?.id

  if (!tenantId) {
    return {
      exported_at: new Date().toISOString(),
      user_role: 'TENANT',
      user_id: userId,
      profile,
      tenant_record: null,
      leases: [],
      rent_due: [],
      rent_payments: [],
      maintenance_requests: [],
    }
  }

  // Get lease IDs through lease_tenants for this tenant
  const tenantLeaseIds = await getTenantLeaseIds(supabase, tenantId)

  const [
    leaseTenantsResult,
    rentDueResult,
    rentPaymentsResult,
    maintenanceResult,
  ] = await Promise.all([
    supabase
      .from('lease_tenants')
      .select('lease_id, responsibility_percentage, leases(start_date, end_date, rent_amount, lease_status)')
      .eq('tenant_id', tenantId)
      .limit(10000),
    supabase
      .from('rent_due')
      .select('id, amount, due_date, status')
      .in('lease_id', tenantLeaseIds.length > 0 ? tenantLeaseIds : ['__none__'])
      .limit(10000),
    supabase
      .from('rent_payments')
      .select('id, amount, status, paid_date')
      .eq('tenant_id', tenantId)
      .limit(10000),
    supabase
      .from('maintenance_requests')
      .select('id, title, description, status, priority, created_at')
      .eq('tenant_id', tenantId)
      .limit(10000),
  ])

  return {
    exported_at: new Date().toISOString(),
    user_role: 'TENANT',
    user_id: userId,
    profile,
    tenant_record: tenantRecord,
    leases: leaseTenantsResult.data ?? [],
    rent_due: rentDueResult.data ?? [],
    rent_payments: rentPaymentsResult.data ?? [],
    maintenance_requests: maintenanceResult.data ?? [],
  }
}

// Helper: get all lease IDs for an owner
async function getOwnerLeaseIds(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from('leases')
    .select('id')
    .eq('owner_user_id', userId)
    .limit(10000)

  return (data ?? []).map((row: { id: string }) => row.id)
}

// Helper: get all maintenance request IDs for an owner
async function getOwnerMaintenanceIds(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from('maintenance_requests')
    .select('id')
    .eq('owner_user_id', userId)
    .limit(10000)

  return (data ?? []).map((row: { id: string }) => row.id)
}

// Helper: get all lease IDs for a tenant through lease_tenants
async function getTenantLeaseIds(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from('lease_tenants')
    .select('lease_id')
    .eq('tenant_id', tenantId)
    .limit(10000)

  return (data ?? []).map((row: { lease_id: string }) => row.lease_id)
}
