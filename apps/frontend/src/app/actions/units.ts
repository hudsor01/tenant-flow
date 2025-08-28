/**
 * Next.js 15 Server Actions for Units
 * NATIVE: Direct server-side operations with 'use server' directive
 */
'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createActionClient } from '@/lib/supabase/action-client'
import type { Database } from '@repo/shared'

// Define types directly from Database schema - NO DUPLICATION
type Unit = Database['public']['Tables']['Unit']['Row']
type CreateUnitInput = Database['public']['Tables']['Unit']['Insert']
type _UpdateUnitInput = Database['public']['Tables']['Unit']['Update']
type UnitStatus = Database['public']['Enums']['UnitStatus']

// Define local interfaces for component needs  
interface UnitQuery {
  search?: string
  status?: string
  propertyId?: string
}

interface UnitStats {
  total: number
  occupied: number
  vacant: number
  maintenance: number
  occupancyRate: number
}

/**
 * NATIVE Server Action: Get all units
 */
export async function getUnits(query?: UnitQuery): Promise<Unit[]> {
  const supabase = await createActionClient()
  
  let request = supabase
    .from('units')
    .select(`
      *,
      property:properties(*)
    `)
    .order('unit_number', { ascending: true })

  if (query?.propertyId) {
    request = request.eq('property_id', query.propertyId)
  }
  
  if (query?.status) {
    request = request.eq('status', query.status)
  }

  const { data, error } = await request

  if (error) {
    console.error('Failed to fetch units:', error)
    throw new Error('Failed to fetch units')
  }

  return data || []
}

/**
 * NATIVE Server Action: Get single unit
 */
export async function getUnit(id: string): Promise<Unit> {
  const supabase = await createActionClient()
  
  const { data, error } = await supabase
    .from('units')
    .select(`
      *,
      property:properties(*)
    `)
    .eq('id', id)
    .single()

  if (error || !data) {
    console.error('Failed to fetch unit:', error)
    throw new Error('Unit not found')
  }

  return data
}

/**
 * NATIVE Server Action: Create unit
 */
export async function createUnit(formData: FormData): Promise<Unit> {
  const supabase = await createActionClient()
  
  // Direct database insert - use camelCase for Supabase generated types
  const unitData: CreateUnitInput = {
    propertyId: formData.get('property_id') as string,
    unitNumber: formData.get('unit_number') as string,
    bedrooms: parseInt(formData.get('bedrooms') as string, 10) || 1,
    bathrooms: parseFloat(formData.get('bathrooms') as string) || 1,
    squareFeet: parseInt(formData.get('square_feet') as string, 10) || undefined,
    rent: parseFloat(formData.get('rent') as string) || 0,
    status: (formData.get('status') as UnitStatus) || 'VACANT'
  }

  const { data, error } = await supabase
    .from('units')
    .insert(unitData)
    .select(`
      *,
      property:properties(*)
    `)
    .single()

  if (error || !data) {
    console.error('Failed to create unit:', error)
    throw new Error('Failed to create unit')
  }

  revalidatePath('/units')
  revalidatePath('/properties')
  revalidatePath('/dashboard')
  revalidateTag('units')

  return data
}

/**
 * NATIVE Server Action: Update unit
 */
export async function updateUnit(
  id: string,
  formData: FormData
): Promise<Unit> {
  const supabase = await createActionClient()
  
  const unitData = {
    unit_number: formData.get('unitNumber') as string,
    unit_type: formData.get('unitType') as string || 'STUDIO',
    square_feet: formData.has('squareFeet') 
      ? parseInt(formData.get('squareFeet') as string, 10)
      : null,
    bedrooms: formData.has('bedrooms')
      ? parseInt(formData.get('bedrooms') as string, 10)
      : null,
    bathrooms: formData.has('bathrooms')
      ? parseFloat(formData.get('bathrooms') as string)
      : null,
    rentAmount: formData.has('monthlyRent')
      ? parseFloat(formData.get('monthlyRent') as string)
      : null,
    description: formData.get('description') as string || null,
    status: formData.get('isOccupied') === 'on' ? 'OCCUPIED' : 'VACANT'
  }
  
  const { data, error } = await supabase
    .from('units')
    .update(unitData)
    .eq('id', id)
    .select(`
      *,
      property:properties(*)
    `)
    .single()

  if (error || !data) {
    console.error('Failed to update unit:', error)
    throw new Error('Failed to update unit')
  }

  revalidatePath('/units')
  revalidatePath(`/units/${id}`)
  revalidatePath('/properties')
  revalidatePath('/dashboard')
  revalidateTag('units')

  return data
}

/**
 * NATIVE Server Action: Update unit availability
 */
export async function updateUnitAvailability(
  id: string,
  isAvailable: boolean
): Promise<Unit> {
  const supabase = await createActionClient()
  
  const status = isAvailable ? 'VACANT' : 'OCCUPIED'
  
  const { data, error } = await supabase
    .from('units')
    .update({ status })
    .eq('id', id)
    .select(`
      *,
      property:properties(*)
    `)
    .single()

  if (error || !data) {
    console.error('Failed to update unit availability:', error)
    throw new Error('Failed to update unit availability')
  }

  revalidatePath('/units')
  revalidatePath(`/units/${id}`)
  revalidateTag('units')

  return data
}

/**
 * NATIVE Server Action: Get unit statistics
 */
export async function getUnitStats(): Promise<UnitStats> {
  const supabase = await createActionClient()
  
  const { count: totalUnits } = await supabase
    .from('units')
    .select('*', { count: 'exact', head: true })

  const { count: occupiedUnits } = await supabase
    .from('units')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'OCCUPIED')

  const { count: vacantUnits } = await supabase
    .from('units')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'VACANT')

  const { count: maintenanceUnits } = await supabase
    .from('units')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'MAINTENANCE')

  const occupancyRate = totalUnits 
    ? Math.round((occupiedUnits! / totalUnits) * 100)
    : 0

  return {
    total: totalUnits || 0,
    vacant: vacantUnits || 0,
    occupied: occupiedUnits || 0,
    maintenance: maintenanceUnits || 0,
    occupancyRate
  }
}