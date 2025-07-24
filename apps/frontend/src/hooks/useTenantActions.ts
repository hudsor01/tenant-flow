import { useState, useEffect } from 'react'
import { useRouterState, useNavigate } from '@tanstack/react-router'

interface UseTenantActionsProps {
	tenant?: {
		email: string
		phone?: string | null
	}
}

/**
 * Custom hook for managing tenant actions and tab navigation
 * Handles contact actions, tab state, and URL parameter management
 */
export function useTenantActions({ tenant }: UseTenantActionsProps) {
	const navigate = useNavigate()
	const routerState = useRouterState()
	const [activeTab, setActiveTab] = useState('overview')

	// Check for tab parameter in URL - always call hooks before any returns
	useEffect(() => {
		if (!routerState?.location) return
		
		const searchParams = new URLSearchParams(routerState.location.search as unknown as string)
		const tabParam = searchParams.get('tab')
		if (
			tabParam &&
			['overview', 'leases', 'payments', 'maintenance'].includes(tabParam)
		) {
			setActiveTab(tabParam)
		}
	}, [routerState.location])

	// Safety check for router state
	if (!routerState?.location) {
		return {
			activeTab,
			setActiveTab,
			navigateToTenant: () => {
				// Empty function - navigation not available
			},
			navigateToDetail: () => {
				// Empty function - navigation not available
			},
		}
	}

	// Contact actions
	const handleSendEmail = () => {
		if (tenant?.email) {
			window.location.href = `mailto:${tenant.email}`
		}
	}

	const handleCall = () => {
		if (tenant?.phone) {
			window.location.href = `tel:${tenant.phone}`
		}
	}

	// Navigation actions
	const handleBackToTenants = () => {
		navigate({ to: '/tenants' })
	}

	return {
		activeTab,
		setActiveTab,
		handleSendEmail,
		handleCall,
		handleBackToTenants
	}
}
