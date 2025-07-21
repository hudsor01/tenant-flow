/**
 * Authentication utilities
 * Helper functions for user role display and management
 */

import type { UserRole } from '../types/auth'

export const getUserRoleLabel = (role: UserRole): string => {
  const labels: Record<UserRole, string> = {
    OWNER: 'Property Owner',
    MANAGER: 'Property Manager',
    TENANT: 'Tenant',
    ADMIN: 'Administrator'
  }
  return labels[role] || role
}

export const getUserRoleColor = (role: UserRole): string => {
  const colors: Record<UserRole, string> = {
    OWNER: 'bg-purple-100 text-purple-800',
    MANAGER: 'bg-blue-100 text-blue-800',
    TENANT: 'bg-green-100 text-green-800',
    ADMIN: 'bg-red-100 text-red-800'
  }
  return colors[role] || 'bg-gray-100 text-gray-800'
}