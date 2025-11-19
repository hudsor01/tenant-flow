import { z } from 'zod'

/** Image URL validation schema */
export const imageUrlSchema = z
	.string()
	.refine(
		url => {
			// Allow empty/null
			if (!url) return true

			// Allow data URLs for base64 encoded images (excluding SVG for XSS protection)
			if (url.startsWith('data:image/')) {
				return /^data:image\/(jpeg|jpg|png|gif|webp);base64,/.test(url)
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