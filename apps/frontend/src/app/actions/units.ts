/**
 * Next.js 15 Server Actions for Units
 * NATIVE: Direct server-side operations with 'use server' directive
 */
'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createActionClient } from '@/lib/supabase/action-client'
import type { 
  Unit,
  UnitQuery,
  UnitStats
} from '@repo/shared'

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
  
  // Direct database insert - no type validation needed
  const unitData = {
    property_id: formData.get('property_id') as string,
    unit_number: formData.get('unit_number') as string,
    floor: parseInt(formData.get('floor', 10) as string) || null,
    bedrooms: parseInt(formData.get('bedrooms', 10) as string) || 1,
    bathrooms: parseFloat(formData.get('bathrooms') as string) || 1,
    square_feet: parseInt(formData.get('square_feet', 10) as string) || null,
    monthly_rent: parseFloat(formData.get('monthly_rent') as string),
    status: formData.get('status') as string || 'VACANT',
    amenities: formData.has('amenities')
      ? JSON.parse(formData.get('amenities') as string)
      : [],
    notes: formData.get('notes') as string || null
  } as any

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
    totalUnits: totalUnits || 0,
    occupiedUnits: occupiedUnits || 0,
    vacantUnits: vacantUnits || 0,
    maintenanceUnits: maintenanceUnits || 0,
    occupancyRate
  }
}