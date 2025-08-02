import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { LeaseGenerator, downloadBlob } from '@/lib/lease-generator'
import { useAuth } from '@/hooks/useAuth'
import { supabaseClient } from '@/lib/clients/supabase-client'

import { logger } from '@/lib/logger'
import { toast } from 'sonner'
import type {
	LeaseGeneratorForm,
	LeaseGeneratorUsage,
	LeaseOutputFormat,
	LeaseGenerationResult
} from '@tenantflow/shared/types/lease-generator'

interface UseLeaseGeneratorOptions {
	onSuccess?: (result: LeaseGenerationResult) => void
	onError?: (error: Error) => void
}

export function useLeaseGenerator(options: UseLeaseGeneratorOptions = {}) {
	const [currentUsage, setCurrentUsage] =
		useState<LeaseGeneratorUsage | null>(null)
	const { user } = useAuth()

	// Get client information for usage tracking
	const getClientInfo = () => ({
		ipAddress: 'unknown', // Will be determined by server
		userAgent: navigator.userAgent,
		email: '' // Will be collected from form
	})

	// Check current usage status from backend analytics_events table
	const { data: usageData, refetch: refetchUsage } = useQuery({
		queryKey: ['lease-generator-usage', user?.id],
		queryFn: async () => {
			if (!user?.id) {
				// For non-authenticated users, use localStorage
				const clientInfo = getClientInfo()
				const storageKey = `lease_usage_${btoa(clientInfo.userAgent).slice(0, 20)}`
				const storedUsage = localStorage.getItem(storageKey)
				return storedUsage ? JSON.parse(storedUsage) : null
			}

			try {
				if (!supabaseClient) {
					throw new Error('Supabase client not available')
				}
				// Get token from Supabase session
				const { data: { session } } = await supabaseClient.auth.getSession()
				const token = session?.access_token
				
				if (!token) {
					throw new Error('No access token available')
				}

				// Query backend for authenticated users - would integrate with analytics_events table
				const response = await fetch('/api/v1/analytics/lease-generator-usage', {
					headers: {
						'Authorization': `Bearer ${token}`
					}
				})
				
				if (response.ok) {
					return await response.json()
				}
			} catch (error) {
				console.warn('Failed to fetch usage data from backend, falling back to localStorage', error)
			}

			// Fallback to localStorage
			const clientInfo = getClientInfo()
			const storageKey = `lease_usage_${btoa(clientInfo.userAgent).slice(0, 20)}`
			const storedUsage = localStorage.getItem(storageKey)
			return storedUsage ? JSON.parse(storedUsage) : null
		},
		staleTime: 5 * 60 * 1000 // 5 minutes
	})

	// Create or update usage record in localStorage (simplified for backend migration)
	const updateUsageMutation = useMutation({
		mutationFn: async (email: string) => {
			const clientInfo = getClientInfo()

			// Backend API integration placeholder for usage tracking
			// For now, use localStorage for all users
			const usage = usageData
			const storageKey = `lease_usage_${btoa(clientInfo.userAgent).slice(0, 20)}`

			if (usage) {
				// Update existing usage
				const updatedUsage = {
					...usage,
					usageCount: (usage.usageCount || 0) + 1,
					lastUsedAt: new Date().toISOString(),
					email: email || usage.email
				}
				localStorage.setItem(storageKey, JSON.stringify(updatedUsage))
				return updatedUsage
			} else {
				// Create new usage record
				const newUsage = {
					id: `local_${Date.now()}`,
					email,
					ipAddress: window.location.hostname,
					userAgent: clientInfo.userAgent,
					usageCount: 1,
					lastUsedAt: new Date().toISOString(),
					paymentStatus: 'free_trial',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				}
				localStorage.setItem(storageKey, JSON.stringify(newUsage))
				return newUsage
			}
		},
		onSuccess: data => {
			setCurrentUsage(data)
			void refetchUsage()
		}
	})

	// Generate lease documents
	const generateLeaseMutation = useMutation({
		mutationFn: async ({
			formData,
			format
		}: {
			formData: LeaseGeneratorForm
			format: LeaseOutputFormat
		}) => {
			// Check usage limits
			const usage = usageData || currentUsage
			const currentUsageCount = usage?.usageCount || 0
			const currentPaymentStatus = usage?.paymentStatus || 'free_trial'
			const currentAccessExpiresAt = usage?.accessExpiresAt

			// Check if paid access has expired
			const isCurrentPaidAccessExpired =
				currentPaymentStatus === 'paid' &&
				currentAccessExpiresAt &&
				new Date(currentAccessExpiresAt) < new Date()

			// Determine effective payment status for usage check
			const effectiveStatus = isCurrentPaidAccessExpired
				? 'free_trial'
				: currentPaymentStatus

			// Free trial allows 1 use, paid allows unlimited for 24 hours
			if (effectiveStatus === 'free_trial' && currentUsageCount >= 1) {
				throw new Error(
					'Usage limit exceeded. Payment required for additional lease generations.'
				)
			}

			// Update usage count
			await updateUsageMutation.mutateAsync(formData.landlordEmail)

			// Generate lease documents
			const generator = new LeaseGenerator(formData)

			let pdfUrl: string | undefined

			const fileName = `lease_${formData.propertyAddress.replace(/\s+/g, '_').toLowerCase()}`

			switch (format) {
				case 'pdf': {
					// Use lightweight PDF generation (browser print-to-PDF)
					const pdfBlob = await generator.generatePDF()
					// Note: Lightweight mode downloads HTML with print instructions
					// Users can then use browser's "Print to PDF" feature
					if (pdfBlob.size > 0) {
						downloadBlob(pdfBlob, `${fileName}.pdf`)
						pdfUrl = URL.createObjectURL(pdfBlob)
					}
					break
				}
				case 'docx': {
					// Generate DOCX using browser RTF conversion
					const content = generator.generateLeaseContent()
					const docxContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}} \\f0\\fs24 ${content.replace(/\n/g, '\\par ')}}}`
					const docxBlob = new Blob([docxContent], { type: 'application/rtf' })
					downloadBlob(docxBlob, `${fileName}.rtf`)
					pdfUrl = URL.createObjectURL(docxBlob)
					break
				}
				case 'both': {
					// Generate both PDF and DOCX, then create ZIP
					const pdfBlob = await generator.generatePDF()
					const content = generator.generateLeaseContent()
					const docxContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}} \\f0\\fs24 ${content.replace(/\n/g, '\\par ')}}}`
					const docxBlob = new Blob([docxContent], { type: 'application/rtf' })
					
					// Create a simple text-based ZIP manifest
					const zipManifest = `LEASE AGREEMENT FILES
Generated: ${new Date().toISOString()}

Files included:
1. ${fileName}.html (PDF-ready format)
2. ${fileName}.rtf (Word-compatible format)

Instructions:
- Open the .html file and use your browser's "Print to PDF" feature
- Open the .rtf file in Microsoft Word or compatible word processor
`
					
					const zipBlob = new Blob([zipManifest], { type: 'text/plain' })
					downloadBlob(pdfBlob, `${fileName}.html`)
					downloadBlob(docxBlob, `${fileName}.rtf`) 
					downloadBlob(zipBlob, `${fileName}_instructions.txt`)
					pdfUrl = URL.createObjectURL(pdfBlob)
					break
				}
			}

			const result: LeaseGenerationResult = {
				success: true,
				downloadUrl: pdfUrl || undefined
			}

			return result
		},
		onSuccess: result => {
			toast.success('Lease agreement generated successfully!')
			options.onSuccess?.(result)
		},
		onError: error => {
			toast.error(error.message || 'Failed to generate lease agreement')
			options.onError?.(error as Error)
		}
	})

	// Calculate current usage status
	const usageCount = usageData?.usageCount || 0
	const paymentStatus = usageData?.paymentStatus || 'free_trial'
	const accessExpiresAt = usageData?.accessExpiresAt

	// Check if paid access has expired
	const isPaidAccessExpired =
		paymentStatus === 'paid' &&
		accessExpiresAt &&
		new Date(accessExpiresAt) < new Date()

	// Determine effective payment status
	const effectivePaymentStatus = isPaidAccessExpired
		? 'free_trial'
		: paymentStatus

	const usageRemaining =
		effectivePaymentStatus === 'free_trial'
			? Math.max(0, 1 - usageCount)
			: 999 // Unlimited for paid users within 24 hours

	const requiresPayment =
		effectivePaymentStatus === 'free_trial' && usageCount >= 1

	// Payment handling with Stripe integration
	const initiatePayment = async () => {
		try {
			if (!user?.id) {
				toast.error('Please sign in to purchase access')
				return
			}

			if (!supabaseClient) {
				throw new Error('Supabase client not available')
			}
			// Create Stripe checkout session for lease generator
			const { data, error } = await supabaseClient.functions.invoke(
				'create-subscription',
				{
					body: {
						priceId: import.meta.env.VITE_STRIPE_LEASE_GENERATOR_PRICE_ID || 'price_lease_generator_24h', // 24-hour access price
						successUrl: `${window.location.origin}/lease-generator?payment=success`,
						cancelUrl: `${window.location.origin}/lease-generator?payment=cancelled`,
						metadata: {
							product: 'lease_generator',
							duration: '24h'
						}
					}
				}
			)

			if (error) throw error

			// Redirect to Stripe checkout
			if (data?.url) {
				window.location.href = data.url
			} else {
				throw new Error('No checkout URL received')
			}

			logger.info('Lease generator payment initiated', undefined, {
				userId: user.id,
				priceId: import.meta.env.VITE_STRIPE_LEASE_GENERATOR_PRICE_ID || 'price_lease_generator_24h'
			})
		} catch (error) {
			logger.error(
				'Failed to initiate lease generator payment',
				error as Error
			)
			toast.error('Failed to start payment process. Please try again.')
		}
	}

	return {
		generateLease: generateLeaseMutation.mutate,
		isGenerating: generateLeaseMutation.isPending,
		usageRemaining,
		requiresPayment,
		paymentStatus: effectivePaymentStatus,
		initiatePayment,
		error: generateLeaseMutation.error,
		isSuccess: generateLeaseMutation.isSuccess,
		result: generateLeaseMutation.data,
		refetchUsage
	}
}
