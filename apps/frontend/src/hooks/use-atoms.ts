'use client'

import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import {
  // User atoms
  userAtom,
  isAuthenticatedAtom,
  authLoadingAtom,
  organizationAtom,
  isSessionActiveAtom,
  userPermissionsAtom,
  userRoleAtom,
  subscriptionStatusAtom,
  setUserAtom,
  updateUserAtom,
  clearAuthAtom,
  updateLastActivityAtom,
  
  // Theme atoms
  themeAtom,
  sidebarOpenAtom,
  isOnlineAtom,
  featureFlagsAtom,
  toggleSidebarAtom,
  toggleFeatureAtom,
  
  // Notification atoms
  notificationsAtom,
  addNotificationAtom,
  removeNotificationAtom,
  clearNotificationsAtom,
  unreadNotificationsAtom,
  
  // Modal atoms
  modalsAtom,
  openModalAtom,
  closeModalAtom,
  closeAllModalsAtom,
  isModalOpenAtom,
  
  // Property atoms
  propertiesAtom,
  selectedPropertyAtom,
  propertyFiltersAtom,
  filteredPropertiesAtom,
  vacantUnitsCountAtom,
  propertiesByCityAtom,
  setPropertiesAtom,
  addPropertyAtom,
  updatePropertyAtom,
  deletePropertyAtom,
  selectPropertyAtom,
  setPropertyFiltersAtom,
  clearPropertyFiltersAtom,
  
  // Tenant atoms
  tenantsAtom,
  selectedTenantAtom,
  tenantFiltersAtom,
  filteredTenantsAtom,
  activeTenentsAtom,
  tenantsByPropertyAtom,
  tenantsByStatusAtom,
  setTenantsAtom,
  addTenantAtom,
  updateTenantAtom,
  deleteTenantAtom,
  selectTenantAtom,
  setTenantFiltersAtom,
  clearTenantFiltersAtom,
  
  // Types
  ModalState,
} from '@/atoms'

// Authentication hooks
export function useAuth() {
  const user = useAtomValue(userAtom)
  const isAuthenticated = useAtomValue(isAuthenticatedAtom)
  const isLoading = useAtomValue(authLoadingAtom)
  const organization = useAtomValue(organizationAtom)
  const isSessionActive = useAtomValue(isSessionActiveAtom)
  const permissions = useAtomValue(userPermissionsAtom)
  const role = useAtomValue(userRoleAtom)
  const subscription = useAtomValue(subscriptionStatusAtom)
  
  const setUser = useSetAtom(setUserAtom)
  const updateUser = useSetAtom(updateUserAtom)
  const clearAuth = useSetAtom(clearAuthAtom)
  const updateActivity = useSetAtom(updateLastActivityAtom)
  
  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    organization,
    isSessionActive,
    permissions,
    role,
    subscription,
    
    // Actions
    setUser,
    updateUser,
    clearAuth,
    updateActivity,
  }
}

// User hooks (granular)
export const useUser = () => useAtomValue(userAtom)
export const useIsAuthenticated = () => useAtomValue(isAuthenticatedAtom)
export const useAuthLoading = () => useAtomValue(authLoadingAtom)
export const useOrganization = () => useAtomValue(organizationAtom)

// Theme hooks
export function useTheme() {
  const [theme, setTheme] = useAtom(themeAtom)
  const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom)
  const isOnline = useAtomValue(isOnlineAtom)
  const features = useAtomValue(featureFlagsAtom)
  
  const toggleSidebar = useSetAtom(toggleSidebarAtom)
  const toggleFeature = useSetAtom(toggleFeatureAtom)
  
  return {
    // State
    theme,
    sidebarOpen,
    isOnline,
    features,
    
    // Actions
    setTheme,
    setSidebarOpen,
    toggleSidebar,
    toggleFeature,
  }
}

// Notification hooks
export function useNotifications() {
  const notifications = useAtomValue(notificationsAtom)
  const unreadNotifications = useAtomValue(unreadNotificationsAtom)
  
  const addNotification = useSetAtom(addNotificationAtom)
  const removeNotification = useSetAtom(removeNotificationAtom)
  const clearNotifications = useSetAtom(clearNotificationsAtom)
  
  return {
    // State
    notifications,
    unreadNotifications,
    
    // Actions
    addNotification,
    removeNotification,
    clearNotifications,
  }
}

