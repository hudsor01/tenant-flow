/**
 * Next.js 15 Server Actions for Tenants
 * NATIVE: Direct server-side operations with 'use server' directive
 * Eliminates need for API routes and client-side mutations
 */
'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createActionClient } from '@/lib/supabase/action-client'
import type { 
  Tenant, 
  UpdateTenantInput,
  TenantQuery,
  TenantStats 
} from '@repo/shared'

/**
 * NATIVE Server Action: Get all tenants
 * Direct database access with automatic RLS
 */
export async function getTenants(query?: TenantQuery): Promise<Tenant[]> {
  const supabase = await createActionClient()
  
  let request = supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })

  if (query?.search) {
    request = request.or(`
      first_name.ilike.%${query.search}%,
      last_name.ilike.%${query.search}%,
      email.ilike.%${query.search}%
    `)
  }
  
  if (query?.status) {
    request = request.eq('status', query.status)
  }

  if (query?.propertyId) {
    request = request.eq('property_id', query.propertyId)
  }

  const { data, error } = await request

  if (error) {
    console.error('Failed to fetch tenants:', error)
    throw new Error('Failed to fetch tenants')
  }

  return data || []
}

/**
 * NATIVE Server Action: Get single tenant
 */
export async function getTenant(id: string): Promise<Tenant> {
  const supabase = await createActionClient()
  
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    console.error('Failed to fetch tenant:', error)
    throw new Error('Tenant not found')
  }

  return data
}

/**
 * NATIVE Server Action: Create tenant
 */
export async function createTenant(formData: FormData): Promise<Tenant> {
  const supabase = await createActionClient()
  
  // Direct database insert - no type validation needed
  const tenantData = {
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    email: formData.get('email') as string,
    phone: formData.get('phone') as string,
    date_of_birth: formData.get('date_of_birth') as string || null,
    ssn_last_four: formData.get('ssn_last_four') as string || null,
    emergency_contact_name: formData.get('emergency_contact_name') as string || null,
    emergency_contact_phone: formData.get('emergency_contact_phone') as string || null,
    employment_status: formData.get('employment_status') as string || null,
    employer_name: formData.get('employer_name') as string || null,
    annual_income: parseFloat(formData.get('annual_income') as string) || null,
    move_in_date: formData.get('move_in_date') as string || null,
    notes: formData.get('notes') as string || undefined
  } as any

  const { data, error } = await supabase
    .from('tenants')
    .insert(tenantData)
    .select()
    .single()

  if (error || !data) {
    console.error('Failed to create tenant:', error)
    throw new Error('Failed to create tenant')
  }

  revalidatePath('/tenants')
  revalidatePath('/dashboard')
  revalidateTag('tenants')

  return data
}

/**
 * NATIVE Server Action: Update tenant
 */
export async function updateTenant(
  id: string,
  formData: FormData
): Promise<Tenant> {
  const supabase = await createActionClient()
  
  const updateData: UpdateTenantInput = {}
  
  // Extract string fields
  const stringFields = [
    'first_name', 'last_name', 'email', 'phone',
    'ssn_last_four', 'emergency_contact_name', 
    'emergency_contact_phone', 'employment_status',
    'employer_name', 'notes', 'date_of_birth', 'move_in_date'
  ]
  
  stringFields.forEach(field => {
    const value = formData.get(field)
    if (value !== null) {
      updateData[field] = value as string
    }
  })
  
  // Handle numeric fields
  if (formData.has('annual_income')) {
    updateData.annual_income = parseFloat(formData.get('annual_income') as string)
  }

  const { data, error } = await supabase
    .from('tenants')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    console.error('Failed to update tenant:', error)
    throw new Error('Failed to update tenant')
  }

  revalidatePath('/tenants')
  revalidatePath(`/tenants/${id}`)
  revalidatePath('/dashboard')
  revalidateTag('tenants')
  revalidateTag(`tenant-${id}`)

  return data
}

/**
 * NATIVE Server Action: Delete tenant
 */
export async function deleteTenant(id: string): Promise<void> {
  const supabase = await createActionClient()
  
  const { error } = await supabase
    .from('tenants')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Failed to delete tenant:', error)
    throw new Error('Failed to delete tenant')
  }

  revalidatePath('/tenants')
  revalidatePath('/dashboard')
  revalidateTag('tenants')
}

/**
 * NATIVE Server Action: Get tenant statistics
 */
export async function getTenantStats(): Promise<TenantStats> {
  const supabase = await createActionClient()
  
  const { count: totalTenants } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })

  const { count: activeTenants } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'ACTIVE')

  return {
    totalTenants: totalTenants || 0,
    activeTenants: activeTenants || 0,
    inactiveTenants: 0,
    newTenants: 0
  }
}

/**
 * NATIVE Server Action: Get tenants by property
 */
export async function getTenantsByProperty(propertyId: string): Promise<Tenant[]> {
  const supabase = await createActionClient()
  
  const { data, error } = await supabase
    .from('tenants')
    .select(`
      *,
      leases!inner(
        property_id,
        status
      )
    `)
    .eq('leases.property_id', propertyId)
    .eq('leases.status', 'ACTIVE')

  if (error) {
    console.error('Failed to fetch tenants by property:', error)
    throw new Error('Failed to fetch tenants')
  }

  return data || []
}