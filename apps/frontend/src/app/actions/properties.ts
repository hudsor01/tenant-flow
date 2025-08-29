/**
 * Next.js 15 Server Actions for Properties
 * NATIVE: Direct server-side operations with 'use server' directive
 * Eliminates need for API routes and client-side mutations
 */
'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { createActionClient } from '@/lib/supabase/action-client'
import type { Database, PropertyWithUnits } from '@repo/shared'
import { processFormData, executeSupabaseAction, PROPERTY_FORM_FIELDS } from '@/lib/actions/form-action-factory'

// Define types directly from Database schema - NO DUPLICATION
type Property = Database['public']['Tables']['Property']['Row']
type Unit = Database['public']['Tables']['Unit']['Row']
type CreatePropertyInput = Database['public']['Tables']['Property']['Insert']
type UpdatePropertyInput = Database['public']['Tables']['Property']['Update']

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

// Shared response formatting for property operations - DRY principle
function formatPropertyResponse(data: unknown): PropertyWithUnits {
  const propertyData = data as Property & { units?: Unit[] }
  return {
    ...propertyData,
    units: propertyData.units || []
  } as PropertyWithUnits
}


/**
 * NATIVE Server Action: Get all properties with calculated stats
 * Direct database access with automatic RLS
 * Returns properties with their units for stat calculations
 */
export async function getPropertiesWithStats(query?: PropertyQuery) {
  const supabase = await createActionClient()
  
  // Use specialized select for units stats
  let request = supabase
    .from('properties')
    .select(`
      *,
      units (
        id,
        name,
        status,
        rent,
        property_id
      )
    `)
    .order('created_at', { ascending: false })

  // Apply common filters
  if (query?.search) {
    request = request.ilike('name', `%${query.search}%`)
  }
  
  if (query?.status) {
    request = request.eq('status', query.status)
  }

  const { data: properties, error } = await request

  if (error) {
    handlePropertyError('fetch properties with units', error)
  }

  // Transform to PropertyWithUnits type
  return (properties || []).map((property: PropertyWithUnits) => 
    formatPropertyResponse(property)
  )
}

/**
 * NATIVE Server Action: Get all properties (legacy - without units)
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
    handlePropertyError('fetch properties', error)
  }

  return data || []
}

/**
 * NATIVE Server Action: Get single property
 * Direct database access with RLS
 */
export async function getProperty(id: string): Promise<PropertyWithUnits> {
  const supabase = await createActionClient()
  
  const { data, error } = await supabase
    .from('properties')
    .select(`*, units (*)`)
    .eq('id', id)
    .single()

  if (error || !data) {
    handlePropertyError('fetch property', error || new Error('Property not found'))
  }

  // Transform to PropertyWithUnits
  return formatPropertyResponse(data)
}

// executePropertyAction was consolidated into executeSupabaseAction utility (removed unused function)

/**
 * NATIVE Server Action: Create property
 * Direct database insert with automatic revalidation
 */
export async function createProperty(formData: FormData): Promise<PropertyWithUnits> {
  // Process form data using consolidated utility
  const propertyData = processFormData<CreatePropertyInput>(formData, [
    ...PROPERTY_FORM_FIELDS.filter(field => 
      ['name', 'address', 'city', 'state', 'zip_code', 'description'].includes(field.key)
    ),
    { key: 'ownerId', defaultValue: 'user-id' } // TODO: Get from auth context
  ])

  return executeSupabaseAction(
    {
      actionName: 'create property',
      table: 'Property',
      revalidatePaths: ['/properties', '/dashboard'],
      transform: formatPropertyResponse
    },
    async (supabase) => {
      const result = await supabase
        .from('properties')
        .insert(propertyData)
        .select(`*, units (*)`)
        .single()
      
      return {
        data: result.data,
        error: result.error ? new Error(result.error.message) : null
      }
    }
  )
}

/**
 * NATIVE Server Action: Update property
 * Direct database update with automatic cache invalidation
 */
export async function updateProperty(
  id: string,
  formData: FormData
): Promise<PropertyWithUnits> {
  // Process form data using consolidated utility
  const updateData = processFormData<UpdatePropertyInput>(formData, PROPERTY_FORM_FIELDS)

  return executeSupabaseAction(
    {
      actionName: 'update property',
      table: 'Property',
      revalidatePaths: ['/properties', '/dashboard', `/properties/${id}`],
      transform: formatPropertyResponse
    },
    async (supabase) => {
      const result = await supabase
        .from('properties')
        .update(updateData)
        .eq('id', id)
        .select(`*, units (*)`)
        .single()
      
      return {
        data: result.data,
        error: result.error ? new Error(result.error.message) : null
      }
    }
  )
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
    handlePropertyError('delete property', error)
  }

  // Revalidate and redirect
  revalidatePropertyPaths()
  
  redirect('/properties')
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
  const { error: uploadError } = await supabase
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
