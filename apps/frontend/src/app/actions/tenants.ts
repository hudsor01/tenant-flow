/**
 * Next.js 15 Server Actions for Tenants
 * NATIVE: Direct server-side operations with 'use server' directive
 * Eliminates need for API routes and client-side mutations
 */
'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createActionClient } from '@/lib/supabase/action-client'
import type { Database } from '@repo/shared'

// Define types directly from Database schema - NO DUPLICATION
type Tenant = Database['public']['Tables']['Tenant']['Row']
type CreateTenantInput = Database['public']['Tables']['Tenant']['Insert']
type UpdateTenantInput = Database['public']['Tables']['Tenant']['Update']

// Define local interfaces for component needs
interface TenantQuery {
  search?: string
  status?: string
  propertyId?: string
}

interface TenantStats {
  total: number
  active: number
  inactive: number
}

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
  
  // Direct database insert - convert to camelCase for TypeScript interface
  const firstName = formData.get('first_name') as string
  const lastName = formData.get('last_name') as string
  const tenantData = {
    name: `${firstName} ${lastName}`.trim(),
    email: formData.get('email') as string,
    phone: formData.get('phone') as string || null,
    emergencyContact: (formData.get('emergency_contact') as string) || null
  } satisfies CreateTenantInput

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
  
  // Update specific fields directly to avoid dynamic access
  if (formData.has('name')) {
    updateData.name = formData.get('name') as string
  }
  if (formData.has('email')) {
    updateData.email = formData.get('email') as string
  }
  if (formData.has('phone')) {
    updateData.phone = formData.get('phone') as string
  }
  if (formData.has('emergencyContact')) {
    updateData.emergencyContact = formData.get('emergencyContact') as string
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
    total: totalTenants || 0,
    active: activeTenants || 0,
    inactive: 0
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