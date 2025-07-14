import { create } from 'zustand'
import { toast } from 'sonner'
import type { CustomerInvoice, InvoiceItem } from '@/types/invoice'
import type { InvoiceState, InvoiceStore } from '@/types/store'
import { logger } from '@/lib/logger'

const initialState: InvoiceState = {
	currentInvoice: null,
	invoices: [],
	isGenerating: false,
	isLoading: false,
	showEmailCapture: false,
	showPreview: false,
	userTier: 'FREE_TIER',
	monthlyUsage: 0,
	error: null
}

export const useInvoiceStore = create<InvoiceStore>((set, get) => ({
	...initialState,

	setCurrentInvoice: invoice => set({ currentInvoice: invoice, error: null }),

	updateCurrentInvoice: updates =>
		set(state => ({
			currentInvoice: state.currentInvoice
				? { ...state.currentInvoice, ...updates }
				: updates,
			error: null
		})),

	clearCurrentInvoice: () =>
		set({
			currentInvoice: null,
			showEmailCapture: false,
			showPreview: false,
			error: null
		}),

	addInvoiceItem: () =>
		set(state => {
			if (!state.currentInvoice) return state

			const newItem: Partial<InvoiceItem> = {
				id: Date.now().toString(),
				description: '',
				quantity: 1,
				unitPrice: 0,
				total: 0
			}

			const updatedItems = [
				...(state.currentInvoice.items || []),
				newItem as InvoiceItem
			]

			return {
				currentInvoice: {
					...state.currentInvoice,
					items: updatedItems
				}
			}
		}),

	updateInvoiceItem: (index, itemUpdates) =>
		set(state => {
			if (!state.currentInvoice?.items) return state

			const updatedItems = state.currentInvoice.items.map((item, i) =>
				i === index ? { ...item, ...itemUpdates } : item
			)

			return {
				currentInvoice: {
					...state.currentInvoice,
					items: updatedItems
				}
			}
		}),

	removeInvoiceItem: index =>
		set(state => {
			if (
				!state.currentInvoice?.items ||
				state.currentInvoice.items.length <= 1
			) {
				toast.error('Invoice must have at least one item')
				return state
			}

			const updatedItems = state.currentInvoice.items.filter(
				(_, i) => i !== index
			)

			return {
				currentInvoice: {
					...state.currentInvoice,
					items: updatedItems
				}
			}
		}),

	recalculateInvoice: () =>
		set(state => {
			if (!state.currentInvoice?.items) return state

			const subtotal = state.currentInvoice.items.reduce((sum, item) => {
				const itemTotal = (item.quantity || 0) * (item.unitPrice || 0)
				return sum + itemTotal
			}, 0)

			const taxRate = state.currentInvoice.taxRate || 0
			const taxAmount = subtotal * (taxRate / 100)
			const total = subtotal + taxAmount

			// Update item totals
			const updatedItems = state.currentInvoice.items.map(item => ({
				...item,
				total: (item.quantity || 0) * (item.unitPrice || 0)
			}))

			return {
				currentInvoice: {
					...state.currentInvoice,
					items: updatedItems,
					subtotal,
					taxAmount,
					total
				}
			}
		}),

	generateInvoice: async emailCapture => {
		const { currentInvoice, userTier, checkUsageLimit } = get()

		if (!currentInvoice) {
			throw new Error('No invoice to generate')
		}

		// Check usage limits for free tier
		if (userTier === 'FREE_TIER' && !checkUsageLimit()) {
			throw new Error(
				'Monthly invoice limit reached. Please upgrade to Pro.'
			)
		}

		set({ isGenerating: true, error: null })

		try {
			// Generate PDF locally using the PDF library
			const { generateInvoicePDF } = await import('@/lib/invoice-pdf')
			const pdfBlob = generateInvoicePDF(
				currentInvoice as CustomerInvoice
			)

			// Create download URL
			const downloadUrl = URL.createObjectURL(pdfBlob)

			// Create and trigger download
			const link = document.createElement('a')
			link.href = downloadUrl
			link.download = `invoice-${currentInvoice.invoiceNumber || 'INV'}.pdf`
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)

			// Cleanup URL after download
			setTimeout(() => URL.revokeObjectURL(downloadUrl), 100)

			// Update usage tracking
			set(state => ({ monthlyUsage: state.monthlyUsage + 1 }))

			// Log analytics (only locally)
			logger.track('invoice_generated', {
				invoiceId: currentInvoice.invoiceNumber,
				userTier,
				hasEmailCapture: !!emailCapture,
				total: currentInvoice.total
			})

			toast.success('Invoice generated successfully!', {
				description: 'PDF download started.'
			})

			return downloadUrl
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: 'Failed to generate invoice'
			set({ error: errorMessage })
			toast.error(errorMessage)
			throw error
		} finally {
			set({ isGenerating: false })
		}
	},

	saveInvoice: async invoice => {
		set({ isLoading: true, error: null })

		try {
			// Enhanced fetch with timeout and better error handling
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

			const response = await fetch('/api/customer-invoices', {
				method: 'POST',
				headers: { 
					'Content-Type': 'application/json',
					'User-Agent': 'TenantFlow-Frontend/1.0'
				},
				body: JSON.stringify(invoice),
				signal: controller.signal
			})

			clearTimeout(timeoutId)

			if (!response.ok) {
				const errorText = await response.text().catch(() => 'Unknown error')
				throw new Error(`Failed to save invoice: ${response.status} ${errorText}`)
			}

			const savedInvoice = await response.json().catch(() => ({ error: 'Invalid response' }))

			set(state => ({
				invoices: [savedInvoice, ...state.invoices]
			}))

			toast.success('Invoice saved successfully')
		} catch (error) {
			if (error.name === 'AbortError') {
				const errorMessage = 'Request timeout - please try again'
				set({ error: errorMessage })
				toast.error(errorMessage)
				throw new Error(errorMessage)
			}
			
			const errorMessage =
				error instanceof Error
					? error.message
					: 'Failed to save invoice'
			set({ error: errorMessage })
			toast.error(errorMessage)
			throw error
		} finally {
			set({ isLoading: false })
		}
	},

	loadInvoices: async () => {
		set({ isLoading: true, error: null })

		try {
			// Enhanced fetch with timeout and better error handling
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

			const response = await fetch('/api/customer-invoices', {
				headers: {
					'User-Agent': 'TenantFlow-Frontend/1.0'
				},
				signal: controller.signal
			})

			clearTimeout(timeoutId)

			if (!response.ok) {
				const errorText = await response.text().catch(() => 'Unknown error')
				throw new Error(`Failed to load invoices: ${response.status} ${errorText}`)
			}

			const invoices = await response.json().catch(() => [])
			set({ invoices })
		} catch (error) {
			if (error.name === 'AbortError') {
				const errorMessage = 'Request timeout - please try again'
				set({ error: errorMessage })
				console.error('Load invoices timeout:', error)
				return
			}
			
			const errorMessage =
				error instanceof Error
					? error.message
					: 'Failed to load invoices'
			set({ error: errorMessage })
			console.error('Failed to load invoices:', error)
		} finally {
			set({ isLoading: false })
		}
	},

	setGenerating: isGenerating => set({ isGenerating }),
	setLoading: isLoading => set({ isLoading }),
	setShowEmailCapture: show => set({ showEmailCapture: show }),
	setShowPreview: show => set({ showPreview: show }),
	setError: error => set({ error }),

	checkUsageLimit: () => {
		const { userTier, monthlyUsage } = get()

		if (userTier === 'PRO_TIER') return true

		const freeLimit = 5 // Free tier limit
		return monthlyUsage < freeLimit
	},

	upgradeToPro: async () => {
		try {
			// Redirect to pricing page for now (no backend required)
			toast.info('Redirecting to pricing page...')
			window.open('/pricing', '_blank')
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: 'Failed to open pricing page'
			toast.error(errorMessage)
			throw error
		}
	},

	reset: () => set(initialState)
}))

// Selector hooks for performance
export const useCurrentInvoice = () =>
	useInvoiceStore(state => state.currentInvoice)
export const useInvoiceLoading = () =>
	useInvoiceStore(state => state.isLoading || state.isGenerating)
export const useInvoiceError = () => useInvoiceStore(state => state.error)
export const useInvoiceUsage = () =>
	useInvoiceStore(state => ({
		tier: state.userTier,
		usage: state.monthlyUsage
	}))
