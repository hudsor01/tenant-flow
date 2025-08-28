/**
 * Next.js 15 Server Actions for Maintenance
 * NATIVE: Direct server-side operations with 'use server' directive
 */
'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createActionClient } from '@/lib/supabase/action-client'
import type { Database } from '@repo/shared'

// Define types directly from Database schema - NO DUPLICATION
type MaintenanceRequest = Database['public']['Tables']['MaintenanceRequest']['Row']
type CreateMaintenanceInput = Database['public']['Tables']['MaintenanceRequest']['Insert']
type _UpdateMaintenanceInput = Database['public']['Tables']['MaintenanceRequest']['Update']
type MaintenanceStatus = Database['public']['Enums']['RequestStatus']
type Priority = Database['public']['Enums']['Priority']

/**
 * NATIVE Server Action: Get maintenance requests
 */
export async function getMaintenanceRequests(params?: {
  status?: MaintenanceStatus
  priority?: string
  propertyId?: string
  unitId?: string
}): Promise<MaintenanceRequest[]> {
  const supabase = await createActionClient()
  
  let request = supabase
    .from('maintenance_requests')
    .select(`
      *,
      property:properties(*),
      unit:units(*),
      tenant:tenants(*)
    `)
    .order('created_at', { ascending: false })

  if (params?.status) {
    request = request.eq('status', params.status)
  }
  if (params?.priority) {
    request = request.eq('priority', params.priority)
  }
  if (params?.propertyId) {
    request = request.eq('property_id', params.propertyId)
  }
  if (params?.unitId) {
    request = request.eq('unit_id', params.unitId)
  }

  const { data, error } = await request

  if (error) {
    console.error('Failed to fetch maintenance requests:', error)
    throw new Error('Failed to fetch maintenance requests')
  }

  return data || []
}

/**
 * NATIVE Server Action: Create maintenance request
 */
export async function createMaintenanceRequest(
  formData: FormData
): Promise<MaintenanceRequest> {
  const supabase = await createActionClient()
  
  // Direct database insert - no type validation needed
  const requestData = {
    unitId: formData.get('unit_id') as string,
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    category: formData.get('category') as string || 'GENERAL',
    priority: formData.get('priority') as Priority || 'MEDIUM',
    status: formData.get('status') as MaintenanceStatus || 'OPEN'
  } satisfies CreateMaintenanceInput

  const { data, error } = await supabase
    .from('maintenance_requests')
    .insert(requestData)
    .select(`
      *,
      property:properties(*),
      unit:units(*),
      tenant:tenants(*)
    `)
    .single()

  if (error || !data) {
    console.error('Failed to create maintenance request:', error)
    throw new Error('Failed to create maintenance request')
  }

  revalidatePath('/maintenance')
  revalidatePath('/dashboard')
  revalidateTag('maintenance')

  return data
}

/**
 * NATIVE Server Action: Update maintenance status
 */
export async function updateMaintenanceStatus(
  id: string,
  status: MaintenanceStatus
): Promise<MaintenanceRequest> {
  const supabase = await createActionClient()
  
  const updateData: { status: MaintenanceStatus; completed_at?: string } = { status }
  
  if (status === 'COMPLETED') {
    updateData.completed_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('maintenance_requests')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      property:properties(*),
      unit:units(*),
      tenant:tenants(*)
    `)
    .single()

  if (error || !data) {
    console.error('Failed to update maintenance status:', error)
    throw new Error('Failed to update maintenance status')
  }

  revalidatePath('/maintenance')
  revalidatePath(`/maintenance/${id}`)
  revalidateTag('maintenance')

  return data
}

/**
 * NATIVE Server Action: Get maintenance statistics
 */
export async function getMaintenanceStats() {
  const supabase = await createActionClient()
  
  const { count: open } = await supabase
    .from('maintenance_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'OPEN')

  const { count: inProgress } = await supabase
    .from('maintenance_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'IN_PROGRESS')

  const { count: completed } = await supabase
    .from('maintenance_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'COMPLETED')

  return {
    open: open || 0,
    inProgress: inProgress || 0,
    completed: completed || 0,
    averageCompletionTime: 0 // Calculate if needed
  }
}