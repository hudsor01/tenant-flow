import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ApiClientError } from './api-client'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// API utility functions
export function handleApiError(error: unknown): string {
  if (error instanceof ApiClientError) {
    // Handle specific error types
    if (error.isNetworkError) {
      return 'Network error - please check your connection'
    }
    
    if (error.isUnauthorized) {
      return 'You are not authorized to perform this action'
    }
    
    if (error.isForbidden) {
      return 'Access denied'
    }
    
    if (error.isNotFound) {
      return 'Resource not found'
    }
    
    if (error.isValidationError) {
      return error.message || 'Invalid data provided'
    }
    
    if (error.isServerError) {
      return 'Server error - please try again later'
    }
    
    return error.message
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  return 'An unexpected error occurred'
}

// Query key factories for TanStack Query
export const queryKeys = {
  // Properties
  properties: {
    all: ['properties'] as const,
    lists: () => [...queryKeys.properties.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.properties.lists(), filters] as const,
    details: () => [...queryKeys.properties.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.properties.details(), id] as const,
    stats: () => [...queryKeys.properties.all, 'stats'] as const,
  },
  
  // Tenants
  tenants: {
    all: ['tenants'] as const,
    lists: () => [...queryKeys.tenants.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.tenants.lists(), filters] as const,
    details: () => [...queryKeys.tenants.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tenants.details(), id] as const,
    stats: () => [...queryKeys.tenants.all, 'stats'] as const,
    dashboard: () => [...queryKeys.tenants.all, 'dashboard'] as const,
  },
  
  // Units
  units: {
    all: ['units'] as const,
    lists: () => [...queryKeys.units.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.units.lists(), filters] as const,
    details: () => [...queryKeys.units.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.units.details(), id] as const,
    stats: () => [...queryKeys.units.all, 'stats'] as const,
  },
  
  // Leases
  leases: {
    all: ['leases'] as const,
    lists: () => [...queryKeys.leases.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.leases.lists(), filters] as const,
    details: () => [...queryKeys.leases.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.leases.details(), id] as const,
    stats: () => [...queryKeys.leases.all, 'stats'] as const,
    expiring: (days?: number) => 
      [...queryKeys.leases.all, 'expiring', days] as const,
    byUnit: (unitId: string) => 
      [...queryKeys.leases.all, 'unit', unitId] as const,
  },
  
  // Payments
  payments: {
    all: ['payments'] as const,
    lists: () => [...queryKeys.payments.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.payments.lists(), filters] as const,
    details: () => [...queryKeys.payments.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.payments.details(), id] as const,
    stats: () => [...queryKeys.payments.all, 'stats'] as const,
  },
  
  // Maintenance
  maintenance: {
    all: ['maintenance'] as const,
    lists: () => [...queryKeys.maintenance.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.maintenance.lists(), filters] as const,
    details: () => [...queryKeys.maintenance.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.maintenance.details(), id] as const,
    stats: () => [...queryKeys.maintenance.all, 'stats'] as const,
  },
  
  // Notifications
  notifications: {
    all: ['notifications'] as const,
    lists: () => [...queryKeys.notifications.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.notifications.lists(), filters] as const,
    details: () => [...queryKeys.notifications.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.notifications.details(), id] as const,
    stats: () => [...queryKeys.notifications.all, 'stats'] as const,
  },
} as const

// Type-safe environment variable access
export function getEnvVar(key: string, defaultValue?: string): string {
  const value = import.meta.env[key]
  
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is not set`)
  }
  
  return value || defaultValue || ''
}

// File validation utilities
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type)
}

export function validateFileSize(file: File, maxSizeInMB: number): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024
  return file.size <= maxSizeInBytes
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Date utilities for API dates
export function formatApiDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function parseApiDate(dateString: string): Date {
  return new Date(dateString)
}

// Retry utility for API calls
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      
      if (attempt === maxRetries) {
        throw lastError
      }
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}

// Debounce utility for search inputs
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): T {
  let timeout: NodeJS.Timeout | null = null
  
  return ((...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }) as T
}
