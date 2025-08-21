/**
 * Central State Management Export
 * Provides a unified API for all application state
 */

// Factory utilities
export * from './utils/atom-factory'

// Business entities
export * from './business/properties'
export * from './business/tenants'

// Core atoms
export * from './core/user'
export * from './core/effects'

// UI atoms
export * from './ui/notifications'
export * from './ui/modals'
export * from './ui/forms'
export * from './ui/theme'

// Form atoms - selective exports to avoid conflicts
export {
	currentStepAtom,
	stepValidationAtom,
	wizardProgressAtom,
	leaseFormDirtyAtom,
	pdfGeneratingAtom,
	generatedLeaseAtom
} from './forms/lease-generator-form'

// Tenant portal atoms
export * from './tenant-portal/scoped-atoms'

/**
 * AppState - Unified state management API
 * Provides a clean interface for accessing all application state
 */
export const AppState = {
	// Properties
	properties: {
		useAll: () =>
			import('./business/properties').then(m => m.propertiesAtom),
		useFiltered: () =>
			import('./business/properties').then(m => m.filteredPropertiesAtom),
		useSelected: () =>
			import('./business/properties').then(m => m.selectedPropertyAtom),
		useLoading: () =>
			import('./business/properties').then(m => m.propertiesLoadingAtom),
		useError: () =>
			import('./business/properties').then(m => m.propertiesErrorAtom),
		useFilters: () =>
			import('./business/properties').then(m => m.propertyFiltersAtom),
		useCityOptions: () =>
			import('./business/properties').then(m => m.cityOptionsAtom),
		useTypeOptions: () =>
			import('./business/properties').then(m => m.typeOptionsAtom),
		useVacantCount: () =>
			import('./business/properties').then(m => m.vacantUnitsCountAtom)
	},

	// Tenants
	tenants: {
		useAll: () => import('./business/tenants').then(m => m.tenantsAtom),
		useFiltered: () =>
			import('./business/tenants').then(m => m.filteredTenantsAtom),
		useActive: () =>
			import('./business/tenants').then(m => m.activeTenantsAtom),
		usePending: () =>
			import('./business/tenants').then(m => m.pendingTenantsAtom),
		useSelected: () =>
			import('./business/tenants').then(m => m.selectedTenantAtom),
		useLoading: () =>
			import('./business/tenants').then(m => m.tenantsLoadingAtom),
		useError: () =>
			import('./business/tenants').then(m => m.tenantsErrorAtom),
		useFilters: () =>
			import('./business/tenants').then(m => m.tenantFiltersAtom),
		useStatusCounts: () =>
			import('./business/tenants').then(m => m.tenantsByStatusAtom)
	},

	// User & Auth
	user: {
		useCurrent: () => import('./core/user').then(m => m.userAtom),
		useIsAuthenticated: () =>
			import('./core/user').then(m => m.isAuthenticatedAtom),
		useRole: () => import('./core/user').then(m => m.userRoleAtom),
		usePermissions: () =>
			import('./core/user').then(m => m.userPermissionsAtom),
		useOrganization: () =>
			import('./core/user').then(m => m.organizationAtom),
		useHasStripe: () =>
			import('./core/user').then(m => m.hasStripeAccountAtom),
		useAuthLoading: () =>
			import('./core/user').then(m => m.authLoadingAtom),
		useAuthError: () => import('./core/user').then(m => m.authErrorAtom)
	},

	// UI State
	ui: {
		notifications: {
			useAll: () =>
				import('./ui/notifications').then(m => m.notificationsAtom),
			add: () =>
				import('./ui/notifications').then(m => m.addNotificationAtom),
			remove: () =>
				import('./ui/notifications').then(
					m => m.removeNotificationAtom
				),
			clear: () =>
				import('./ui/notifications').then(m => m.clearNotificationsAtom)
		},
		modals: {
			useAll: () => import('./ui/modals').then(m => m.modalsAtom),
			open: () => import('./ui/modals').then(m => m.openModalAtom),
			close: () => import('./ui/modals').then(m => m.closeModalAtom),
			closeAll: () =>
				import('./ui/modals').then(m => m.closeAllModalsAtom)
		},
		theme: {
			useCurrent: () => import('./ui/theme').then(m => m.themeAtom),
			useSidebar: () => import('./ui/theme').then(m => m.sidebarOpenAtom),
			toggleSidebar: () =>
				import('./ui/theme').then(m => m.toggleSidebarAtom)
		}
	}
}

