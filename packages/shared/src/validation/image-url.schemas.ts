/**
 * Image URL Validation
 *
 * Security: Only allow images from trusted sources
 * - Supabase Storage (our CDN)
 * - Data URLs for base64 encoded images (for upload previews)
 */

import { z } from 'zod'

/**
 * Validates image URLs from trusted sources
 *
 * Allowed patterns:
 * - Supabase Storage: https://*.supabase.co/storage/v1/object/public/*
 * - Data URLs: data:image/*;base64,*
 */
export const imageUrlSchema = z
	.string()
	.refine(
		url => {
			// Allow empty/null
			if (!url) return true

			// Allow data URLs for base64 encoded images
			if (url.startsWith('data:image/')) {
				return /^data:image\/(jpeg|jpg|png|gif|webp|svg\+xml);base64,/.test(url)
			}

			// Allow Supabase Storage URLs
			if (url.includes('.supabase.co/storage/v1/object/public/')) {
				try {
					const urlObj = new URL(url)
					return (
						urlObj.protocol === 'https:' &&
						urlObj.hostname.endsWith('.supabase.co') &&
						urlObj.pathname.startsWith('/storage/v1/object/public/')
					)
				} catch {
					return false
				}
			}

			return false
		},
		{
			message:
				'Image URL must be from Supabase Storage or a valid base64 data URL'
		}
	)
	.optional()
	.nullable()

/**
 * Validates required image URLs
 */
export const requiredImageUrlSchema = imageUrlSchema.refine(url => !!url, {
	message: 'Image URL is required'
})
