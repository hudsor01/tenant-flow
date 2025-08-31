/**
 * Next.js 15 Server Actions for Properties
 * NATIVE: Direct server-side operations with 'use server' directive
 * Eliminates need for API routes and client-side mutations
 */
'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import type { PropertyWithUnits } from '@repo/shared'

// Property types - backend handles all database operations
interface CreatePropertyData {
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  propertyType?: string
  description?: string
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface UpdatePropertyData extends Partial<CreatePropertyData> {}

// Define query types locally (specific to this component's needs)
interface PropertyQuery {
  search?: string
  status?: string
  type?: string
}

// Shared error handling for property operations - DRY principle
function handlePropertyError(operation: string, error: unknown): never {
  console.error(`Failed to ${operation}:`, error)
  throw new Error(`Failed to ${operation}`)
}

// Shared revalidation for property changes - DRY principle
function revalidatePropertyPaths(propertyId?: string): void {
  revalidatePath('/properties')
  revalidatePath('/dashboard')
  revalidateTag('properties')
  
  if (propertyId) {
    revalidatePath(`/properties/${propertyId}`)
    revalidateTag(`property-${propertyId}`)
  }
}

// Get API URL from environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// Helper to get auth token (implement based on your auth strategy)
async function getAuthToken(): Promise<string | null> {
  // TODO: Get auth token from cookies/session
  return null
}


/**
 * Server Action: Get all properties with calculated stats
 * ALL calculations done by backend RPC functions
 */
export async function getPropertiesWithStats(query?: PropertyQuery): Promise<PropertyWithUnits[]> {
  try {
    const token = await getAuthToken()
    const queryParams = new URLSearchParams()
    
    if (query?.search) queryParams.append('search', query.search)
    if (query?.status) queryParams.append('status', query.status)
    if (query?.type) queryParams.append('type', query.type)
    
    const response = await fetch(`${API_URL}/properties?${queryParams}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      next: {
        tags: ['properties'],
        revalidate: 60 // Cache for 1 minute
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch properties: ${response.statusText}`)
    }
    
    // Backend returns fully calculated PropertyWithUnits[]
    return await response.json()
  } catch (error) {
    handlePropertyError('fetch properties with stats', error)
  }
}

/**
 * Server Action: Get all properties (legacy compatibility)
 * Delegates to getPropertiesWithStats
 */
export async function getProperties(query?: PropertyQuery): Promise<PropertyWithUnits[]> {
  // Use the same endpoint - backend handles everything
  return getPropertiesWithStats(query)
}

/**
 * Server Action: Get single property
 * Backend returns fully calculated PropertyWithUnits
 */
export async function getProperty(id: string): Promise<PropertyWithUnits> {
  try {
    const token = await getAuthToken()
    
    const response = await fetch(`${API_URL}/properties/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      next: {
        tags: [`property-${id}`],
        revalidate: 60
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch property: ${response.statusText}`)
    }
    
    // Backend returns fully calculated PropertyWithUnits
    return await response.json()
  } catch (error) {
    handlePropertyError('fetch property', error)
  }
}

// executePropertyAction was consolidated into executeSupabaseAction utility (removed unused function)

/**
 * Server Action: Create property
 * Backend handles all database operations and validations
 */
export async function createProperty(formData: FormData): Promise<PropertyWithUnits> {
  try {
    const token = await getAuthToken()
    
    // Extract form data
    const propertyData: CreatePropertyData = {
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      zipCode: formData.get('zipCode') as string,
      propertyType: formData.get('propertyType') as string || undefined,
      description: formData.get('description') as string || undefined
    }
    
    const response = await fetch(`${API_URL}/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: JSON.stringify(propertyData)
    })
    
    if (!response.ok) {
      throw new Error(`Failed to create property: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    // Revalidate caches
    revalidatePropertyPaths()
    
    return result
  } catch (error) {
    handlePropertyError('create property', error)
  }
}

/**
 * Server Action: Update property
 * Backend handles all database operations
 */
export async function updateProperty(
  id: string,
  formData: FormData
): Promise<PropertyWithUnits> {
  try {
    const token = await getAuthToken()
    
    // Extract form data
    const updateData: UpdatePropertyData = {}
    const fields = ['name', 'address', 'city', 'state', 'zipCode', 'propertyType', 'description']
    
    fields.forEach(field => {
      const value = formData.get(field)
      if (value !== null) {
        updateData[field as keyof UpdatePropertyData] = value as string
      }
    })
    
    const response = await fetch(`${API_URL}/properties/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: JSON.stringify(updateData)
    })
    
    if (!response.ok) {
      throw new Error(`Failed to update property: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    // Revalidate caches
    revalidatePropertyPaths(id)
    
    return result
  } catch (error) {
    handlePropertyError('update property', error)
  }
}

/**
 * Server Action: Delete property
 * Backend handles cascade deletion and RLS
 */
export async function deleteProperty(id: string): Promise<void> {
  try {
    const token = await getAuthToken()
    
    const response = await fetch(`${API_URL}/properties/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to delete property: ${response.statusText}`)
    }
    
    // Revalidate and redirect
    revalidatePropertyPaths()
    redirect('/properties')
  } catch (error) {
    handlePropertyError('delete property', error)
  }
}


/**
 * Server Action: Bulk update properties
 * Backend handles batch operations
 */
export async function bulkUpdateProperties(
  propertyIds: string[],
  updateData: UpdatePropertyData
): Promise<void> {
  try {
    const token = await getAuthToken()
    
    const response = await fetch(`${API_URL}/properties/bulk`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: JSON.stringify({
        propertyIds,
        updateData
      })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to bulk update properties: ${response.statusText}`)
    }
    
    // Revalidate all affected paths
    revalidatePath('/properties')
    revalidatePath('/dashboard')
    revalidateTag('properties')
    
    // Revalidate individual property pages
    propertyIds.forEach(id => {
      revalidatePath(`/properties/${id}`)
      revalidateTag(`property-${id}`)
    })
  } catch (error) {
    console.error('Failed to bulk update properties:', error)
    throw new Error('Failed to bulk update properties')
  }
}

/**
 * Server Action: Upload property image
 * Backend handles storage and database update
 */
export async function uploadPropertyImage(
  propertyId: string,
  formData: FormData
): Promise<string> {
  try {
    const token = await getAuthToken()
    const file = formData.get('image') as File
    
    if (!file) {
      throw new Error('No image file provided')
    }
    
    // Create FormData for file upload
    const uploadData = new FormData()
    uploadData.append('image', file)
    
    const response = await fetch(`${API_URL}/properties/${propertyId}/image`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: uploadData
    })
    
    if (!response.ok) {
      throw new Error(`Failed to upload image: ${response.statusText}`)
    }
    
    const { imageUrl } = await response.json()
    
    // Revalidate property
    revalidatePath(`/properties/${propertyId}`)
    revalidateTag(`property-${propertyId}`)
    
    return imageUrl
  } catch (error) {
    console.error('Failed to upload property image:', error)
    throw new Error('Failed to upload property image')
  }
}
