/**
 * Shared priority/severity level constants
 * Used across notifications, security logging, and maintenance systems
 */

export const PRIORITY_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
  EMERGENCY: 'EMERGENCY'
} as const

export type PriorityLevel = typeof PRIORITY_LEVELS[keyof typeof PRIORITY_LEVELS]

// Type-safe mapping for different use cases
export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  EMERGENCY: 'EMERGENCY',
  CRITICAL: 'Critical',
  HIGH: 'High Priority',
  MEDIUM: 'Medium Priority',
  LOW: 'Low Priority'
}

export const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  EMERGENCY: 'bg-red-100 text-red-800',
  CRITICAL: 'bg-red-100 text-red-800',
  HIGH: 'bg-orange-100 text-orange-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-green-100 text-green-800'
}

// Legacy aliases for backward compatibility
export const SecurityEventSeverity = PRIORITY_LEVELS
export const Priority = PRIORITY_LEVELS