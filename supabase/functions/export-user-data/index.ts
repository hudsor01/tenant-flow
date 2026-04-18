// Export User Data Edge Function
// GDPR Article 20 data portability: authenticated landlords download all their
// personal data as JSON. Landlord-only mode: rent_due / rent_payments tables
// are gone; tenant-role export is gone (no tenant accounts exist).
//
// GET /functions/v1/export-user-data
// Headers: Authorization: Bearer <jwt>
// -> 200 JSON file with Content-Disposition: attachment header
// -> 401 { error: 'Authorization required' | 'Invalid token' }
// -> 405 Method Not Allowed (non-GET requests)

import { createClient } from '@supabase/supabase-js'
import { validateBearerAuth } from '../_shared/auth.ts'
import { getCorsHeaders, getJsonHeaders, handleCorsOptions } from '../_shared/cors.ts'
import { validateEnv } from '../_shared/env.ts'
import { errorResponse } from '../_shared/errors.ts'
import { createAdminClient } from '../_shared/supabase-client.ts'

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
    const supabaseAuth = createClient(env['SUPABASE_URL'], env['SUPABASE_ANON_KEY'])
    const auth = await validateBearerAuth(req, supabaseAuth)
    if ('error' in auth) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: getJsonHeaders(req),
      })
    }
    const { user } = auth

    // Service role client -- bypasses RLS for complete data export
    const supabase = createAdminClient(env['SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'])

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

    // Build profile section
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
        ...getJsonHeaders(req),
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
  const maintenanceIds = await getOwnerMaintenanceIds(supabase, userId)

  const [
    propertiesResult,
    unitsResult,
    leasesResult,
    tenantsResult,
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
      .select('id, lease_status, start_date, end_date, rent_amount, security_deposit, created_at')
      .eq('owner_user_id', userId)
      .limit(10000),
    supabase
      .from('tenants')
      .select('id, first_name, last_name, name, email, phone, status, date_of_birth, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, created_at')
      .eq('owner_user_id', userId)
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
    tenants: tenantsResult.data ?? [],
    maintenance_requests: maintenanceResult.data ?? [],
    documents: documentsResult.data ?? [],
    expenses: expensesResult.data ?? [],
  }
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