// Modal hooks
export function useModals() {
  const modals = useAtomValue(modalsAtom)
  
  const openModal = useSetAtom(openModalAtom)
  const closeModal = useSetAtom(closeModalAtom)
  const closeAllModals = useSetAtom(closeAllModalsAtom)
  
  return {
    // State
    modals,
    
    // Actions
    openModal,
    closeModal,
    closeAllModals,
  }
}

// Individual modal hook
export function useModal(modalName: keyof ModalState) {
  const isOpen = useAtomValue(isModalOpenAtom(modalName))
  const openModal = useSetAtom(openModalAtom)
  const closeModal = useSetAtom(closeModalAtom)
  
  return {
    isOpen,
    open: () => openModal(modalName),
    close: () => closeModal(modalName),
  }
}

// Property hooks
export function useProperties() {
  const properties = useAtomValue(propertiesAtom)
  const selectedProperty = useAtomValue(selectedPropertyAtom)
  const filters = useAtomValue(propertyFiltersAtom)
  const filteredProperties = useAtomValue(filteredPropertiesAtom)
  const vacantUnitsCount = useAtomValue(vacantUnitsCountAtom)
  const propertiesByCity = useAtomValue(propertiesByCityAtom)
  
  const setProperties = useSetAtom(setPropertiesAtom)
  const addProperty = useSetAtom(addPropertyAtom)
  const updateProperty = useSetAtom(updatePropertyAtom)
  const deleteProperty = useSetAtom(deletePropertyAtom)
  const selectProperty = useSetAtom(selectPropertyAtom)
  const setFilters = useSetAtom(setPropertyFiltersAtom)
  const clearFilters = useSetAtom(clearPropertyFiltersAtom)
  
  return {
    // State
    properties,
    selectedProperty,
    filters,
    filteredProperties,
    vacantUnitsCount,
    propertiesByCity,
    
    // Actions
    setProperties,
    addProperty,
    updateProperty,
    deleteProperty,
    selectProperty,
    setFilters,
    clearFilters,
  }
}

// Tenant hooks
export function useTenants() {
  const tenants = useAtomValue(tenantsAtom)
  const selectedTenant = useAtomValue(selectedTenantAtom)
  const filters = useAtomValue(tenantFiltersAtom)
  const filteredTenants = useAtomValue(filteredTenantsAtom)
  const activeTenants = useAtomValue(activeTenentsAtom)
  const tenantsByProperty = useAtomValue(tenantsByPropertyAtom)
  const tenantsByStatus = useAtomValue(tenantsByStatusAtom)
  
  const setTenants = useSetAtom(setTenantsAtom)
  const addTenant = useSetAtom(addTenantAtom)
  const updateTenant = useSetAtom(updateTenantAtom)
  const deleteTenant = useSetAtom(deleteTenantAtom)
  const selectTenant = useSetAtom(selectTenantAtom)
  const setFilters = useSetAtom(setTenantFiltersAtom)
  const clearFilters = useSetAtom(clearTenantFiltersAtom)
  
  return {
    // State
    tenants,
    selectedTenant,
    filters,
    filteredTenants,
    activeTenants,
    tenantsByProperty,
    tenantsByStatus,
    
    // Actions
    setTenants,
    addTenant,
    updateTenant,
    deleteTenant,
    selectTenant,
    setFilters,
    clearFilters,
  }
}

// Granular property hooks
export const useSelectedProperty = () => useAtomValue(selectedPropertyAtom)
export const usePropertyFilters = () => useAtomValue(propertyFiltersAtom)
export const useFilteredProperties = () => useAtomValue(filteredPropertiesAtom)

// Granular tenant hooks
export const useSelectedTenant = () => useAtomValue(selectedTenantAtom)
export const useTenantFilters = () => useAtomValue(tenantFiltersAtom)
export const useFilteredTenants = () => useAtomValue(filteredTenantsAtom)
export const useActiveTenants = () => useAtomValue(activeTenentsAtom)