import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

export interface UploadOptions {
  bucketName: string
  path?: string
  maxSize?: number
  allowedMimeTypes?: string[]
}

export interface UploadResult {
  url: string
  path: string
  filename: string
  size: number
  mimeType: string
}

/**
 * Utility functions for Supabase Storage operations
 */

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  file: File,
  user: User,
  options: UploadOptions
): Promise<UploadResult> {
  const { bucketName, path = '', maxSize = 10 * 1024 * 1024, allowedMimeTypes = [] } = options

  // Validate file size
  if (file.size > maxSize) {
    throw new Error(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`)
  }

  // Validate MIME type
  if (allowedMimeTypes.length > 0 && !allowedMimeTypes.some(type => 
    type === '*' || 
    type === file.type || 
    (type.endsWith('/*') && file.type.startsWith(type.slice(0, -2)))
  )) {
    throw new Error(`File type ${file.type} is not allowed`)
  }

  // Generate unique filename
  const timestamp = Date.now()
  const extension = file.name.split('.').pop()
  const filename = `${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`
  const fullPath = path ? `${path}/${filename}` : filename

  // Upload to Supabase Storage
  const { error } = await supabase.storage
    .from(bucketName)
    .upload(fullPath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    throw error
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(fullPath)

  return {
    url: urlData.publicUrl,
    path: fullPath,
    filename: file.name,
    size: file.size,
    mimeType: file.type
  }
}

/**
 * Upload a property image and save to database
 */
export async function uploadPropertyImage(
  file: File,
  propertyId: string,
  user: User,
  isPrimary: boolean = false
): Promise<{ url: string; documentId: string }> {
  // Upload file to storage
  const uploadResult = await uploadFile(file, user, {
    bucketName: 'property-images',
    path: `user-${user.id}/property-${propertyId}`,
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/*']
  })

  // Save document metadata to database
  const { data: document, error: docError } = await supabase
    .from('Document')
    .insert({
      name: uploadResult.filename,
      url: uploadResult.url,
      type: 'PROPERTY_PHOTO',
      propertyId: propertyId,
      uploadedBy: user.id,
      size: uploadResult.size
    })
    .select()
    .single()

  if (docError) {
    // Try to clean up the uploaded file
    await supabase.storage
      .from('property-images')
      .remove([uploadResult.path])
    throw docError
  }

  // If this is the primary image, update the property
  if (isPrimary) {
    const { error: propertyError } = await supabase
      .from('Property')
      .update({ imageUrl: uploadResult.url })
      .eq('id', propertyId)

    if (propertyError) {
      console.error('Failed to update property primary image:', propertyError)
      // Don't throw here - the document was still created successfully
    }
  }

  return {
    url: uploadResult.url,
    documentId: document.id
  }
}

/**
 * Get public URL for a storage path
 */
export function getStoragePublicUrl(bucketName: string, path: string): string {
  const { data } = supabase.storage
    .from(bucketName)
    .getPublicUrl(path)
  
  return data.publicUrl
}

/**
 * Delete a file from storage
 */
export async function deleteStorageFile(bucketName: string, path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(bucketName)
    .remove([path])

  if (error) {
    throw error
  }
}

/**
 * Get property image URL from database or storage path
 */
export function getPropertyImageUrl(property: { imageUrl?: string | null }): string {
  // If property has an imageUrl, use it directly
  if (property.imageUrl) {
    return property.imageUrl
  }

  // Return a placeholder image
  return '/api/placeholder/400/300'
}

/**
 * Delete property document and its storage file
 */
export async function deletePropertyDocument(documentId: string): Promise<void> {
  // Get document details first
  const { data: document, error: fetchError } = await supabase
    .from('Document')
    .select('url, type')
    .eq('id', documentId)
    .single()

  if (fetchError) {
    throw fetchError
  }

  // Extract storage path from URL
  const url = new URL(document.url)
  const pathSegments = url.pathname.split('/')
  const bucketName = pathSegments[4] // /storage/v1/object/public/{bucket}
  const filePath = pathSegments.slice(5).join('/')

  // Delete from storage
  try {
    await deleteStorageFile(bucketName, filePath)
  } catch (error) {
    console.error('Failed to delete file from storage:', error)
    // Continue with database deletion even if storage deletion fails
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from('Document')
    .delete()
    .eq('id', documentId)

  if (deleteError) {
    throw deleteError
  }
}

/**
 * List all storage buckets (useful for debugging)
 */
export async function listStorageBuckets(): Promise<string[]> {
  const { data, error } = await supabase.storage.listBuckets()
  
  if (error) {
    throw error
  }

  return data.map(bucket => bucket.name)
}

/**
 * Create a storage bucket if it doesn't exist
 */
export async function createStorageBucket(
  bucketName: string, 
  isPublic: boolean = true
): Promise<void> {
  const { error } = await supabase.storage.createBucket(bucketName, {
    public: isPublic,
    allowedMimeTypes: isPublic ? undefined : ['image/*', 'application/pdf'],
    fileSizeLimit: 10 * 1024 * 1024 // 10MB
  })

  if (error && !error.message.includes('already exists')) {
    throw error
  }
}