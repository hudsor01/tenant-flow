import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

import { CreatePropertyOptions, PropertyType } from '@repo/shared/types/property'

export async function createTestProperty(options: CreatePropertyOptions): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('Property')
    .insert({
      name: options.name,
      ownerId: options.ownerId,
      address: options.address || '123 Test St',
      city: options.city || 'Test City',
      state: options.state || 'CA',
      zipCode: options.zipCode || '12345',
      propertyType: PropertyType.SINGLE_FAMILY
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create test property: ${error.message}`)
  }

  return data.id
}

export async function cleanupTestProperties(propertyIds: string[]): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('Property')
      .delete()
      .in('id', propertyIds)

    if (error) {
      console.error('Failed to cleanup properties:', error)
    }
  } catch (error) {
    console.error('Error during property cleanup:', error)
  }
}