/**
 * Actions - Unified action API
 * Provides methods for modifying state
 */
export const Actions = {
	// Properties
	properties: {
		select: () =>
			import('./business/properties').then(m => m.selectPropertyAtom),
		setFilters: () =>
			import('./business/properties').then(m => m.setPropertyFiltersAtom),
		clearFilters: () =>
			import('./business/properties').then(
				m => m.clearPropertyFiltersAtom
			),
		refetch: () =>
			import('./business/properties').then(m => m.refetchPropertiesAtom),
		create: () =>
			import('./business/properties').then(
				m => m.createPropertyMutationAtom
			),
		update: () =>
			import('./business/properties').then(
				m => m.updatePropertyMutationAtom
			),
		delete: () =>
			import('./business/properties').then(
				m => m.deletePropertyMutationAtom
			)
	},

	// Tenants
	tenants: {
		select: () =>
			import('./business/tenants').then(m => m.selectTenantAtom),
		setFilters: () =>
			import('./business/tenants').then(m => m.setTenantFiltersAtom),
		clearFilters: () =>
			import('./business/tenants').then(m => m.clearTenantFiltersAtom),
		refetch: () =>
			import('./business/tenants').then(m => m.refetchTenantsAtom),
		create: () =>
			import('./business/tenants').then(m => m.createTenantMutationAtom),
		update: () =>
			import('./business/tenants').then(m => m.updateTenantMutationAtom),
		delete: () =>
			import('./business/tenants').then(m => m.deleteTenantMutationAtom)
	},

	// User & Auth
	user: {
		setUser: () => import('./core/user').then(m => m.setUserAtom),
		updateUser: () => import('./core/user').then(m => m.updateUserAtom),
		clearAuth: () => import('./core/user').then(m => m.clearAuthAtom),
		updateActivity: () =>
			import('./core/user').then(m => m.updateLastActivityAtom)
	},

	// UI Actions
	ui: {
		showNotification: () =>
			import('./ui/notifications').then(m => m.addNotificationAtom),
		hideNotification: () =>
			import('./ui/notifications').then(m => m.removeNotificationAtom),
		clearNotifications: () =>
			import('./ui/notifications').then(m => m.clearNotificationsAtom),
		openModal: () => import('./ui/modals').then(m => m.openModalAtom),
		closeModal: () => import('./ui/modals').then(m => m.closeModalAtom),
		closeAllModals: () =>
			import('./ui/modals').then(m => m.closeAllModalsAtom),
		toggleSidebar: () => import('./ui/theme').then(m => m.toggleSidebarAtom)
	}
}

/**
 * Selectors - Computed values and derived state
 * Provides efficient access to computed values
 */
export const Selectors = {
	properties: {
		byCity: () =>
			import('./business/properties').then(m => m.propertiesByCityAtom),
		vacantCount: () =>
			import('./business/properties').then(m => m.vacantUnitsCountAtom),
		totalCount: () =>
			import('./business/properties').then(
				m => m.totalPropertiesCountAtom
			),
		filteredCount: () =>
			import('./business/properties').then(
				m => m.filteredPropertiesCountAtom
			)
	},

	tenants: {
		active: () =>
			import('./business/tenants').then(m => m.activeTenantsAtom),
		pending: () =>
			import('./business/tenants').then(m => m.pendingTenantsAtom),
		byStatus: () =>
			import('./business/tenants').then(m => m.tenantsByStatusAtom),
		totalCount: () =>
			import('./business/tenants').then(m => m.totalTenantsCountAtom),
		filteredCount: () =>
			import('./business/tenants').then(m => m.filteredTenantsCountAtom)
	},

	user: {
		isAuthenticated: () =>
			import('./core/user').then(m => m.isAuthenticatedAtom),
		isSessionActive: () =>
			import('./core/user').then(m => m.isSessionActiveAtom),
		hasStripeAccount: () =>
			import('./core/user').then(m => m.hasStripeAccountAtom),
		organizationId: () =>
			import('./core/user').then(m => m.organizationAtom)
	}
}
