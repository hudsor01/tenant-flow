'use server'

import { revalidatePath } from 'next/cache'
import { serverFetch } from '@/lib/api/server'
import type { Property, PropertyWithUnits } from '@repo/shared'

/**
 * Server Actions for Properties
 * All business logic handled by backend/database
 * Frontend only triggers actions and displays results
 */

/**
 * Create a new property
 * Business logic validation happens in backend
 */
export async function createProperty(formData: FormData) {
  const propertyData = {
    name: formData.get('name'),
    address: formData.get('address'),
    city: formData.get('city'),
    state: formData.get('state'),
    zipCode: formData.get('zipCode'),
    type: formData.get('type'),
    units: parseInt(formData.get('units') as string) || 0
  }

  try {
    const result = await serverFetch<Property>('/api/v1/properties', {
      method: 'POST',
      body: JSON.stringify(propertyData)
    })

    // Revalidate the properties page to show new data
    revalidatePath('/dashboard/properties')

    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create property'
    }
  }
}

/**
 * Update an existing property
 * Backend handles validation and business rules
 */
export async function updateProperty(propertyId: string, formData: FormData) {
  const propertyData = {
    name: formData.get('name'),
    address: formData.get('address'),
    city: formData.get('city'),
    state: formData.get('state'),
    zipCode: formData.get('zipCode'),
    type: formData.get('type'),
    units: parseInt(formData.get('units') as string) || 0
  }

  try {
    const result = await serverFetch<Property>(
      `/api/v1/properties/${propertyId}`,
      {
        method: 'PUT',
        body: JSON.stringify(propertyData)
      }
    )

    // Revalidate multiple paths that might display this property
    revalidatePath('/dashboard/properties')
    revalidatePath(`/dashboard/properties/${propertyId}`)
    revalidatePath('/dashboard')

    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update property'
    }
  }
}

/**
 * Delete a property
 * Backend ensures all business rules are followed (e.g., no active leases)
 */
export async function deleteProperty(propertyId: string) {
  try {
    await serverFetch(`/api/v1/properties/${propertyId}`, {
      method: 'DELETE'
    })

    // Revalidate affected pages
    revalidatePath('/dashboard/properties')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete property'
    }
  }
}

/**
 * Add a unit to a property
 * Backend calculates new metrics automatically
 */
export async function addUnitToProperty(propertyId: string, formData: FormData) {
  const unitData = {
    unitNumber: formData.get('unitNumber'),
    bedrooms: parseInt(formData.get('bedrooms') as string) || 0,
    bathrooms: parseInt(formData.get('bathrooms') as string) || 0,
    squareFeet: parseInt(formData.get('squareFeet') as string) || 0,
    rent: parseFloat(formData.get('rent') as string) || 0,
    status: formData.get('status') || 'VACANT'
  }

  try {
    const result = await serverFetch(
      `/api/v1/properties/${propertyId}/units`,
      {
        method: 'POST',
        body: JSON.stringify(unitData)
      }
    )

    // Revalidate to update property metrics
    revalidatePath('/dashboard/properties')
    revalidatePath(`/dashboard/properties/${propertyId}`)
    revalidatePath('/dashboard/properties/units')

    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add unit'
    }
  }
}

/**
 * Bulk update property status
 * Backend handles all affected calculations
 */
export async function bulkUpdatePropertyStatus(
  propertyIds: string[],
  status: 'active' | 'inactive' | 'maintenance'
) {
  try {
    await serverFetch('/api/v1/properties/bulk-update', {
      method: 'PATCH',
      body: JSON.stringify({ propertyIds, status })
    })

    // Revalidate all property-related pages
    revalidatePath('/dashboard/properties')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update properties'
    }
  }
}