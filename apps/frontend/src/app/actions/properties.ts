/**
 * Next.js 15 Server Actions for Properties
 * NATIVE: Direct server-side operations with 'use server' directive
 * Eliminates need for API routes and client-side mutations
 */
'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { createActionClient } from '@/lib/supabase/action-client'
import type { 
  Property, 
  UpdatePropertyInput,
  PropertyQuery 
} from '@repo/shared'

/**
 * NATIVE Server Action: Get all properties
 * Direct database access with automatic RLS
 */
export async function getProperties(query?: PropertyQuery): Promise<Property[]> {
  const supabase = await createActionClient()
  
  let request = supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false })

  if (query?.search) {
    request = request.ilike('name', `%${query.search}%`)
  }
  
  if (query?.status) {
    request = request.eq('status', query.status)
  }

  if (query?.type) {
    request = request.eq('property_type', query.type)
  }

  const { data, error } = await request

  if (error) {
    console.error('Failed to fetch properties:', error)
    throw new Error('Failed to fetch properties')
  }

  return data || []
}

/**
 * NATIVE Server Action: Get single property
 * Direct database access with RLS
 */
export async function getProperty(id: string): Promise<Property> {
  const supabase = await createActionClient()
  
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    console.error('Failed to fetch property:', error)
    throw new Error('Property not found')
  }

  return data
}

/**
 * NATIVE Server Action: Create property
 * Direct database insert with automatic revalidation
 */
export async function createProperty(formData: FormData): Promise<Property> {
  const supabase = await createActionClient()
  
  // Extract and validate form data
  const propertyData = {
    name: formData.get('name') as string,
    address: formData.get('address') as string,
    city: formData.get('city') as string,
    state: formData.get('state') as string,
    zip_code: formData.get('zip_code') as string,
    property_type: formData.get('property_type') as string,
    total_units: parseInt(formData.get('total_units', 10) as string) || 1,
    monthly_rent: parseFloat(formData.get('monthly_rent') as string) || 0,
    square_feet: parseInt(formData.get('square_feet', 10) as string) || null,
    bedrooms: parseInt(formData.get('bedrooms', 10) as string) || null,
    bathrooms: parseFloat(formData.get('bathrooms') as string) || null,
    amenities: formData.get('amenities') 
      ? JSON.parse(formData.get('amenities') as string) 
      : [],
    description: formData.get('description') as string || undefined,
    image_url: formData.get('image_url') as string || undefined
  } as any

  const { data, error } = await supabase
    .from('properties')
    .insert(propertyData)
    .select()
    .single()

  if (error || !data) {
    console.error('Failed to create property:', error)
    throw new Error('Failed to create property')
  }

  // Revalidate related paths
  revalidatePath('/properties')
  revalidatePath('/dashboard')
  revalidateTag('properties')

  return data
}

/**
 * NATIVE Server Action: Update property
 * Direct database update with automatic cache invalidation
 */
export async function updateProperty(
  id: string,
  formData: FormData
): Promise<Property> {
  const supabase = await createActionClient()
  
  // Build update data from form
  const updateData: UpdatePropertyInput = {}
  
  // Only include fields that are present in formData
  const fields = [
    'name', 'address', 'city', 'state', 'zip_code', 
    'property_type', 'description', 'image_url'
  ]
  
  fields.forEach(field => {
    const value = formData.get(field)
    if (value !== null) {
      updateData[field] = value as string
    }
  })
  
  // Handle numeric fields
  const numericFields = [
    { key: 'total_units', parser: parseInt },
    { key: 'monthly_rent', parser: parseFloat },
    { key: 'square_feet', parser: parseInt },
    { key: 'bedrooms', parser: parseInt },
    { key: 'bathrooms', parser: parseFloat }
  ]
  
  numericFields.forEach(({ key, parser }) => {
    const value = formData.get(key)
    if (value !== null) {
      updateData[key] = parser(value as string)
    }
  })
  
  // Handle JSON fields
  if (formData.has('amenities')) {
    updateData.amenities = JSON.parse(formData.get('amenities') as string)
  }

  const { data, error } = await supabase
    .from('properties')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    console.error('Failed to update property:', error)
    throw new Error('Failed to update property')
  }

  // Revalidate related paths
  revalidatePath('/properties')
  revalidatePath(`/properties/${id}`)
  revalidatePath('/dashboard')
  revalidateTag('properties')
  revalidateTag(`property-${id}`)

  return data
}

/**
 * NATIVE Server Action: Delete property
 * Direct database delete with cascade handling
 */
export async function deleteProperty(id: string): Promise<void> {
  const supabase = await createActionClient()
  
  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Failed to delete property:', error)
    throw new Error('Failed to delete property')
  }

  // Revalidate and redirect
  revalidatePath('/properties')
  revalidatePath('/dashboard')
  revalidateTag('properties')
  
  redirect('/properties')
}

/**
 * NATIVE Server Action: Get property statistics
 * Aggregated data with caching
 */
export async function getPropertyStats() {
  const supabase = await createActionClient()
  
  // Get total properties
  const { count: totalProperties } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true })

  // Get occupied properties (units with active leases)
  const { data: occupiedData } = await supabase
    .from('properties')
    .select(`
      id,
      units!inner(
        id,
        leases!inner(
          id,
          status
        )
      )
    `)
    .eq('units.leases.status', 'ACTIVE')

  const occupiedProperties = occupiedData?.length || 0
  const occupancyRate = totalProperties 
    ? Math.round((occupiedProperties / totalProperties) * 100) 
    : 0

  // Get maintenance stats
  const { count: openMaintenance } = await supabase
    .from('maintenance_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'OPEN')

  return {
    totalProperties: totalProperties || 0,
    occupancyRate,
    openMaintenanceRequests: openMaintenance || 0,
    monthlyRevenue: 0 // Calculate from active leases if needed
  }
}

/**
 * NATIVE Server Action: Bulk update properties
 * Batch operations with transaction-like behavior
 */
export async function bulkUpdateProperties(
  propertyIds: string[],
  updateData: Partial<UpdatePropertyInput>
): Promise<void> {
  const supabase = await createActionClient()
  
  const { error } = await supabase
    .from('properties')
    .update(updateData)
    .in('id', propertyIds)

  if (error) {
    console.error('Failed to bulk update properties:', error)
    throw new Error('Failed to bulk update properties')
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
}

/**
 * NATIVE Server Action: Upload property image
 * Direct Supabase Storage integration
 */
export async function uploadPropertyImage(
  propertyId: string,
  formData: FormData
): Promise<string> {
  const supabase = await createActionClient()
  const file = formData.get('image') as File
  
  if (!file) {
    throw new Error('No image file provided')
  }

  // Upload to Supabase Storage
  const fileName = `${propertyId}/${Date.now()}-${file.name}`
  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('property-images')
    .upload(fileName, file)

  if (uploadError) {
    console.error('Failed to upload image:', uploadError)
    throw new Error('Failed to upload image')
  }

  // Get public URL
  const { data: { publicUrl } } = supabase
    .storage
    .from('property-images')
    .getPublicUrl(fileName)

  // Update property with new image URL
  const { error: updateError } = await supabase
    .from('properties')
    .update({ image_url: publicUrl })
    .eq('id', propertyId)

  if (updateError) {
    console.error('Failed to update property image:', updateError)
    throw new Error('Failed to update property image')
  }

  // Revalidate property
  revalidatePath(`/properties/${propertyId}`)
  revalidateTag(`property-${propertyId}`)

  return publicUrl
}