'use client'

import React, { useMemo } from 'react'
import DOMPurify from 'dompurify'

interface SafeHTMLProps {
	html: string
	className?: string
	/**
	 * DOMPurify configuration options
	 * @see https://github.com/cure53/DOMPurify#can-i-configure-dompurify
	 */
	options?: DOMPurify.Config
}

/**
 * SafeHTML Component
 * 
 * A secure component for rendering HTML content that prevents XSS attacks.
 * Uses DOMPurify to sanitize HTML before rendering with dangerouslySetInnerHTML.
 * 
 * @example
 * ```tsx
 * <SafeHTML html={userGeneratedContent} className="prose" />
 * ```
 * 
 * @param {string} html - The HTML string to sanitize and render
 * @param {string} className - Optional CSS classes to apply
 * @param {DOMPurify.Config} options - Optional DOMPurify configuration
 */
export const SafeHTML: React.FC<SafeHTMLProps> = ({ 
	html, 
	className,
	options = {}
}) => {
	// Memoize the sanitized HTML to avoid re-sanitizing on every render
	const sanitizedHTML = useMemo(() => {
		if (!html) return ''
		
		// Default safe configuration
		const defaultOptions: DOMPurify.Config = {
			ALLOWED_TAGS: [
				'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
				'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code', 
				'pre', 'hr', 'div', 'span', 'img', 'table', 'thead', 'tbody',
				'tr', 'td', 'th'
			],
			ALLOWED_ATTR: [
				'href', 'target', 'rel', 'class', 'id', 'alt', 'src', 
				'width', 'height', 'title'
			],
			ALLOW_DATA_ATTR: false,
			// Prevent javascript: protocol
			ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
			// Add target="_blank" and rel="noopener noreferrer" to external links
			ADD_ATTR: ['target', 'rel'],
			// Remove dangerous tags even if they were allowed
			FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
			FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
			...options
		}
		
		// Sanitize the HTML
		const clean = DOMPurify.sanitize(html, defaultOptions)
		
		// Additional security: Add rel="noopener noreferrer" to external links
		if (typeof window !== 'undefined') {
			const parser = new DOMParser()
			const doc = parser.parseFromString(clean, 'text/html')
			const links = doc.querySelectorAll('a[target="_blank"]')
			
			links.forEach(link => {
				link.setAttribute('rel', 'noopener noreferrer')
			})
			
			return doc.body.innerHTML
		}
		
		return clean
	}, [html, options])
	
	// Don't render if no content
	if (!sanitizedHTML) {
		return null
	}
	
	return (
		<div 
			className={className}
			dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
			// Add CSP nonce if available
			{...(typeof window !== 'undefined' && 
				window.__CSP_NONCE__ ? { nonce: window.__CSP_NONCE__ } : {})}
		/>
	)
}

/**
 * Utility function to sanitize HTML strings without rendering
 * Useful for sanitizing data before storing or processing
 * 
 * @param html - The HTML string to sanitize
 * @param options - Optional DOMPurify configuration
 * @returns Sanitized HTML string
 */
export const sanitizeHTML = (
	html: string, 
	options?: DOMPurify.Config
): string => {
	if (!html) return ''
	
	return DOMPurify.sanitize(html, {
		ALLOWED_TAGS: [
			'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
			'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code', 'pre'
		],
		ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id'],
		ALLOW_DATA_ATTR: false,
		...options
	})
}

// Type augmentation for CSP nonce
declare global {
	interface Window {
		__CSP_NONCE__?: string
	}
}

export default SafeHTML