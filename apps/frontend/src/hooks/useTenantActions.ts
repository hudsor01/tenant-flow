import { useState, useEffect } from 'react'
import { useRouter, useRouterState } from '@tanstack/react-router'

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
	const router = useRouter()
	const routerState = useRouterState()
	const [activeTab, setActiveTab] = useState('overview')

	// Safety check for router state
	if (!routerState?.location) {
		return {
			activeTab,
			setActiveTab,
			navigateToTenant: () => {},
			navigateToDetail: () => {},
		}
	}

	// Check for tab parameter in URL
	useEffect(() => {
		const searchParams = new URLSearchParams(routerState.location.search)
		const tabParam = searchParams.get('tab')
		if (
			tabParam &&
			['overview', 'leases', 'payments', 'maintenance'].includes(tabParam)
		) {
			setActiveTab(tabParam)
		}
	}, [routerState.location.search])

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
		router.navigate({ to: '/tenants' })
	}

	return {
		activeTab,
		setActiveTab,
		handleSendEmail,
		handleCall,
		handleBackToTenants
	}
}
