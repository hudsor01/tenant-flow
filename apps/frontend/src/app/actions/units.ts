/**
 * Next.js 15 Server Actions for Units
 * NATIVE: Direct server-side operations with 'use server' directive
 */
'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import type { UnitStats as SharedUnitStats } from '@repo/shared'

// Get API URL from environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// Helper to get auth token
async function getAuthToken(): Promise<string | null> {
  // TODO: Get auth token from cookies/session
  return null
}

// Unit types - backend handles all database operations
interface Unit {
  id: string
  propertyId: string
  unitNumber: string
  bedrooms: number
  bathrooms: number
  squareFeet: number | null
  rent: number
  status: string
  createdAt: string
  updatedAt: string
}

interface CreateUnitData {
  propertyId: string
  unitNumber: string
  bedrooms: number
  bathrooms: number
  squareFeet?: number
  rent: number
  status: string
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface UpdateUnitData extends Partial<CreateUnitData> {}

// Define local interfaces for component needs  
interface UnitQuery {
  search?: string
  status?: string
  propertyId?: string
}

/**
 * Server Action: Get all units
 * Backend handles all database queries
 */
export async function getUnits(query?: UnitQuery): Promise<Unit[]> {
  try {
    const token = await getAuthToken()
    const queryParams = new URLSearchParams()
    
    if (query?.search) queryParams.append('search', query.search)
    if (query?.status) queryParams.append('status', query.status)
    if (query?.propertyId) queryParams.append('propertyId', query.propertyId)
    
    const response = await fetch(`${API_URL}/units?${queryParams}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      next: {
        tags: ['units'],
        revalidate: 60
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch units: ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch units:', error)
    throw new Error('Failed to fetch units')
  }
}

/**
 * Server Action: Get single unit
 * Backend handles database query
 */
export async function getUnit(id: string): Promise<Unit> {
  try {
    const token = await getAuthToken()
    
    const response = await fetch(`${API_URL}/units/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      next: {
        tags: [`unit-${id}`],
        revalidate: 60
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch unit: ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch unit:', error)
    throw new Error('Unit not found')
  }
}

/**
 * Server Action: Create unit
 * Backend handles all validations and database operations
 */
export async function createUnit(formData: FormData): Promise<Unit> {
  try {
    const token = await getAuthToken()
    
    const unitData: CreateUnitData = {
      propertyId: formData.get('property_id') as string,
      unitNumber: formData.get('unit_number') as string,
      bedrooms: parseInt(formData.get('bedrooms') as string, 10) || 1,
      bathrooms: parseFloat(formData.get('bathrooms') as string) || 1,
      squareFeet: parseInt(formData.get('square_feet') as string, 10) || undefined,
      rent: parseFloat(formData.get('rent') as string) || 0,
      status: formData.get('status') as string || 'VACANT'
    }
    
    const response = await fetch(`${API_URL}/units`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: JSON.stringify(unitData)
    })
    
    if (!response.ok) {
      throw new Error(`Failed to create unit: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    // Revalidate caches
    revalidatePath('/units')
    revalidatePath('/properties')
    revalidatePath('/dashboard')
    revalidateTag('units')
    
    return result
  } catch (error) {
    console.error('Failed to create unit:', error)
    throw new Error('Failed to create unit')
  }
}

/**
 * Server Action: Update unit
 * Backend handles all validations
 */
export async function updateUnit(
  id: string,
  formData: FormData
): Promise<Unit> {
  try {
    const token = await getAuthToken()
    
    const updateData: UpdateUnitData = {}
    
    // Extract only provided fields
    if (formData.has('unitNumber')) updateData.unitNumber = formData.get('unitNumber') as string
    if (formData.has('bedrooms')) updateData.bedrooms = parseInt(formData.get('bedrooms') as string, 10)
    if (formData.has('bathrooms')) updateData.bathrooms = parseFloat(formData.get('bathrooms') as string)
    if (formData.has('squareFeet')) updateData.squareFeet = parseInt(formData.get('squareFeet') as string, 10)
    if (formData.has('monthlyRent')) updateData.rent = parseFloat(formData.get('monthlyRent') as string)
    if (formData.has('status')) updateData.status = formData.get('status') as string
    
    const response = await fetch(`${API_URL}/units/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: JSON.stringify(updateData)
    })
    
    if (!response.ok) {
      throw new Error(`Failed to update unit: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    // Revalidate caches
    revalidatePath('/units')
    revalidatePath(`/units/${id}`)
    revalidatePath('/properties')
    revalidatePath('/dashboard')
    revalidateTag('units')
    
    return result
  } catch (error) {
    console.error('Failed to update unit:', error)
    throw new Error('Failed to update unit')
  }
}

/**
 * Server Action: Update unit availability
 * Backend handles status update
 */
export async function updateUnitAvailability(
  id: string,
  isAvailable: boolean
): Promise<Unit> {
  try {
    const token = await getAuthToken()
    const status = isAvailable ? 'VACANT' : 'OCCUPIED'
    
    const response = await fetch(`${API_URL}/units/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: JSON.stringify({ status })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to update unit availability: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    // Revalidate caches
    revalidatePath('/units')
    revalidatePath(`/units/${id}`)
    revalidateTag('units')
    
    return result
  } catch (error) {
    console.error('Failed to update unit availability:', error)
    throw new Error('Failed to update unit availability')
  }
}

/**
 * Server Action: Get unit statistics
 * ALL calculations done by backend RPC function
 */
export async function getUnitStats(): Promise<SharedUnitStats> {
  try {
    const token = await getAuthToken()
    
    const response = await fetch(`${API_URL}/units/stats`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      next: {
        tags: ['unit-stats'],
        revalidate: 60
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch unit stats: ${response.statusText}`)
    }
    
    // Backend returns fully calculated UnitStats
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch unit statistics:', error)
    throw new Error('Failed to fetch unit statistics')
  }
}