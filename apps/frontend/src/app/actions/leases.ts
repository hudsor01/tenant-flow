/**
 * Next.js 15 Server Actions for Leases
 * NATIVE: Direct server-side operations with 'use server' directive
 * Eliminates need for API routes and client-side mutations
 */
'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createActionClient } from '@/lib/supabase/action-client'
import type { Database } from '@repo/shared'

// Define types directly from Database schema - NO DUPLICATION
type Lease = Database['public']['Tables']['Lease']['Row']
type CreateLeaseInput = Database['public']['Tables']['Lease']['Insert']
type UpdateLeaseInput = Database['public']['Tables']['Lease']['Update']

// Define local interfaces for component needs
interface LeaseQuery {
  search?: string
  status?: string
  propertyId?: string
  tenantId?: string
}

interface LeaseStats {
  total: number
  active: number
  expired: number
  pending: number
  totalRentRoll: number
}

/**
 * NATIVE Server Action: Get all leases with caching
 */
export async function getLeases(query?: LeaseQuery): Promise<Lease[]> {
  const supabase = await createActionClient()
  
  let request = supabase
    .from('leases')
    .select(`
      *,
      tenant:tenants(*),
      property:properties(*),
      unit:units(*)
    `)
    .order('created_at', { ascending: false })

  if (query?.status) {
    request = request.eq('status', query.status)
  }
  
  if (query?.propertyId) {
    request = request.eq('property_id', query.propertyId)
  }
  
  if (query?.tenantId) {
    request = request.eq('tenant_id', query.tenantId)
  }

  const { data, error } = await request

  if (error) {
    console.error('Failed to fetch leases:', error)
    throw new Error('Failed to fetch leases')
  }

  return data || []
}

/**
 * NATIVE Server Action: Get single lease
 */
export async function getLease(id: string): Promise<Lease> {
  const supabase = await createActionClient()
  
  const { data, error } = await supabase
    .from('leases')
    .select(`
      *,
      tenant:tenants(*),
      property:properties(*),
      unit:units(*)
    `)
    .eq('id', id)
    .single()

  if (error || !data) {
    console.error('Failed to fetch lease:', error)
    throw new Error('Lease not found')
  }

  return data
}

/**
 * NATIVE Server Action: Create lease
 */
export async function createLease(formData: FormData): Promise<Lease> {
  const supabase = await createActionClient()
  
  // Direct database insert - no validation needed (server action pattern)
  const rentAmountStr = formData.get('rentAmount') as string
  const securityDepositStr = formData.get('security_deposit') as string
  
  const dbLeaseData: CreateLeaseInput = {
    tenantId: formData.get('tenant_id') as string,
    unitId: formData.get('unit_id') as string,
    startDate: formData.get('start_date') as string,
    endDate: formData.get('end_date') as string,
    rentAmount: parseFloat(rentAmountStr || '0'),
    securityDeposit: securityDepositStr ? parseFloat(securityDepositStr) : 0,
    terms: formData.get('terms') as string || undefined
  }

  const { data, error } = await supabase
    .from('leases')
    .insert(dbLeaseData)
    .select(`
      *,
      tenant:tenants(*),
      property:properties(*),
      unit:units(*)
    `)
    .single()

  if (error || !data) {
    console.error('Failed to create lease:', error)
    throw new Error('Failed to create lease')
  }

  revalidatePath('/leases')
  revalidatePath('/dashboard')
  revalidateTag('leases')

  return data
}

/**
 * NATIVE Server Action: Update lease
 */
export async function updateLease(
  id: string,
  formData: FormData
): Promise<Lease> {
  const supabase = await createActionClient()
  
  const updateData: UpdateLeaseInput = {}
  
  // Update specific fields directly to avoid dynamic access
  if (formData.has('status')) {
    updateData.status = formData.get('status') as 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
  }
  if (formData.has('terms')) {
    updateData.terms = formData.get('terms') as string
  }
  if (formData.has('startDate')) {
    updateData.startDate = formData.get('startDate') as string
  }
  if (formData.has('endDate')) {
    updateData.endDate = formData.get('endDate') as string
  }
  
  // Numeric fields
  if (formData.has('rentAmount')) {
    updateData.rentAmount = parseFloat(formData.get('rentAmount') as string)
  }
  if (formData.has('security_deposit')) {
    updateData.securityDeposit = parseFloat(formData.get('security_deposit') as string)
  }
  // payment_due_day doesn't exist in Lease table - removing

  const { data, error } = await supabase
    .from('leases')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      tenant:tenants(*),
      property:properties(*),
      unit:units(*)
    `)
    .single()

  if (error || !data) {
    console.error('Failed to update lease:', error)
    throw new Error('Failed to update lease')
  }

  revalidatePath('/leases')
  revalidatePath(`/leases/${id}`)
  revalidatePath('/dashboard')
  revalidateTag('leases')
  revalidateTag(`lease-${id}`)

  return data
}

/**
 * NATIVE Server Action: Delete lease
 */
export async function deleteLease(id: string): Promise<void> {
  const supabase = await createActionClient()
  
  const { error } = await supabase
    .from('leases')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Failed to delete lease:', error)
    throw new Error('Failed to delete lease')
  }

  revalidatePath('/leases')
  revalidatePath('/dashboard')
  revalidateTag('leases')
}

/**
 * NATIVE Server Action: Activate lease
 */
export async function activateLease(id: string): Promise<Lease> {
  const supabase = await createActionClient()
  
  const { data, error } = await supabase
    .from('leases')
    .update({ status: 'ACTIVE' })
    .eq('id', id)
    .select(`
      *,
      tenant:tenants(*),
      property:properties(*),
      unit:units(*)
    `)
    .single()

  if (error || !data) {
    console.error('Failed to activate lease:', error)
    throw new Error('Failed to activate lease')
  }

  revalidatePath('/leases')
  revalidatePath(`/leases/${id}`)
  revalidateTag('leases')

  return data
}

/**
 * NATIVE Server Action: Terminate lease
 */
export async function terminateLease(
  id: string,
  reason: string
): Promise<Lease> {
  const supabase = await createActionClient()
  
  const { data, error } = await supabase
    .from('leases')
    .update({ 
      status: 'TERMINATED',
      termination_reason: reason,
      terminated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select(`
      *,
      tenant:tenants(*),
      property:properties(*),
      unit:units(*)
    `)
    .single()

  if (error || !data) {
    console.error('Failed to terminate lease:', error)
    throw new Error('Failed to terminate lease')
  }

  revalidatePath('/leases')
  revalidatePath(`/leases/${id}`)
  revalidateTag('leases')

  return data
}

/**
 * NATIVE Server Action: Get lease statistics
 */
export async function getLeaseStats(): Promise<LeaseStats> {
  const supabase = await createActionClient()
  
  const { count: activeLeases } = await supabase
    .from('leases')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'ACTIVE')

  const { count: expiredLeases } = await supabase
    .from('leases')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'EXPIRED')
    
  const { count: pendingLeases } = await supabase
    .from('leases')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'PENDING')

  // Get expiring soon (next 30 days)
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
  
  const { count: _expiringSoon } = await supabase
    .from('leases')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'ACTIVE')
    .lte('end_date', thirtyDaysFromNow.toISOString())

  return {
    total: (activeLeases || 0) + (expiredLeases || 0) + (pendingLeases || 0),
    active: activeLeases || 0,
    expired: expiredLeases || 0,
    pending: pendingLeases || 0,
    totalRentRoll: 0 // Calculate if needed from active leases
  }
}