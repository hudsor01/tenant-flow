import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { LeaseGenerator, downloadBlob } from '@/lib/lease-generator'
import { useAuth } from '@/hooks/useAuth'
import { trpc } from '@/lib/trpcClient'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'
import type {
	LeaseGeneratorForm,
	LeaseGeneratorUsage,
	LeaseOutputFormat,
	LeaseGenerationResult
} from '@/types/lease-generator'

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

	// Check current usage status - simplified for backend migration
	const { data: usageData, refetch: refetchUsage } = useQuery({
		queryKey: ['lease-generator-usage', user?.id],
		queryFn: async () => {
			// Usage tracking placeholder - in production would track in analytics_events table
			// For now, return localStorage data or null
			const clientInfo = getClientInfo()
			const storageKey = `lease_usage_${btoa(clientInfo.userAgent).slice(0, 20)}`
			const storedUsage = localStorage.getItem(storageKey)

			if (storedUsage) {
				return JSON.parse(storedUsage)
			}

			return null
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
			refetchUsage()
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
			let docxUrl: string | undefined
			let zipUrl: string | undefined

			const fileName = `lease_${formData.propertyAddress.replace(/\s+/g, '_').toLowerCase()}`

			switch (format) {
				case 'pdf': {
					// Use lightweight PDF generation (browser print-to-PDF)
					const pdfBlob = await generator.generatePDF(true)
					// Note: Lightweight mode downloads HTML with print instructions
					// Users can then use browser's "Print to PDF" feature
					if (pdfBlob.size > 0) {
						downloadBlob(pdfBlob, `${fileName}.pdf`)
						pdfUrl = URL.createObjectURL(pdfBlob)
					}
					break
				}
				case 'docx': {
					const docxBlob = await generator.generateDOCX()
					downloadBlob(docxBlob, `${fileName}.docx`)
					docxUrl = URL.createObjectURL(docxBlob)
					break
				}
				case 'both': {
					const zipBlob = await generator.generateZIP()
					downloadBlob(zipBlob, `${fileName}.zip`)
					zipUrl = URL.createObjectURL(zipBlob)
					break
				}
			}

			const result: LeaseGenerationResult = {
				success: true,
				pdfUrl,
				docxUrl,
				zipUrl,
				usageRemaining:
					effectiveStatus === 'free_trial'
						? Math.max(0, 1 - (currentUsageCount + 1))
						: 999,
				requiresPayment:
					effectiveStatus === 'free_trial' && currentUsageCount >= 0
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

			// Create Stripe checkout session for lease generator
			const { data, error } = await supabase.functions.invoke(
				'create-subscription',
				{
					body: {
						priceId: 'price_lease_generator_24h', // 24-hour access price
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
				userId: user.token,
				priceId: 'price_lease_generator_24h'
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
