/**
 * Modern Server Actions - React 19 + Next.js 15
 * Native form handling without external dependencies
 */

'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger/logger'

/**
 * Property creation with React 19 form action
 * Handles form submission natively without React Hook Form
 */
export async function createPropertyAction(formData: FormData) {
  try {
    // Extract form data using native FormData API
    const propertyData = {
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      zipCode: formData.get('zipCode') as string,
      propertyType: formData.get('propertyType') as string,
      description: formData.get('description') as string
    }

    // Validation - native JavaScript
    if (!propertyData.name || !propertyData.address) {
      throw new Error('Name and address are required')
    }

    // Simulate API call (replace with actual backend call)
    logger.info('Creating property', propertyData)
    
    // Mock success - in real app, call your backend
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Revalidate the properties page cache
    revalidatePath('/properties')
    
    // Redirect to properties list
    redirect('/properties')
    
  } catch (error) {
    logger.error('Property creation failed', error instanceof Error ? error : new Error(String(error)))
    throw error
  }
}

/**
 * Property update action
 */
export async function updatePropertyAction(
  propertyId: string,
  formData: FormData
) {
  try {
    const updates = {
      id: propertyId,
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      zipCode: formData.get('zipCode') as string,
      description: formData.get('description') as string
    }

    logger.info('Updating property', updates)
    
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Revalidate specific property and list
    revalidatePath(`/properties/${propertyId}`)
    revalidatePath('/properties')
    
    redirect('/properties')
    
  } catch (error) {
    logger.error('Property update failed', error instanceof Error ? error : new Error(String(error)), { propertyId })
    throw error
  }
}

/**
 * Property deletion action
 */
export async function deletePropertyAction(propertyId: string) {
  try {
    logger.info('Deleting property', { propertyId })
    
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Revalidate properties list
    revalidatePath('/properties')
    
    return { success: true }
    
  } catch (error) {
    logger.error('Property deletion failed', error instanceof Error ? error : new Error(String(error)), { propertyId })
    throw error
  }
}